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





async function blEnsureOK(res){


  if(!res.ok){


    const txt = await res.text().catch(()=>res.statusText);


    throw new Error(`Backendless HTTP ${res.status}: ${txt}`);


  }


}


async function blList(archived){


  const q = `where=archived%3D${archived ? "true":"false"}&sortBy=created%20desc`;


  const res = await fetch(`${BL_BASE}?${q}`);


  await blEnsureOK(res);


  return res.json();


}


async function blCreate(text){


  const res = await fetch(BL_BASE, {


    method:"POST", headers:{ "Content-Type":"application/json" },


    body: JSON.stringify({ text, archived:false })


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





  // ---------- Chargement initial ----------


  async function refresh() {


    if (BL_ON) {


      [tasks, archived] = await Promise.all([ blList(false), blList(true) ]);


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


      await notify('Nouvelle tâche', txt);  // 🔔 ici


    } else {


      const t = { id: Date.now(), text: txt };


      tasks.push(t);


      saveAll();


      renderTask(t);


      input.value = '';


      await notify('Nouvelle tâche', txt);  // 🔔 ici


    }


  });





  // ---------- Export CSV ----------


  btnExp.addEventListener('click', async () => {


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


  if (BL_ON) { await blCreate(text); await notify('Nouvelle tâche', text); return; }


  const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');


  tasks.push({ id: Date.now(), text });


  localStorage.setItem('tasks', JSON.stringify(tasks));


  await notify('Nouvelle tâche', text);


}
