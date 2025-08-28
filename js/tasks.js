/*** Module Tâches & To-Do */

// ================================
// BACKENDLESS >>> CONFIG MINIMALE
const BL_APP_ID = "948A3DAD-06F1-4F45-BECA-A039688312DD";
const BL_REST_KEY = "8C69AAC6-204C-48CE-A60B-137706E8E183";
const BL_BASE = (BL_APP_ID && BL_REST_KEY)
  ? `https://api.backendless.com/${BL_APP_ID}/${BL_REST_KEY}/data/Taches`
  : null;
const BL_ON = !!BL_BASE;

// --- Identifiant persistant de l'appareil
const MY_DEVICE_ID = (() => {
  try {
    const KEY = 'stage_planner_device_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'dev-' + Math.random().toString(36).slice(2,10);
  }
})();

// --- Notifications helper ---
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
    }
  } catch (e) {
    console.warn('Notif KO:', e);
  }
}

const SHOULD_NOTIFY_ON_RENDER = false;
const SELF_CREATED_IDS = new Set();
let lastTaskIds = new Set();
let firstLoadDone = false;

async function blEnsureOK(res){
  if(!res.ok){
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error(`Backendless HTTP ${res.status}: ${txt}`);
  }
}

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
  const payload = { text, archived:false, creatorDeviceId: MY_DEVICE_ID };
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

// ================================
// INIT TASKS (raccroché à window)
// ================================
function initTasks() {
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const list = document.getElementById('task-list');
  const archiveList = document.getElementById('archived-list');
  const btnExp = document.getElementById('export-tasks');

  let tasks = [];
  let archived = [];

  function renderTask(t) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `<span>${escapeHtml(t.text)}</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1">✔️</button>
        <button class="btn btn-sm btn-outline-danger">❌</button>
      </div>`;
    const [btnDone, btnDel] = li.querySelectorAll('button');

    btnDone.onclick = async () => {
      if (BL_ON) { await blSetArchived(t.objectId, true); await refresh(); }
    };
    btnDel.onclick = async () => {
      if (!confirm('Supprimer définitivement ?')) return;
      if (BL_ON) { await blRemove(t.objectId); await refresh(); }
    };

    list.appendChild(li);
  }

  function renderArchived(t) {
    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-light d-flex justify-content-between align-items-center';
    li.innerHTML = `<span><s>${escapeHtml(t.text)}</s></span>
      <div>
        <button class="btn btn-sm btn-outline-primary me-1">↩️</button>
        <button class="btn btn-sm btn-outline-danger">❌</button>
      </div>`;
    const [btnRestore, btnDel] = li.querySelectorAll('button');

    btnRestore.onclick = async () => {
      if (BL_ON) { await blSetArchived(t.objectId, false); await refresh(); }
    };
    btnDel.onclick = async () => {
      if (!confirm('Supprimer de l’archive ?')) return;
      if (BL_ON) { await blRemove(t.objectId); await refresh(); }
    };

    archiveList.appendChild(li);
  }

  function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s; return div.innerHTML; }
  function renderAll() { list.innerHTML = ''; archiveList.innerHTML = ''; tasks.forEach(renderTask); archived.forEach(renderArchived); }

  async function refresh() {
    const previousIds = new Set(lastTaskIds);
    if (BL_ON) {
      [tasks, archived] = await Promise.all([ blList(false), blList(true) ]);
    }
    renderAll();
    const currentIds = new Set(tasks.map(t => t.objectId || t.id));
    if (!firstLoadDone) { lastTaskIds = currentIds; firstLoadDone = true; return; }
    const newTasks = tasks.filter(t => !previousIds.has(t.objectId || t.id));
    for (const t of newTasks) {
      const id = t.objectId || t.id;
      if (SELF_CREATED_IDS.has(id)) { SELF_CREATED_IDS.delete(id); continue; }
      if (t.creatorDeviceId && t.creatorDeviceId === MY_DEVICE_ID) continue;
      if (t.text) notify('Nouvelle tâche', t.text);
    }
    lastTaskIds = currentIds;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    if (BL_ON) {
      const created = await blCreate(txt);
      if (created && created.objectId) SELF_CREATED_IDS.add(created.objectId);
      input.value = '';
      await refresh();
    }
  });

  btnExp.addEventListener('click', async () => {
    if (BL_ON && (!tasks.length && !archived.length)) await refresh();
    const data = [...tasks, ...archived];
    if (!data.length) return alert('Aucune tâche à exporter !');
    const header = 'id_or_objectId,texte,archived,creatorDeviceId';
    const rows = data.map(t => `${(t.objectId || t.id)},"${String(t.text).replace(/"/g,'""')}",${t.archived ? 'true':'false'},${t.creatorDeviceId||''}`);
    downloadCSV('tasks.csv', [header, ...rows].join('\n'));
  });

  function downloadCSV(filename, text) {
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text);
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  refresh();
}

// ✅ on expose la fonction au global
window.initTasks = initTasks;
