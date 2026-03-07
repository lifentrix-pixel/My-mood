const CACHE = 'innerscape-v84';
const ASSETS = ['/', '/index.html', '/styles.css', '/core.js', '/mood.js', '/dreams.js', '/timer.js', '/meditation.js', '/food.js', '/insights.js', '/sync.js', '/medication.js', '/todos.js', '/wishlist.js', '/studio.js', '/stool.js', '/oura.js', '/app.js', '/manifest.json', '/import-data.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      // Delete old caches but don't touch localStorage
      return Promise.all(
        keys.filter(k => k.startsWith('innerscape-') && k !== CACHE)
          .map(k => {
            return caches.delete(k);
          })
      );
    })
  );
  // Immediately claim all clients (existing tabs)
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// Notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length) return clients[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
