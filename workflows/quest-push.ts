import { sleep } from 'workflow'
import { dispatchDueQuestNotifications } from '@/lib/push-dispatcher'

async function runQuestPushDispatchStep(label?: string) {
  'use step'
  console.log('[workflow:quest-push] dispatching due quest notifications', label || '')
  const summary = await dispatchDueQuestNotifications()
  console.log('[workflow:quest-push] dispatch result', summary)
  return summary
}

export async function scheduledQuestPushWorkflow(input: {
  wakeAtMs: number
  label?: string
}) {
  'use workflow'
  const delayMs = input.wakeAtMs - Date.now()
  console.log('[workflow:quest-push] started', input.label || '', 'wakeAtMs=', input.wakeAtMs, 'delayMs=', delayMs)

  if (delayMs > 500) {
    await sleep(new Date(input.wakeAtMs))
  }

  const summary = await runQuestPushDispatchStep(input.label)
  return summary
}
