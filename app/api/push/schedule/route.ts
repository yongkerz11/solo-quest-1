import { NextResponse } from 'next/server'
import { dispatchDueQuestNotifications } from '@/lib/push-dispatcher'
import { scheduleUpcomingQuestWorkflows } from '@/lib/push-scheduler'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { userId, username } = body || {}

    const [dispatchSummary, scheduleSummary] = await Promise.all([
      dispatchDueQuestNotifications(),
      scheduleUpcomingQuestWorkflows({
        userId: typeof userId === 'string' ? userId : undefined,
        username: typeof username === 'string' ? username : undefined,
        lookaheadMinutes: 24 * 60,
      }),
    ])

    return NextResponse.json({
      ok: true,
      ...dispatchSummary,
      ...scheduleSummary,
    })
  } catch (err: any) {
    console.error('POST /api/push/schedule error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
