// FamilyMeal PWA Service Worker
// Version wird automatisch aktualisiert
const CACHE = 'familymeal-v10b';

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled([
        c.add('/familymeal/'),
        c.add('/familymeal/index.html'),
      ].map(p => p.catch(() => {})))
    )
  );
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Never cache API calls
  if (e.request.url.includes('supabase.co') ||
      e.request.url.includes('openfoodfacts') ||
      e.request.url.includes('anthropic.com') ||
      e.request.url.includes('googleapis.com')) {
    return;
  }

  // Network first for HTML (always get latest version)
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache first for other assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
