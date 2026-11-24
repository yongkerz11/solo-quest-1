import { start } from 'workflow/api'
import { scheduledQuestPushWorkflow } from '@/workflows/quest-push'
import {
  PUSH_SENT_CATEGORY,
  PUSH_SENT_ID_PREFIX,
  PUSH_SUB_CATEGORY,
  PUSH_SUB_ID_PREFIX,
  PUSH_WF_CATEGORY,
  PUSH_WF_ID_PREFIX,
  claimAtomicPushLock,
  computeUtcMsForLocalDateTime,
  getLocalClockInTimeZone,
  makePushLockId,
  parseHHMM,
  releaseAtomicPushLock,
  supabaseRest,
} from './push-dispatcher'

interface QuestScheduleRow {
  id: string
  user_id: string
  username?: string
  title: string
  category: string
  schedule?: string[]
  completed_dates?: string[]
  workout_exercises?: any[]
}

/**
 * Schedules exact-time Vercel Workflow wakeups for upcoming timed quests
 * within `lookaheadMinutes` (default 24 hours on user save/subscribe, 60m on cron).
 * Deduplicates globally per (isoDate, targetTime, timeZone) via an atomic DB lock so
 * multiple subscriptions or concurrent cron/save calls never spawn duplicate workflows.
 */
export async function scheduleUpcomingQuestWorkflows(options?: {
  userId?: string
  username?: string
  lookaheadMinutes?: number
}): Promise<{ workflowsStarted: number; checkedSubscriptions: number }> {
  const lookaheadMinutes = options?.lookaheadMinutes ?? 24 * 60
  const res = await supabaseRest(
    `user_quests?category=not.in.(${PUSH_SENT_CATEGORY},${PUSH_WF_CATEGORY})&select=id,user_id,username,title,category,schedule,completed_dates,workout_exercises`
  )
  if (!res.ok) {
    throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`)
  }

  const rows = (await res.json()) as QuestScheduleRow[]
  const subRows: QuestScheduleRow[] = []
  const questRows: QuestScheduleRow[] = []

  for (const r of rows) {
    if (
      r.category === PUSH_SENT_CATEGORY ||
      r.category === PUSH_WF_CATEGORY ||
      r.id.startsWith(PUSH_SENT_ID_PREFIX) ||
      r.id.startsWith(PUSH_WF_ID_PREFIX)
    ) {
      continue
    }
    if (r.category === PUSH_SUB_CATEGORY || r.id.startsWith(PUSH_SUB_ID_PREFIX)) {
      subRows.push(r)
    } else if (!String(r.category || '').startsWith('__system_')) {
      questRows.push(r)
    }
  }

  const targetSubs = subRows.filter((s) => {
    if (!options?.userId && !options?.username) return true
    if (options.userId && s.user_id === options.userId) return true
    if (options.username && (s.username === options.username || s.user_id === options.username)) return true
    return false
  })

  const now = new Date()
  const nowMs = now.getTime()
  const maxWakeMs = nowMs + lookaheadMinutes * 60_000
  let workflowsStarted = 0

  // Deduplicate wakeups globally across all subscriptions by (isoDate, targetTime, timeZone)
  const uniqueWakeups = new Map<string, { wakeAtMs: number; label: string }>()

  for (const subRow of targetSubs) {
    const meta = Array.isArray(subRow.workout_exercises) ? subRow.workout_exercises[0] : null
    if (!meta?.subscription?.endpoint) continue

    const tzTag = (Array.isArray(subRow.schedule) ? subRow.schedule : []).find(
      (s) => typeof s === 'string' && s.startsWith('tz:')
    )
    const timeZone = tzTag ? tzTag.replace('tz:', '') : meta.timezone || 'Asia/Jakarta'

    const userQuests = questRows.filter(
      (q) =>
        q.user_id === subRow.user_id ||
        (subRow.username && q.user_id === subRow.username) ||
        (!q.user_id && subRow.username === 'yongzz')
    )

    // Check today and tomorrow in user's timezone
    const candidateDays = [
      getLocalClockInTimeZone(timeZone, now),
      getLocalClockInTimeZone(timeZone, new Date(nowMs + 24 * 60 * 60_000)),
    ]

    for (const dayInfo of candidateDays) {
      for (const q of userQuests) {
        const rawSchedule = Array.isArray(q.schedule) ? q.schedule : []
        const timeTag = rawSchedule.find((s) => typeof s === 'string' && s.startsWith('time:'))
        const targetTime = timeTag ? timeTag.replace('time:', '') : undefined
        if (!targetTime || parseHHMM(targetTime) === null) continue

        const daySchedule = rawSchedule.filter(
          (s) =>
            typeof s === 'string' &&
            !s.startsWith('time:') &&
            !s.startsWith('skip:') &&
            !s.startsWith('unskip:')
        )
        const isScheduledDay =
          daySchedule.length === 0 ||
          daySchedule.includes('Everyday') ||
          daySchedule.includes(dayInfo.dayCode)
        if (!isScheduledDay) continue

        const completedDates = Array.isArray(q.completed_dates) ? q.completed_dates : []
        if (completedDates.includes(dayInfo.isoDate)) continue
        if (rawSchedule.includes(`skip:${dayInfo.isoDate}`) || rawSchedule.includes(dayInfo.isoDate)) {
          continue
        }

        const wakeAtMs = computeUtcMsForLocalDateTime(dayInfo.isoDate, targetTime, timeZone)
        if (!wakeAtMs || wakeAtMs <= nowMs - 30_000 || wakeAtMs > maxWakeMs) continue

        const globalKey = `${dayInfo.isoDate}|${targetTime}|${timeZone}`
        if (!uniqueWakeups.has(globalKey)) {
          uniqueWakeups.set(globalKey, {
            wakeAtMs: Math.max(wakeAtMs + 2000, nowMs + 1000),
            label: `${dayInfo.isoDate} ${targetTime} (${timeZone})`,
          })
        }
      }
    }
  }

  for (const [globalKey, wakeup] of uniqueWakeups.entries()) {
    const wfLockId = makePushLockId(PUSH_WF_ID_PREFIX, globalKey)
    const claimed = await claimAtomicPushLock(wfLockId, PUSH_WF_CATEGORY, `wf:${globalKey}`)
    if (!claimed) continue

    try {
      await start(scheduledQuestPushWorkflow, [
        { wakeAtMs: wakeup.wakeAtMs, label: wakeup.label },
      ])
      workflowsStarted++
    } catch (err) {
      console.error('Failed to start scheduledQuestPushWorkflow:', err)
      await releaseAtomicPushLock(wfLockId)
    }
  }

  return {
    workflowsStarted,
    checkedSubscriptions: targetSubs.length,
  }
}
