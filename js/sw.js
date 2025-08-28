// sw.js — PWA offline avec fallback SPA (sécurisé)
const CACHE_NAME = 'stage-planner-safe-v1';

// 👉 Liste des fichiers à pré-cacher
const APP_SHELL = [
  './index.html', // ⚠️ ./ au lieu de / pour éviter les erreurs en sous-dossier
  './css/style.css',
  './js/app.js',
  './js/tasks.js',
  './js/courses.js',
  './js/contacts.js',
  './js/dishes.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// (optionnel) CDN externes
const EXTERNALS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.4/index.global.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

const SHELL_ALL = APP_SHELL.concat(EXTERNALS);

// Install → précache l’UI
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ALL).catch((err) => {
        console.warn('[SW install] Erreur précache', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate → supprime les vieux caches
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

// Fetch handler sécurisé
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1) Navigations → sert toujours index.html (fallback SPA)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((res) => {
        if (res) return res;
        return fetch(req).catch(() => new Response('<h1>Mode offline</h1>', { headers: { 'Content-Type': 'text/html' } }));
      })
    );
    return;
  }

  // 2) Autres ressources → cache d’abord, sinon réseau, sinon rien
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch((err) => {
          console.warn('[SW fetch error]', req.url, err);
          return new Response('', { status: 200 }); // évite l'écran noir
        });
    })
  );
});
