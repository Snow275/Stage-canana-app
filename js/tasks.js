  /*** Module Tâches & To-Do */

// ================================
// BACKENDLESS >>> CONFIG MINIMALE
const BL_APP_ID = "948A3DAD-06F1-4F45-BECA-A039688312DD";
const BL_REST_KEY = "8C69AAC6-204C-48CE-A60B-137706E8E183";
const BL_BASE = (BL_APP_ID && BL_REST_KEY)
  ? `https://api.backendless.com/${BL_APP_ID}/${BL_REST_KEY}/data/Taches`
  : null;
const BL_ON = !!BL_BASE;

// 🔑 identifiant unique par appareil
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

async function blEnsureOK(res){
  if(!res.ok){
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error(`Backendless HTTP ${res.status}: ${txt}`);
  }
}

// ✅ NE FILTRE PAS sur archived=null (ça posait problème)
async function blList(archived){
  let q;
  if (archived) {
    q = "where=archived%3Dtrue&sortBy=created%20desc";
  } else {
    q = "where=archived%3Dfalse%20or%20archived%20is%20null%20or%20archived%20%3D%20NULL&sortBy=created%20desc";
  }
  const res = await fetch(`${BL_BASE}?${q}`);
  await blEnsureOK(res);
  const data = await res.json();
  console.log("📥 Backendless renvoie:", data); // debug
  return data;
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
    const text = t.text || t.texte || "(sans titre)"; // ✅ sécurité
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `<span>${escapeHtml(text)}</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1" title="Terminer">✔️</button>
        <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
      </div>`;
    const [btnDone, btnDel] = li.querySelectorAll('button');

    btnDone.onclick = async () => {
      if (BL_ON) {
        await blSetArchived(t.objectId, true);
        await refresh();
      }
    };
    btnDel.onclick = async () => {
      if (!confirm('Supprimer définitivement ?')) return;
      if (BL_ON) {
        await blRemove(t.objectId);
        await refresh();
      }
    };

    list.appendChild(li);
  }

  function renderArchived(t) {
    const text = t.text || t.texte || "(sans titre)";
    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-light d-flex justify-content-between align-items-center';
    li.innerHTML = `<span><s>${escapeHtml(text)}</s></span>
      <div>
        <button class="btn btn-sm btn-outline-primary me-1" title="Restaurer">↩️</button>
        <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
      </div>`;
    const [btnRestore, btnDel] = li.querySelectorAll('button');

    btnRestore.onclick = async () => {
      if (BL_ON) {
        await blSetArchived(t.objectId, false);
        await refresh();
      }
    };
    btnDel.onclick = async () => {
      if (!confirm('Supprimer de l’archive ?')) return;
      if (BL_ON) {
        await blRemove(t.objectId);
        await refresh();
      }
    };

    archiveList.appendChild(li);
  }

  function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s; return div.innerHTML; }

  function renderAll() {
    list.innerHTML = ''; archiveList.innerHTML = '';
    tasks.forEach(renderTask);
    archived.forEach(renderArchived);
  }

  async function refresh() {
    if (BL_ON) {
      [tasks, archived] = await Promise.all([ blList(false), blList(true) ]);
    } else {
      tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      archived = JSON.parse(localStorage.getItem('archivedTasks') || '[]');
    }
    renderAll();
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    if (BL_ON) {
      await blCreate(txt);
      input.value = '';
      await refresh();
    }
  });

  btnExp.addEventListener('click', async () => {
    if (BL_ON && (!tasks.length && !archived.length)) {
      await refresh();
    }
    const data = [...tasks, ...archived];
    if (!data.length) return alert('Aucune tâche à exporter !');
    const header = 'id_or_objectId,texte,archived,creatorDeviceId';
    const rows = data.map(t =>
      `${(t.objectId || t.id)},"${String(t.text || '').replace(/"/g,'""')}",${t.archived ? 'true':'false'},${t.creatorDeviceId||''}`
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

  refresh();
  setInterval(refresh, 10000);
}
