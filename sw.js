// sw.js — PWA offline avec fallback SPA
const CACHE_NAME = 'stage-planner-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/tasks.js',
  '/js/courses.js',
  '/js/contacts.js',
  '/js/dishes.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const EXTERNALS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.4/index.global.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

const SHELL_ALL = APP_SHELL.concat(EXTERNALS);

// Install → précache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ALL))
  );
  self.skipWaiting();
});

// Activate → supprime les vieux caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)))
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // API Backendless → réseau direct
  if (url.origin === 'https://api.backendless.com') {
    if (req.method !== 'GET') {
      event.respondWith(fetch(req));
      return;
    }
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // SPA fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((res) => res || fetch(req))
    );
    return;
  }

  // Cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return res;
      }).catch(() => cached);
    })
  );
});

