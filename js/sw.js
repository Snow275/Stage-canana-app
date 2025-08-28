// sw.js — PWA offline avec fallback SPA

// ==============================
// CONFIG
// ==============================
const CACHE_NAME = 'stage-planner-v10';

// 👉 Liste tout ce dont l'UI a besoin pour s'ouvrir hors-ligne
const APP_SHELL = [
  '/',                 // "/" si déployé à la racine du domaine
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/tasks.js',
  '/js/courses.js',
  '/js/contacts.js',
  '/js/dishes.js',     // ajoute-le si tu l'utilises
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// (optionnel) CDN à pré-cacher (réponses opaques autorisées)
const EXTERNALS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.4/index.global.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

const SHELL_ALL = APP_SHELL.concat(EXTERNALS);

// ==============================
// INSTALL : pré-cache l’UI
// ==============================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ALL))
  );
  self.skipWaiting();
});

// ==============================
// ACTIVATE : nettoie les anciens caches
// ==============================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined))
      )
    )
  );
  self.clients.claim();
});

// ==============================
// FETCH : stratégie de cache
// ==============================
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1) Navigations (URL directe, refresh, clics internes) → index.html depuis le cache
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((res) => res || fetch(req))
    );
    return;
  }

  // 2) Assets (CSS/JS/images/CDN) → cache-first puis réseau
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => cached); // fallback si réseau KO
    })
  );
});
