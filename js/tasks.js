 /*** Module Tâches & To-Do*/

// ================================
// BACKENDLESS >>> CONFIG MINIMALE
// Mets tes clés ici (sinon fallback localStorage)
const BL_APP_ID = "948A3DAD-06F1-4F45-BECA-A039688312DD";
const BL_REST_KEY = "8C69AAC6-204C-48CE-A60B-137706E8E183";
const BL_BASE = (BL_APP_ID && BL_REST_KEY)
  ? `https://api.backendless.com/${BL_APP_ID}/${BL_REST_KEY}/data/Taches`
  : null;
const BL_ON = !!BL_BASE;

// --- Identifiant persistant de l'appareil (pour savoir qui a créé quoi)
const MY_DEVICE_ID = (() => {
  try {
    const KEY = 'stage_planner_device_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      // id pseudo-unique simple
      id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'dev-' + Math.random().toString(36).slice(2,10);
  }
})();

// --- Notifications helper (FIABLE mobile) ---
async function notify(title, body) {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'granted') return;

    // Attend le SW prêt (plus fiable que getRegistration() sur mobile)
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.showNotification) {
      await reg.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        silent: false,
        tag: 'stage-planner-task',
        renotify: false
      });
    } else {
      // Fallback (peut être bloqué sur mobile)
      new Notification(title, { body });
    }
  } catch (e) {
    console.warn('Notif KO:', e);
  }
}

// (garde faux pour éviter notif au re-rendu)
const SHOULD_NOTIFY_ON_RENDER = false;

// ✅ Empêche de notifier le créateur : on mémorise les IDs créés localement
const SELF_CREATED_IDS = new Set();

// Pour détecter les nouvelles tâches entre deux refresh()
let lastTaskIds = new Set();
let firstLoadDone = false;

async function blEnsureOK(res){
  if(!res.ok){
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error(`Backendless HTTP ${res.status}: ${txt}`);
  }
}

// ✅ Inclure archived=false **OU** archived is null pour la liste "en cours"
async function blList(archived){
  let q;
  if (archived) {
    q = "where=archived%3Dtrue&sortBy=created%20desc";
  } else {
    q = "where=archived%3Dfalse%20or%20archived%20is%20null&sortBy=created%20desc";
  }
  const res = await fetch(`${BL_BASE}?${q}`);
  await blEnsureOK(res);
  return res.json();
}

async function blCreate(text){
  const payload = { text, archived:false, creatorDeviceId: MY_DEVICE_ID }; // on envoie aussi le deviceId
  const res = await fetch(BL_BASE, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  });
  await blEnsureOK(res);
  return res.json();
}
async function blSetArchived(objectId, val){
  const res = await fetch(`${BL_BASE}/${objectId}`, {
    method:"PATCH", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ archived: val })
  });
  await blEnsureOK(res);
  return res.json();
}
async function blRemove(objectId){
  const res = await fetch(`${BL_BASE}/${objectId}`, { method:"DELETE" });
  await blEnsureOK(res);
  return true;
}
// BACKENDLESS <<<
// ================================

