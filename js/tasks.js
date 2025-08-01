// js/tasks.js
// js/tasks.js
import { gun } from './gundb.js';

const tasksDB = gun.get('tasks');

// 1) Abonnement temps réel
export function subscribeTasks(cb) {
  tasksDB.map().on((data, id) => {
    tasksDB.once(all => {
      const arr = Object.entries(all || {})
        .filter(([k,v]) => v && !v.deleted)
        .map(([k,v]) => ({ id: k, ...v }));
      cb(arr);
    });
  });
}

// 2) Ajouter une tâche
export function addTask(text) {
  return tasksDB.set({ text, createdAt: Date.now() });
}

// 3) « suppression » (marquage supprimé)
export function removeTask(id) {
  gun.get('tasks').get(id).put({ deleted: true });
}

/**
 * Module Tâches & To-Do
 */
export function initTasks() {
  const form        = document.getElementById('task-form');
  const input       = document.getElementById('task-input');
  const list        = document.getElementById('task-list');
  const archiveList = document.getElementById('archived-list');
  const btnExp      = document.getElementById('export-tasks');

  let tasks    = JSON.parse(localStorage.getItem('tasks')         || '[]');
  let archived = JSON.parse(localStorage.getItem('archivedTasks') || '[]');

  // Affichage initial
  tasks.forEach(renderTask);
  archived.forEach(renderArchived);

  // Ajout de tâche
  form.addEventListener('submit', e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    const t = { id: Date.now(), text: txt };
    tasks.push(t);
    saveAll();
    renderTask(t);
    input.value = '';
  });

  // Export CSV
  btnExp.addEventListener('click', () => {
    if (!tasks.length) return alert('Aucune tâche à exporter !');
    const header = 'id,texte';
    const rows   = tasks.map(t => `${t.id},"${t.text.replace(/"/g,'""')}"`);
    downloadCSV('tasks.csv', [header, ...rows].join('\n'));
  });

  // ——— Fonctions internes ———

  function renderTask(t) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${escapeHtml(t.text)}</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1" title="Terminer">✔️</button>
        <button class="btn btn-sm btn-outline-danger"       title="Supprimer">❌</button>
      </div>
    `;
    const [btnDone, btnDel] = li.querySelectorAll('button');
    btnDone.onclick = () => moveToArchive(t.id, li);
    btnDel.onclick  = () => {
      if (!confirm('Supprimer définitivement ?')) return;
      tasks = tasks.filter(x => x.id !== t.id);
      saveAll();
      li.remove();
    };
    list.appendChild(li);
  }

  function renderArchived(t) {
    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-light d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span><s>${escapeHtml(t.text)}</s></span>
      <div>
        <button class="btn btn-sm btn-outline-primary me-1" title="Restaurer">↩️</button>
        <button class="btn btn-sm btn-outline-danger"       title="Supprimer">❌</button>
      </div>
    `;
    const [btnRestore, btnDel] = li.querySelectorAll('button');
    btnRestore.onclick = () => restoreFromArchive(t.id, li);
    btnDel.onclick     = () => {
      if (!confirm('Supprimer de l’archive ?')) return;
      archived = archived.filter(x => x.id !== t.id);
      saveAll();
      li.remove();
    };
    archiveList.appendChild(li);
  }

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
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('archivedTasks', JSON.stringify(archived));
  }

  function downloadCSV(filename, text) {
    const a = document.createElement('a');
    a.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}

/**
 * Pour le Dashboard : récupération et ajout rapides
 */
export function getTasks() {
  return JSON.parse(localStorage.getItem('tasks') || '[]');
}

export function saveTask(text) {
  const tasks = getTasks();
  tasks.push({ id: Date.now(), text });
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

