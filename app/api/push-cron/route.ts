import { handleSchedule } from '@vercel/schedules'
import { dispatchDueQuestNotifications } from '@/lib/push-dispatcher'

export const POST = handleSchedule(async (metadata) => {
  const summary = await dispatchDueQuestNotifications()
  console.log(
    `[push-cron] ${metadata.name} exec=${metadata.executionId} at=${metadata.scheduledAt.toISOString()}`,
    summary
  )
})
