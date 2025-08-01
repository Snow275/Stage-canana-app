const CACHE = 'stage-planner-cache-v1';
const ASSETS = [
  '/', '/index.html',
  '/css/style.css', '/js/app.js',
  '/icons/icon-192.png', '/icons/icon-512.png'
];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
);

self.addEventListener('fetch', e =>
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  )
);
