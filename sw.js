// Service Worker for Family Expense Tracker (Offline First & PWA)
const CACHE_NAME = "family-expense-tracker-v4.9.9-202611071745";
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
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW pre-cache warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('SW purging old cache:', k);
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

  const url = req.url;

  // 1. استراتيجية Network-First لكافة طلبات التنقل وملفات HTML والإصدارات لمنع احتجاز المستخدم في الكاش القديم
  const isHtmlOrNavigate = (
    req.mode === 'navigate' || 
    req.destination === 'document' || 
    url.endsWith('/') || 
    url.includes('index.html') || 
    url.includes('version.json') || 
    url.includes('market_rates.json') || 
    url.includes('_nocache') || 
    url.includes('_upd') || 
    url.includes('_fresh') ||
    url.includes('_t=')
  );

  if (isHtmlOrNavigate) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((networkResp) => {
          if (networkResp && networkResp.status === 200) {
            const respToCache = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, respToCache));
          }
          return networkResp;
        })
        .catch(() => {
          // في حال انقطاع الإنترنت الكامل (Offline)، يتم العودة للنسخة المخزنة محلياً
          return caches.match(req).then((cached) => cached || caches.match('./index.html') || caches.match('./'));
        })
    );
    return;
  }

  // 2. استراتيجية Stale-While-Revalidate للصور والملفات الثابتة
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
      }).catch(() => {
        return cachedResp;
      });

      return cachedResp || fetchPromise;
    })
  );
});
