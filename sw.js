const CACHE = 'innerscape-v195';
const ASSETS = ['/', '/index.html', '/styles.css', '/core.js', '/mood.js', '/dreams.js', '/timer.js', '/meditation.js', '/food.js', '/insights.js', '/sync.js', '/medication.js', '/todos.js', '/wishlist.js', '/studio.js', '/stool.js', '/forecast.js', '/oura.js', '/activity-overview.js', '/app.js', '/intentions.js', '/media.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // Cache assets individually — don't fail install if one asset has network issues
      Promise.allSettled(ASSETS.map(url => c.add(url).catch(err => console.warn('Cache miss:', url, err))))
    )
  );
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
  // Network-first for API calls, cache-first for app assets
  if (e.request.url.includes('/api/') || e.request.url.includes('supabase')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  } else {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        // Cache successful fetches for next time
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
  }
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
