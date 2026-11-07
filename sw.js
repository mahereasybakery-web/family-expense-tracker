// Service Worker for Family Expense Tracker (Offline First & PWA)
const CACHE_NAME = 'family-expense-tracker-v4.9.2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './version.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/favicon.png',
  './assets/family_option2_mosaic.jpg',
  './avatar_all_family.jpg',
  './avatar_mohamed.jpg',
  './baby.jpg',
  './family_portrait.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  
  // Only handle GET requests
  if (req.method !== 'GET') return;

  // For version.json or live rates, network first
  if (req.url.includes('version.json') || req.url.includes('market_rates.json') || req.url.includes('_nocache')) {
    e.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Stale-While-Revalidate for app assets
  e.respondWith(
    caches.match(req).then((cachedResp) => {
      const fetchPromise = fetch(req).then((networkResp) => {
        if (networkResp && networkResp.status === 200 && networkResp.type === 'basic') {
          const respToCache = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, respToCache);
          });
        }
        return networkResp;
      }).catch((err) => {
        // Network failed (offline)
        return cachedResp || caches.match('./index.html');
      });

      return cachedResp || fetchPromise;
    })
  );
});
