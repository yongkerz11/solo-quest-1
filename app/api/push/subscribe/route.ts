import { NextResponse } from 'next/server'
import { deletePushSubscription, upsertPushSubscription } from '@/lib/push-dispatcher'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, username, timezone, subscription } = body || {}

    if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid push subscription payload' }, { status: 400 })
    }

    const rowId = await upsertPushSubscription({
      userId,
      username,
      timezone,
      subscription,
      userAgent: request.headers.get('user-agent') || '',
    })

    return NextResponse.json({ ok: true, id: rowId })
  } catch (err: any) {
    console.error('POST /api/push/subscribe error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const endpoint = body?.endpoint
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }
    await deletePushSubscription(endpoint)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('DELETE /api/push/subscribe error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
