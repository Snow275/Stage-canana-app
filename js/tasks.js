// === js/tasks.js ===
// Module Tâches & To-Do (branché Backendless)
import { listTasks, createTask, setArchived, removeTask } from "./backendless.js";

export function initTasks() {
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const list = document.getElementById('task-list');
  const archiveList = document.getElementById('archived-list');
  const btnExp = document.getElementById('export-tasks');

  // États mémoire (pour export & rendu rapide)
  let tasks = [];
  let archived = [];

  // ----- helpers UI -----
  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderAll() {
    list.innerHTML = '';
    archiveList.innerHTML = '';
    tasks.forEach(renderTask);
    archived.forEach(renderArchived);
  }

  function renderTask(t) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.dataset.id = t.objectId;

    li.innerHTML = `
      <span>${escapeHtml(t.text)}</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1" title="Terminer">✔️</button>
        <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
      </div>
    `;

    const [btnDone, btnDel] = li.querySelectorAll('button');

    btnDone.onclick = async () => {
      await setArchived(t.objectId, true);
      await refresh();
    };

    btnDel.onclick = async () => {
      if (!confirm('Supprimer définitivement ?')) return;
      await removeTask(t.objectId);
      await refresh();
    };

    list.appendChild(li);
  }

  function renderArchived(t) {
    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-light d-flex justify-content-between align-items-center';
    li.dataset.id = t.objectId;

    li.innerHTML = `
      <span><s>${escapeHtml(t.text)}</s></span>
      <div>
        <button class="btn btn-sm btn-outline-primary me-1" title="Restaurer">↩️</button>
        <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
      </div>
    `;

    const [btnRestore, btnDel] = li.querySelectorAll('button');

    btnRestore.onclick = async () => {
      await setArchived(t.objectId, false);
      await refresh();
    };

    btnDel.onclick = async () => {
      if (!confirm("Supprimer de l’archive ?")) return;
      await removeTask(t.objectId);
      await refresh();
    };

    archiveList.appendChild(li);
  }

  // ----- Chargement depuis Backendless -----
  async function refresh() {
    try {
      [tasks, archived] = await Promise.all([
        listTasks({ archived: false }),
        listTasks({ archived: true })
      ]);
      renderAll();
    } catch (e) {
      console.error(e);
      alert("Erreur de synchro avec le serveur.");
    }
  }

  // ----- Ajout -----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    await createTask(txt);
    input.value = '';
    await refresh();
  });

  // ----- Export CSV (depuis l'état actuel) -----
  btnExp.addEventListener('click', () => {
    const all = [...tasks, ...archived];
    if (!all.length) return alert('Aucune tâche à exporter !');

    const header = 'objectId,texte,archived';
    const rows = all.map(t =>
      `${t.objectId},"${String(t.text).replace(/"/g,'""')}",${t.archived ? 'true':'false'}`
    );
    const csv = [header, ...rows].join('\n');

    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'tasks.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // Démarrage
  refresh();
}

// Pour le Dashboard : on lit depuis Backendless
export async function getTasks() {
  return listTasks({ archived: false });
}

export async function saveTask(text) {
  await createTask(text);
}