export function initTasks() {
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const list = document.getElementById('task-list');
  const archiveList = document.getElementById('archived-list');
  const btnExp = document.getElementById('export-tasks');

  // BACKENDLESS >>> état en mémoire
  let tasks = [];
  let archived = [];
  // BACKENDLESS <<<

  // ---------- Affichage ----------
  function renderTask(t) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `<span>${escapeHtml(t.text)}</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1" title="Terminer">✔️</button>
        <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
      </div>`;
    const [btnDone, btnDel] = li.querySelectorAll('button');

    if (SHOULD_NOTIFY_ON_RENDER && typeof t.text === 'string') {
      // désactivé par défaut
      notify('Ajout dans la liste', t.text);
    }

    btnDone.onclick = async () => {
      if (BL_ON) {
        await blSetArchived(t.objectId, true);
        await refresh();
      } else {
        moveToArchive(t.id, li);
      }
    };
    btnDel.onclick = async () => {
      if (!confirm('Supprimer définitivement ?')) return;
      if (BL_ON) {
        await blRemove(t.objectId);
        await refresh();
      } else {
        tasks = tasks.filter(x => x.id !== t.id);
        saveAll();
        li.remove();
      }
    };

    list.appendChild(li);
  }

  function renderArchived(t) {
    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-light d-flex justify-content-between align-items-center';
    li.innerHTML = `<span><s>${escapeHtml(t.text)}</s></span>
      <div>
        <button class="btn btn-sm btn-outline-primary me-1" title="Restaurer">↩️</button>
        <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
      </div>`;
    const [btnRestore, btnDel] = li.querySelectorAll('button');

    btnRestore.onclick = async () => {
      if (BL_ON) {
        await blSetArchived(t.objectId, false);
        await refresh();
      } else {
        restoreFromArchive(t.id, li);
      }
    };
    btnDel.onclick = async () => {
      if (!confirm('Supprimer de l’archive ?')) return;
      if (BL_ON) {
        await blRemove(t.objectId);
        await refresh();
      } else {
        archived = archived.filter(x => x.id !== t.id);
        saveAll();
        li.remove();
      }
    };

    archiveList.appendChild(li);
  }

  // ---------- Logique locale fallback ----------
  function moveToArchive(id, li) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const [t] = tasks.splice(idx, 1);
    archived.push(t);
    saveAll();
    li.remove();
    renderArchived(t);
  }
  function restoreFromArchive(id, li) {
    const idx = archived.findIndex(t => t.id === id);
    if (idx === -1) return;
    const [t] = archived.splice(idx, 1);
    tasks.push(t);
    saveAll();
    li.remove();
    renderTask(t);
  }
  function saveAll() {
    if (!BL_ON) {
      localStorage.setItem('tasks', JSON.stringify(tasks));
      localStorage.setItem('archivedTasks', JSON.stringify(archived));
    }
  }
  function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s; return div.innerHTML; }

  function renderAll() {
    list.innerHTML = ''; archiveList.innerHTML = '';
    tasks.forEach(renderTask);
    archived.forEach(renderArchived);
  }

  // ---------- Chargement initial + détection des nouvelles tâches ----------
  async function refresh() {
    // récupère l’état précédent des IDs pour détecter les nouveaux
    const previousIds = new Set(lastTaskIds);

    if (BL_ON) {
      [tasks, archived] = await Promise.all([ blList(false), blList(true) ]);
    } else {
      tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      archived = JSON.parse(localStorage.getItem('archivedTasks') || '[]');
    }

    // maj de l'affichage
    renderAll();

    // construit l’ensemble courant des IDs
    const currentIds = new Set(tasks.map(t => t.objectId || t.id));

    // sur premier chargement, on initialise sans notifier
    if (!firstLoadDone) {
      lastTaskIds = currentIds;
      firstLoadDone = true;
      return;
    }

    // Détecte les nouvelles tâches apparues depuis le dernier refresh
    const newTasks = tasks.filter(t => !previousIds.has(t.objectId || t.id));

    // Notifie pour les nouvelles tâches… sauf si créées par CE device
    for (const t of newTasks) {
      const id = t.objectId || t.id;

      // 1) Filtre fort: si on retrouve l’ID dans SELF_CREATED_IDS -> ne pas notifier le créateur
      if (SELF_CREATED_IDS.has(id)) {
        SELF_CREATED_IDS.delete(id); // nettoie pour ne pas croître à l’infini
        continue;
      }

      // 2) Si le champ creatorDeviceId est présent ET correspond à ce device, on ne notifie pas
      if (t.creatorDeviceId && t.creatorDeviceId === MY_DEVICE_ID) {
        continue;
      }

      // Sinon -> on notifie (autres appareils)
      if (t.text) {
        notify('Nouvelle tâche', t.text);
      }
    }

    // Enfin, on mémorise l’état courant
    lastTaskIds = currentIds;
  }

  // ---------- Ajout ----------
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;

    if (BL_ON) {
      const created = await blCreate(txt);
      // mémorise l’ID créé par CET appareil pour éviter la notif locale au prochain refresh
      if (created && created.objectId) {
        SELF_CREATED_IDS.add(created.objectId);
      }
      input.value = '';
      await refresh(); // pas de notify ici → les autres appareils verront une "nouvelle tâche" et seront notifiés
    } else {
      const tmpId = Date.now();
      const t = { id: tmpId, text: txt, creatorDeviceId: MY_DEVICE_ID };
      itemsPushLocal(t); // push + save + render
      input.value = '';
      // évite la notif locale (la détection se fait dans refresh)
      SELF_CREATED_IDS.add(tmpId);
      // pour le mode local, on peut quand même rafraîchir l’état mémoire (même si pas obligatoire)
      await refresh();
    }
  });

  // petit helper pour la branche locale
  function itemsPushLocal(t) {
    tasks.push(t);
    saveAll();
    renderTask(t);
  }

  // ---------- Export CSV ----------
  btnExp.addEventListener('click', async () => {
    if (BL_ON && (!tasks.length && !archived.length)) {
      await refresh();
    }
    const data = [...tasks, ...archived];
    if (!data.length) return alert('Aucune tâche à exporter !');
    const header = 'id_or_objectId,texte,archived,creatorDeviceId';
    const rows = data.map(t =>
      `${(t.objectId || t.id)},"${String(t.text).replace(/"/g,'""')}",${t.archived ? 'true':'false'},${t.creatorDeviceId || ''}`
    );
    downloadCSV('tasks.csv', [header, ...rows].join('\n'));
  });

  function downloadCSV(filename, text) {
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // GO
  refresh();
}

/*** Pour le Dashboard : récupération et ajout rapides*/
export function getTasks() {
  if (BL_ON) return blList(false);
  return JSON.parse(localStorage.getItem('tasks') || '[]');
}
export async function saveTask(text) {
  // Ici aussi : pas de notif locale au moment de créer, on laisse refresh() des autres appareils s’en charger
  if (BL_ON) {
    const created = await blCreate(text);
    if (created && created.objectId) {
      SELF_CREATED_IDS.add(created.objectId);
    }
    return;
  }
  const tmpId = Date.now();
  const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  const t = { id: tmpId, text, creatorDeviceId: MY_DEVICE_ID };
  tasks.push(t);
  localStorage.setItem('tasks', JSON.stringify(tasks));
  SELF_CREATED_IDS.add(tmpId);
}
