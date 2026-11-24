/* Solo Quest — Background Web Push Service Worker */

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {
    title: 'Quest Siap Dikerjakan',
    body: 'Waktunya mengerjakan quest terjadwal.',
    url: '/',
    tag: 'solo-quest-alert',
  }

  try {
    if (event.data) {
      const parsed = event.data.json()
      data = { ...data, ...parsed }
    }
  } catch {
    try {
      const txt = event.data ? event.data.text() : ''
      if (txt) data.body = txt
    } catch {}
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    tag: data.tag || 'solo-quest-alert',
    renotify: false,
    requireInteraction: false,
    vibrate: [120, 60, 160],
    data: {
      url: data.url || '/',
      questId: data.questId || null,
    },
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options).catch(() =>
      self.registration.showNotification(data.title || '[ ! ] QUEST TERBUKA', {
        body: data.body || 'Ada quest yang sudah memasuki jadwalnya.',
      })
    )
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client && client.url !== new URL(targetUrl, self.location.origin).href) {
            return client.navigate(targetUrl).catch(() => client)
          }
          return client
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
