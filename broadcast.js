// netlify/functions/broadcast.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const webpush = require('web-push');

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, BL_APP_ID, BL_REST_KEY } = process.env;
const BL_BASE = `https://api.backendless.com/${BL_APP_ID}/${BL_REST_KEY}`;

webpush.setVapidDetails(
  'mailto:you@example.com',   // mets ton mail ici
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch { payload = {}; }

  const text = payload.text || '';
  const creatorDeviceId = payload.creatorDeviceId || '';

  // 1) Récupère tous les abonnements enregistrés dans Backendless
  const res = await fetch(`${BL_BASE}/data/Subscriptions?pageSize=100`);
  if (!res.ok) {
    const t = await res.text();
    return { statusCode: 500, body: `Backendless error: ${t}` };
  }
  const subs = await res.json();

  // 2) Envoie la notif à tous sauf au créateur
  const notifications = subs
    .filter(s => !creatorDeviceId || s.deviceId !== creatorDeviceId)
    .map(async (s) => {
      const pushSub = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth }
      };
      try {
        await webpush.sendNotification(
          pushSub,
          JSON.stringify({
            title: 'Nouvelle tâche',
            body: text,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: 'stage-planner-task'
          }),
          { TTL: 60 }
        );
      } catch (e) {
        console.warn('Push error', e.statusCode, e.body);
      }
    });

  await Promise.allSettled(notifications);
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
