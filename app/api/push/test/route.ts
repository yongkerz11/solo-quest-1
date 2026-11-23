import { NextResponse } from 'next/server'
import { sendWebPush } from '@/lib/push-dispatcher'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { subscription, delaySeconds = 0 } = body || {}

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const clampedDelay = Math.min(10, Math.max(0, Number(delaySeconds) || 0))
    if (clampedDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, clampedDelay * 1000))
    }

    const result = await sendWebPush(subscription, {
      title: '[ ! ] SYSTEM NOTIFICATION TEST',
      body: 'Notifikasi latar belakang aktif! Quest yang masuk jadwal akan muncul meski app tertutup.',
      url: '/',
      tag: `solo-quest-test-${Date.now()}`,
    })

    if (result !== 'sent') {
      return NextResponse.json(
        { ok: false, result, error: 'Gagal mengirim push notification ke perangkat ini.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, result })
  } catch (err: any) {
    console.error('POST /api/push/test error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
