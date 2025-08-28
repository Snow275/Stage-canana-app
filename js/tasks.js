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

// --- ID local pour distinguer les appareils (ajouté) ---
const DEVICE_ID = (() => {
  const k = 'stagePlanner_deviceId';
  let id = localStorage.getItem(k);
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(k, id);
  }
  return id;
})();

// --- Notifications (mobile-friendly) ---
async function notify(title, body) {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'granted') return;
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
      new Notification(title, { body });
    }
  } catch (e) {
    console.warn('Notif KO:', e);
  }
}

// (garde faux pour éviter notif au re-rendu)
const SHOULD_NOTIFY_ON_RENDER = false;

async function blEnsureOK(res){
  if(!res.ok){
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error(`Backendless HTTP ${res.status}: ${txt}`);
  }
}

// ✅ include archived=false OR null pour “en cours”
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

// ✅ AJOUTÉ: envoie aussi addedBy: DEVICE_ID
async function blCreate(text){
  const res = await fetch(BL_BASE, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ text, archived:false, addedBy: DEVICE_ID })
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
  // garde le “dernier vu” pour notifier seulement les ajouts *après* l’ouverture
  let lastSeenCreated = Number(localStorage.getItem('tasks_lastSeenCreated') || '0');
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

  // ---------- Chargement initial ----------
  async function refresh() {
    if (BL_ON) {
      [tasks, archived] = await Promise.all([ blList(false), blList(true) ]);
      // MAJ du “dernier vu” pour ne pas notifier les anciens items
      const maxCreated = Math.max(0, ...tasks.map(t => t.created || 0));
      if (maxCreated > lastSeenCreated) {
        lastSeenCreated = maxCreated;
        localStorage.setItem('tasks_lastSeenCreated', String(lastSeenCreated));
      }
    } else {
      tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      archived = JSON.parse(localStorage.getItem('archivedTasks') || '[]');
    }
    renderAll();
  }

  // ---------- Ajout ----------
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;

    if (BL_ON) {
      await blCreate(txt);
      input.value = '';
      await refresh();
      // IMPORTANT: on NE notifie pas l’auteur -> laissé volontairement commenté
      // await notify('Nouvelle tâche', txt);
    } else {
      const t = { id: Date.now(), text: txt };
      tasks.push(t);
      saveAll();
      renderTask(t);
      input.value = '';
      // idem: pas de notif pour l’auteur
      // await notify('Nouvelle tâche', txt);
    }
  });

  // ---------- Polling “autres appareils seulement” (ajouté) ----------
  async function checkRemoteNew() {
    if (!BL_ON) return;
    try {
      // on liste “en cours”
      const remote = await blList(false);
      if (!Array.isArray(remote) || !remote.length) return;

      // détecte les éléments plus récents que lastSeenCreated, pas archivés,
      // et créés par un autre DEVICE_ID
      const news = remote.filter(r =>
        (r.created || 0) > lastSeenCreated &&
        (r.archived === false || r.archived == null) &&
        r.addedBy !== DEVICE_ID
      );

      if (news.length) {
        // notifie pour le plus récent (évite le spam)
        const newest = news[0];
        await notify('Nouvelle tâche', String(newest.text || ''));
      }

      // met à jour le curseur “vu”
      const maxCreated = Math.max(lastSeenCreated, ...remote.map(r => r.created || 0));
      if (maxCreated > lastSeenCreated) {
        lastSeenCreated = maxCreated;
        localStorage.setItem('tasks_lastSeenCreated', String(lastSeenCreated));
      }
    } catch (e) {
      // silencieux
    }
  }

  // lance un polling doux (15s) + à chaque retour onglet visible
  let pollTimer = null;
  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(checkRemoteNew, 15000);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkRemoteNew();
  });
  startPolling();

  // ---------- Export CSV ----------
  const btnExp = document.getElementById('export-tasks');
  btnExp?.addEventListener('click', async () => {
    if (BL_ON && (!tasks.length && !archived.length)) {
      await refresh();
    }
    const data = [...tasks, ...archived];
    if (!data.length) return alert('Aucune tâche à exporter !');
    const header = 'id_or_objectId,texte,archived';
    const rows = data.map(t =>
      `${(t.objectId || t.id)},"${String(t.text).replace(/"/g,'""')}",${t.archived ? 'true':'false'}`
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
  if (BL_ON) { await blCreate(text); /* pas de notif auteur */ return; }
  const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  tasks.push({ id: Date.now(), text });
  localStorage.setItem('tasks', JSON.stringify(tasks));
  /* pas de notif auteur */
                                                }
