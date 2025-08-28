// js/tasks.js
function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export function initTasks() {
  const form   = document.getElementById('task-form');
  const input  = document.getElementById('task-input');
  const list   = document.getElementById('task-list');
  const archive= document.getElementById('archived-list');
  if (!form || !input || !list) return;

  let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  let archived = JSON.parse(localStorage.getItem('archivedTasks') || '[]');

  const saveAll = () => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('archivedTasks', JSON.stringify(archived));
  };

  const render = () => {
    list.innerHTML = '';
    archive.innerHTML = '';
    tasks.forEach(t => addToList(list, t, false));
    archived.forEach(t => addToList(archive, t, true));
  };

  function addToList(ul, task, isArchived) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${escapeHtml(task.text)}</span>
      ${isArchived ? '' : `
        <button class="btn btn-sm btn-outline-success me-2">✔️</button>
        <button class="btn btn-sm btn-outline-danger">❌</button>
      `}
    `;
    if (!isArchived) {
      li.querySelector('.btn-outline-success').onclick = () => {
        tasks = tasks.filter(x => x !== task);
        archived.push(task);
        saveAll(); render();
      };
      li.querySelector('.btn-outline-danger').onclick = () => {
        if (!confirm("Supprimer ?")) return;
        tasks = tasks.filter(x => x !== task);
        saveAll(); render();
      };
    }
    ul.appendChild(li);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    const t = { id: Date.now(), text: txt };
    tasks.push(t);
    saveAll(); render();
    input.value = '';
  });

  render();
}
window.initTasks = initTasks;
