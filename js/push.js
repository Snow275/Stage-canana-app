// js/push.js
const BL_APP_ID = "948A3DAD-06F1-4F45-BECA-A039688312DD";
const BL_REST_KEY = "8C69AAC6-204C-48CE-A60B-137706E8E183";
const BL_BASE = `https://api.backendless.com/${BL_APP_ID}/${BL_REST_KEY}`;

const MY_DEVICE_ID = (() => {
  try {
    const KEY = 'stage_planner_device_id';
    let id = localStorage.getItem(KEY);
    if (!id) { id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8); localStorage.setItem(KEY, id); }
    return id;
  } catch { return 'dev-' + Math.random().toString(36).slice(2,10); }
})();

// Remplace par ta clé publique VAPID (voir étape Netlify ci-dessous)
const VAPID_PUBLIC_KEY = window.STAGE_PLANNER_VAPID_PUBLIC || ''; 

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64); const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function saveSubscriptionToBackendless(sub) {
  // on sauvegarde endpoint + keys + deviceId dans table "Subscriptions"
  const res = await fetch(`${BL_BASE}/data/Subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      deviceId: MY_DEVICE_ID
    })
  });
  if (!res.ok) console.warn('Backendless save sub KO', await res.text());
}

async function ensurePushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission !== 'granted') return; // demande déjà faite dans ton index

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    if (!VAPID_PUBLIC_KEY) { console.warn('VAPID_PUBLIC_KEY manquante'); return; }
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }
  // normalise les keys (Chrome renvoie via getKey)
  const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('p256dh'))));
  const auth   = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('auth'))));
  await saveSubscriptionToBackendless({ endpoint: sub.endpoint, keys: { p256dh, auth } });
}

// démarre l’abonnement après chargement
window.addEventListener('DOMContentLoaded', () => {
  ensurePushSubscription().catch(console.warn);
});

// Exposé pour d’autres modules (optionnel)
window.__SP_PUSH__ = { ensurePushSubscription, MY_DEVICE_ID };
