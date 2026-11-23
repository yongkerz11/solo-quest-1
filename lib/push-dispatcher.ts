import crypto from 'node:crypto'
import * as webpush from 'web-push'
import { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL } from './supabase'

export const PUSH_SUB_CATEGORY = '__system_push_sub__'
export const PUSH_SUB_ID_PREFIX = '__push_sub__:'

const DAY_CODES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export interface StoredPushSubscription {
  rowId: string
  userId: string
  username: string
  timezone: string
  subscription: {
    endpoint: string
    expirationTime?: number | null
    keys: {
      p256dh: string
      auth: string
    }
  }
  sentKeys: string[]
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  return { url, key }
}

function configureWebPush() {
  const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim()
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim()
  const subject = (process.env.VAPID_SUBJECT || 'mailto:notifications@solo-quest-1.vercel.app').trim()
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) are not configured.')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export function getSubscriptionRowId(endpoint: string): string {
  const hash = crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 24)
  return `${PUSH_SUB_ID_PREFIX}${hash}`
}

export async function supabaseRest(path: string, init?: RequestInit) {
  const { url, key } = getSupabaseConfig()
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  return res
}

export async function upsertPushSubscription(input: {
  userId: string
  username?: string
  timezone?: string
  subscription: StoredPushSubscription['subscription']
  userAgent?: string
}): Promise<string> {
  const rowId = getSubscriptionRowId(input.subscription.endpoint)
  const tz = input.timezone || 'Asia/Jakarta'

  // Preserve existing sentKeys if re-subscribing the same device
  let existingSentKeys: string[] = []
  try {
    const existingRes = await supabaseRest(
      `user_quests?id=eq.${encodeURIComponent(rowId)}&select=completed_dates`
    )
    if (existingRes.ok) {
      const rows = (await existingRes.json()) as Array<{ completed_dates?: string[] }>
      if (Array.isArray(rows) && rows[0] && Array.isArray(rows[0].completed_dates)) {
        existingSentKeys = rows[0].completed_dates
      }
    }
  } catch {}

  const payload = {
    id: rowId,
    user_id: input.userId,
    username: input.username || '',
    title: 'Web Push Subscription',
    category: PUSH_SUB_CATEGORY,
    xp: 0,
    icon: '🔔',
    done: true,
    schedule: [`tz:${tz}`],
    completed_dates: existingSentKeys.slice(-60),
    workout_exercises: [
      {
        subscription: input.subscription,
        timezone: tz,
        userAgent: input.userAgent || '',
        updatedAt: new Date().toISOString(),
      },
    ],
    updated_at: new Date().toISOString(),
  }

  const res = await supabaseRest('user_quests?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Failed to store push subscription: ${res.status} ${txt}`)
  }

  return rowId
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const rowId = getSubscriptionRowId(endpoint)
  await supabaseRest(`user_quests?id=eq.${encodeURIComponent(rowId)}`, {
    method: 'DELETE',
  })
}

export async function sendWebPush(
  subscription: StoredPushSubscription['subscription'],
  payload: {
    title: string
    body: string
    url?: string
    tag?: string
    questId?: string
  }
): Promise<'sent' | 'expired' | 'failed'> {
  configureWebPush()
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 60 * 60, // 1 hour
      urgency: 'high',
    })
    return 'sent'
  } catch (err: any) {
    const status = err?.statusCode
    if (status === 404 || status === 410) {
      await deletePushSubscription(subscription.endpoint).catch(() => {})
      return 'expired'
    }
    console.error('sendWebPush error:', status, err?.body || err?.message)
    return 'failed'
  }
}

export function getLocalClockInTimeZone(timeZone: string, now = new Date()): {
  isoDate: string
  dayCode: (typeof DAY_CODES)[number]
  minutesNow: number
} {
  let safeTz = timeZone || 'Asia/Jakarta'
  try {
    Intl.DateTimeFormat('en-US', { timeZone: safeTz })
  } catch {
    safeTz = 'Asia/Jakarta'
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const get = (type: string) => parts.find((p) => p.type === type)?.value || ''
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const weekday = get('weekday').slice(0, 3) as (typeof DAY_CODES)[number]
  let hour = Number(get('hour'))
  if (hour === 24) hour = 0
  const minute = Number(get('minute'))

  return {
    isoDate: `${year}-${month}-${day}`,
    dayCode: DAY_CODES.includes(weekday) ? weekday : DAY_CODES[now.getDay()],
    minutesNow: hour * 60 + minute,
  }
}

export function computeUtcMsForLocalDateTime(isoDate: string, hhmm: string, timeZone: string): number | null {
  const [y, m, d] = isoDate.split('-').map(Number)
  const [hh, mm] = hhmm.split(':').map(Number)
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null
  let safeTz = timeZone || 'Asia/Jakarta'
  try {
    Intl.DateTimeFormat('en-US', { timeZone: safeTz })
  } catch {
    safeTz = 'Asia/Jakarta'
  }
  const targetNaive = Date.UTC(y, m - 1, d, hh, mm, 0, 0)
  let guess = targetNaive
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(guess))
    const get = (t: string) => parts.find((p) => p.type === t)?.value || ''
    let actualHour = Number(get('hour'))
    if (actualHour === 24) actualHour = 0
    const actualNaive = Date.UTC(
      Number(get('year')),
      Number(get('month')) - 1,
      Number(get('day')),
      actualHour,
      Number(get('minute')),
      0,
      0
    )
    const diff = targetNaive - actualNaive
    if (diff === 0) break
    guess += diff
  }
  return guess
}

