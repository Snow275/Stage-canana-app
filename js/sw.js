// sw.js

const CACHE_NAME = 'stage-planner-v1';
const URLS_TO_CACHE = [
  '/',                 // index.html
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/tasks.js',
  '/js/calendar.js',
  '/js/contacts.js',
  '/js/budget.js',
  '/js/courses.js',
  '/js/dishes.js',
  '/js/invoices.js',
  '/js/documents.js',
  '/js/dashboard.js',
  // librairies tierces
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.4/index.global.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  // icônes/manifest si tu en as
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 1) Installation : on met en cache les ressources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// 2) Activation : on nettoie les vieux caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// 3) Fetch : stratégie Cache First
self.addEventListener('fetch', event => {
  // on ne gère que les requêtes GET
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // on renvoie du cache
        return cached;
      }
      // sinon on fait la requête réseau et on met en cache le résultat
      return fetch(event.request)
        .then(resp => {
          if (!resp.ok) return resp;
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return resp;
        })
        .catch(() => {
          // en cas d’échec réseau, on peut retourner une page offline si tu en as une
          // return caches.match('/offline.html');
        });
    })
  );
});
