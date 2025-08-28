// sw.js — PWA offline avec fallback SPA
const CACHE_NAME = 'stage-planner-v9';

// 👉 Liste tout ce dont l'UI a besoin pour s'ouvrir hors-ligne
const APP_SHELL = [
  '/',                 // mets "/" si déployé à la racine du domaine
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

// Install → précache l’UI
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

  // 1) Navigations (refresh, URL directe, clics internes) :
  //    renvoie TOUJOURS index.html depuis le cache → évite l'écran "no network".
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((res) => res || fetch(req))
    );
    return;
  }

  // 2) Assets (CSS/JS/icônes/CDN) → cache-first, puis réseau, puis retombe sur cache si réseau KO
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // met en cache pour la prochaine fois (même si opaque)
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => cached); // si tout échoue, on rend ce qu’on a (souvent null, mais on essaie)
    })
  );
});




