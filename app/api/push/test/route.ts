import { after, NextResponse } from 'next/server'
import { sendWebPush } from '@/lib/push-dispatcher'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { subscription, delaySeconds = 0 } = body || {}

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const clampedDelay = Math.min(15, Math.max(0, Number(delaySeconds) || 0))
    const payload = {
      title: '[ ! ] SYSTEM NOTIFICATION TEST',
      body: 'Notifikasi latar belakang aktif! Quest terjadwal akan muncul meski app & semua tab ditutup.',
      url: '/',
      tag: `solo-quest-test-${Date.now()}`,
    }

    if (clampedDelay > 0) {
      // Respond immediately so mobile OS / PWA closing right after tap does not abort the request.
      after(async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, clampedDelay * 1000))
          const bgResult = await sendWebPush(subscription, payload)
          if (bgResult !== 'sent') {
            console.error('Delayed test webpush failed:', bgResult, subscription.endpoint)
          }
        } catch (err) {
          console.error('Delayed test webpush exception:', err)
        }
      })
      return NextResponse.json({ ok: true, scheduledInSeconds: clampedDelay })
    }

    const result = await sendWebPush(subscription, payload)

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
