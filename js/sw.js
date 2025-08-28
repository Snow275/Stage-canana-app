          // sw.js — PWA offline avec fallback SPA
const CACHE_NAME = 'stage-planner-v13';

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
  const url = new URL(req.url);

  // ❗️1) NE PAS mettre en cache l’API Backendless (toujours réseau)
  if (url.origin === 'https://api.backendless.com') {
    // pour sécurité: toutes méthodes non-GET → direct réseau
    if (req.method !== 'GET') {
      event.respondWith(fetch(req));
      return;
    }
    // GET → network-first, fallback cache si vraiment offline
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // 2) Navigations → renvoie index.html depuis le cache (SPA fallback)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((res) => res || fetch(req))
    );
    return;
  }

  // 3) Assets (CSS/JS/icônes/CDN) → cache-first puis réseau
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => cached);
    })
  );
});

// 🔔 Notifications : clic → focus/ouverture
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      if (clientsArr.length > 0) {
        clientsArr[0].focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});

// sw.js — gestion des push pour notifs en arrière-plan
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'Stage Planner';
  const body  = data.body  || '';
  const icon  = data.icon  || '/icons/icon-192.png';
  const badge = data.badge || '/icons/icon-192.png';
  const tag   = data.tag   || 'stage-planner-push';

  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon, badge, tag, renotify: false
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((arr) => {
      if (arr.length) return arr[0].focus();
      return clients.openWindow('/');
    })
  );
});

self.addEventListener('pushsubscriptionchange', async (event) => {
  // Optionnel: re-souscrire automatiquement si besoin
});
