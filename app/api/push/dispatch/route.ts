import { NextResponse } from 'next/server'
import { dispatchDueQuestNotifications } from '@/lib/push-dispatcher'
import { scheduleUpcomingQuestWorkflows } from '@/lib/push-scheduler'

function isAuthorized(request: Request): boolean {
  const secret = process.env.PUSH_DISPATCH_SECRET || process.env.CRON_SECRET
  if (!secret) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  try {
    const url = new URL(request.url)
    if (url.searchParams.get('secret') === secret) return true
  } catch {}

  return false
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const [summary, scheduleSummary] = await Promise.all([
      dispatchDueQuestNotifications(),
      scheduleUpcomingQuestWorkflows({ lookaheadMinutes: 60 }),
    ])
    return NextResponse.json({ ok: true, ...summary, ...scheduleSummary })
  } catch (err: any) {
    console.error('GET /api/push/dispatch error:', err)
    return NextResponse.json({ error: err?.message || 'Dispatch failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
