/*** Module Tâches & To-Do — version debug sans filtre archived ***/

// ================================
// BACKENDLESS >>> CONFIG MINIMALE
const BL_APP_ID = "948A3DAD-06F1-4F45-BECA-A039688312DD";
const BL_REST_KEY = "8C69AAC6-204C-48CE-A60B-137706E8E183";
const BL_BASE = (BL_APP_ID && BL_REST_KEY)
  ? `https://api.backendless.com/${BL_APP_ID}/${BL_REST_KEY}/data/Taches`
  : null;
const BL_ON = !!BL_BASE;

// identifiant unique par appareil
const MY_DEVICE_ID = localStorage.getItem('myDeviceId') || (() => {
  const id = 'dev-' + Math.random().toString(36).slice(2);
  localStorage.setItem('myDeviceId', id);
  return id;
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
        badge: '/icons/icon-192.png'
      });
    }
  } catch (e) {
    console.warn('Notif KO:', e);
  }
}

async function blEnsureOK(res){
  if(!res.ok){
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error(`Backendless HTTP ${res.status}: ${txt}`);
  }
}

// 🚨 DEBUG : ici on enlève complètement le filtre
async function blList(){
  const res = await fetch(`${BL_BASE}?sortBy=created%20desc`);
  await blEnsureOK(res);
  return res.json();
}

async function blCreate(text){
  const res = await fetch(BL_BASE, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ text, archived:false, creatorDeviceId: MY_DEVICE_ID })
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
      await blSetArchived(t.objectId, true);
      await refresh();
    };
    btnDel.onclick = async () => {
      if (!confirm('Supprimer définitivement ?')) return;
      await blRemove(t.objectId);
      await refresh();
    };

    list.appendChild(li);
  }

  function renderAll() {
    list.innerHTML = '';
    archiveList.innerHTML = '';
    tasks.forEach(renderTask);
    // on ignore archived ici volontairement pour debug
  }

  async function refresh() {
    if (BL_ON) {
      tasks = await blList();
    } else {
      tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    }
    renderAll();
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    await blCreate(txt);
    input.value = '';
    await refresh();
  });

  btnExp.addEventListener('click', async () => {
    const data = tasks;
    if (!data.length) return alert('Aucune tâche à exporter !');
    const header = 'id_or_objectId,texte,archived,creatorDeviceId';
    const rows = data.map(t =>
      `${(t.objectId || t.id)},"${String(t.text).replace(/"/g,'""')}",${t.archived || false},${t.creatorDeviceId||''}`
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

  function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s; return div.innerHTML; }

  refresh();
  setInterval(refresh, 10000);
}

export function getTasks() {
  if (BL_ON) return blList();
  return JSON.parse(localStorage.getItem('tasks') || '[]');
}
export async function saveTask(text) {
  await blCreate(text);
}
