import { handleSchedule } from '@vercel/schedules'
import { dispatchDueQuestNotifications } from '@/lib/push-dispatcher'
import { scheduleUpcomingQuestWorkflows } from '@/lib/push-scheduler'

export const POST = handleSchedule(async (metadata) => {
  const dispatchSummary = await dispatchDueQuestNotifications()
  const scheduleSummary = await scheduleUpcomingQuestWorkflows({ lookaheadMinutes: 60 })
  console.log(
    `[push-cron] ${metadata.name} exec=${metadata.executionId} at=${metadata.scheduledAt.toISOString()}`,
    { ...dispatchSummary, ...scheduleSummary }
  )
})