export function parseHHMM(targetTime?: string): number | null {
  if (!targetTime) return null
  const [h, m] = targetTime.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

export async function dispatchDueQuestNotifications(): Promise<{
  checkedSubscriptions: number
  checkedQuests: number
  notificationsSent: number
  expiredRemoved: number
}> {
  configureWebPush()

  const res = await supabaseRest(
    'user_quests?select=id,user_id,username,title,category,xp,schedule,completed_dates,workout_exercises'
  )
  if (!res.ok) {
    throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`)
  }

  const rows = (await res.json()) as Array<{
    id: string
    user_id: string
    username?: string
    title: string
    category: string
    xp?: number
    schedule?: string[]
    completed_dates?: string[]
    workout_exercises?: any[]
  }>

  const subscriptions: StoredPushSubscription[] = []
  const quests: typeof rows = []

  for (const row of rows) {
    if (row.category === PUSH_SUB_CATEGORY || row.id.startsWith(PUSH_SUB_ID_PREFIX)) {
      const meta = Array.isArray(row.workout_exercises) ? row.workout_exercises[0] : null
      if (meta?.subscription?.endpoint && meta?.subscription?.keys?.p256dh) {
        const tzTag = (Array.isArray(row.schedule) ? row.schedule : []).find((s) =>
          typeof s === 'string' && s.startsWith('tz:')
        )
        subscriptions.push({
          rowId: row.id,
          userId: row.user_id,
          username: row.username || '',
          timezone: tzTag ? tzTag.replace('tz:', '') : meta.timezone || 'Asia/Jakarta',
          subscription: meta.subscription,
          sentKeys: Array.isArray(row.completed_dates) ? row.completed_dates : [],
        })
      }
    } else {
      quests.push(row)
    }
  }

  let notificationsSent = 0
  let expiredRemoved = 0
  const now = new Date()

  for (const sub of subscriptions) {
    const { isoDate, dayCode, minutesNow } = getLocalClockInTimeZone(sub.timezone, now)
    const sentSet = new Set(
      sub.sentKeys.filter((k) => typeof k === 'string' && k.startsWith(`sent:${isoDate}:`))
    )
    let sentSetChanged = false

    const userQuests = quests.filter(
      (q) =>
        q.user_id === sub.userId ||
        (sub.username && q.user_id === sub.username) ||
        (!q.user_id && sub.username === 'yongzz')
    )

    let subExpired = false
    for (const q of userQuests) {
      if (subExpired) break
      const rawSchedule = Array.isArray(q.schedule) ? q.schedule : []
      const timeTag = rawSchedule.find((s) => typeof s === 'string' && s.startsWith('time:'))
      const targetTime = timeTag ? timeTag.replace('time:', '') : undefined
      const targetMinutes = parseHHMM(targetTime)
      if (targetMinutes === null || !targetTime) continue

      // Must have arrived today
      if (minutesNow < targetMinutes) continue

      // Check weekday schedule
      const daySchedule = rawSchedule.filter(
        (s) =>
          typeof s === 'string' &&
          !s.startsWith('time:') &&
          !s.startsWith('skip:') &&
          !s.startsWith('unskip:')
      )
      const isToday =
        daySchedule.length === 0 ||
        daySchedule.includes('Everyday') ||
        daySchedule.includes(dayCode)
      if (!isToday) continue

      // Skip if already done or skipped today
      const completedDates = Array.isArray(q.completed_dates) ? q.completed_dates : []
      if (completedDates.includes(isoDate)) continue
      const isSkippedToday = rawSchedule.includes(`skip:${isoDate}`) || rawSchedule.includes(isoDate)
      if (isSkippedToday) continue

      const sentKey = `sent:${isoDate}:${q.id}:${targetTime}`
      if (sentSet.has(sentKey)) continue

      const result = await sendWebPush(sub.subscription, {
        title: `[ ! ] QUEST TERBUKA: ${q.title}`,
        body: `${q.category} (+${q.xp ?? 20} XP) • Jadwal ${targetTime} sudah tiba!`,
        url: '/',
        tag: `quest-${isoDate}-${q.id}`,
        questId: q.id,
      })

      if (result === 'sent') {
        notificationsSent++
        sentSet.add(sentKey)
        sentSetChanged = true
      } else if (result === 'expired') {
        expiredRemoved++
        subExpired = true
      }
    }

    if (!subExpired && sentSetChanged) {
      const preservedWfKeys = sub.sentKeys.filter(
        (k) => typeof k === 'string' && k.startsWith('wf:')
      )
      const nextCompletedDates = Array.from(
        new Set([...preservedWfKeys, ...Array.from(sentSet)])
      ).slice(-80)

      await supabaseRest(`user_quests?id=eq.${encodeURIComponent(sub.rowId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          completed_dates: nextCompletedDates,
          updated_at: new Date().toISOString(),
        }),
      }).catch(() => {})
    }
  }

  return {
    checkedSubscriptions: subscriptions.length,
    checkedQuests: quests.length,
    notificationsSent,
    expiredRemoved,
  }
}
