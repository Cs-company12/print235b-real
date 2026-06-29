// ===================== SERVICE WORKER =====================
// Maalinta Ibaadada - handles offline caching + scheduled reminder notifications

const CACHE_NAME = 'ibaadada-cache-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// ---- Notification click: bring app to foreground ----
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes('index.html'));
      if (existing) return existing.focus();
      return self.clients.openWindow('./index.html');
    })
  );
});

// ---- Message bridge: page tells the SW when to fire the next reminder ----
// data: { type: 'SCHEDULE_REMINDER', delay: <ms>, title, body }
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SCHEDULE_REMINDER') {
    const delay = Math.max(0, data.delay || 0);
    const title = data.title || 'Maalinta Ibaadada';
    const body  = data.body  || 'Waqtigii xasuusinta ee ibaadada ayaa gaaray.';

    // setTimeout inside an SW only reliably fires while the SW stays alive
    // (recent activity / periodic wake). This works well on Android/Desktop
    // Chrome PWAs. iOS Safari requires the installed PWA to be opened at
    // least once a day for background timers to keep working.
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'ibaadada-daily-reminder',
        renotify: true
      });
    }, delay);
  }
});
