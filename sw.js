const CACHE_NAME = 'gym-program-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// تثبيت الـ service worker وتخزين الملفات الأساسية في الكاش
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// تفعيل الـ service worker ومسح أي كاش قديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// تقديم الملفات من الكاش لو الانترنت مقطوع، مع دعم تخزين الخطوط والملفات ديناميكياً
self.addEventListener('fetch', (event) => {
  // تجاهل أي طلبات غير http / https (مثل chrome-extension)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // لو الخطوط أو الملفات الخارجية نزلت بنجاح، نخزن نسخة في الكاش للمستقبل
        if (
          response &&
          response.status === 200 &&
          (event.request.url.includes('fonts.googleapis.com') ||
           event.request.url.includes('fonts.gstatic.com'))
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // لو مفيش إنترنت وكان الطلب للصفحة الرئيسية نرجع index.html من الكاش
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});
