const CACHE = 'innerscape-v124';
const ASSETS = ['/', '/index.html', '/styles.css', '/core.js', '/mood.js', '/dreams.js', '/timer.js', '/meditation.js', '/food.js', '/insights.js', '/sync.js', '/medication.js', '/todos.js', '/wishlist.js', '/studio.js', '/stool.js', '/forecast.js', '/oura.js', '/activity-overview.js', '/app.js', '/manifest.json', '/import-data.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('innerscape-') && k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// Listen for message from app to skip waiting
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length) return clients[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
