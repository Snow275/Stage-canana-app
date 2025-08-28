// js/courses.js
export function initCourses() {
  const form = document.getElementById('course-form');
  const input = document.getElementById('course-input');
  const list = document.getElementById('course-list');
  const btnExp = document.getElementById('export-courses');
  if (!form || !input || !list || !btnExp) return;

  let courses = JSON.parse(localStorage.getItem('courses') || '[]');

  function saveAll() {
    localStorage.setItem('courses', JSON.stringify(courses));
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderCourse(c) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${escapeHtml(c.text)}</span>
      <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
    `;
    li.querySelector('button').onclick = () => {
      if (!confirm(`Supprimer "${c.text}" ?`)) return;
      courses = courses.filter(x => x.id !== c.id);
      saveAll();
      li.remove();
    };
    list.appendChild(li);
  }

  // 🔔 helper notification (même que tasks)
  async function notify(title, body) {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
      if (Notification.permission !== 'granted') return;
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          silent: false
        });
      } else {
        new Notification(title, { body });
      }
    } catch {}
  }

  // affichage initial
  list.innerHTML = '';
  courses.forEach(renderCourse);

  // ajout d’un item
  form.addEventListener('submit', e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    const c = { id: Date.now(), text: txt };
    courses.push(c);
    saveAll();
    renderCourse(c);
    input.value = '';

    // 🔔 notification à l’ajout
    notify('Nouvel item ajouté', txt);
  });

  // export CSV
  btnExp.addEventListener('click', () => {
    if (!courses.length) return alert('Aucun item à exporter !');
    const header = 'id,item';
    const rows = courses.map(c => `${c.id},"${c.text.replace(/"/g,'""')}"`);
    const csv = [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'courses.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });
}
