// js/courses.js
// js/courses.js
import { gun } from './gundb.js';

const col = gun.get('courses');

export function subscribeCourses(cb) {
  col.map().on((data, id) => {
    col.once(all => {
      const arr = Object.entries(all || {})
        .filter(([k,v]) => v && !v.deleted)
        .map(([k,v]) => ({ id: k, ...v }));
      cb(arr);
    });
  });
}

export function addCourse(text) {
  return col.set({ text, done: false, createdAt: Date.now() });
}

export function toggleCourse(id, done) {
  return col.get(id).put({ done });
}

export function removeCourse(id) {
  return col.get(id).put({ deleted: true });
}

/**
 * Module Courses / Packing List
 */
export function initCourses() {
  console.log('⚙️ initCourses() démarré');

  const form   = document.getElementById('course-form');
  const input  = document.getElementById('course-input');
  const list   = document.getElementById('course-list');
  const btnExp = document.getElementById('export-courses');

  console.log('→ form ? ', form, 'input ?', input, 'list ?', list, 'btnExp ?', btnExp);
  if (!form || !input || !list || !btnExp) {
    console.error('❌ Un élément Courses est introuvable !');
    return;
  }

  let items = JSON.parse(localStorage.getItem('courses') || '[]');
  console.log('→ items chargés', items);
  items.forEach(renderItem);

  // Gestion du formulaire
  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    console.log('📥 Soumission Courses, texte =', text);
    if (!text) return;
    const it = { id: Date.now(), text, done: false };
    items.push(it);
    saveAll();
    renderItem(it);
    input.value = '';
  });

  // Export CSV
  btnExp.addEventListener('click', () => {
    console.log('📤 export Courses');
    if (!items.length) return alert('Rien à exporter');
    const header = 'id,texte,fait';
    const rows   = items.map(i => `${i.id},"${i.text.replace(/"/g,'""')}",${i.done}`);
    downloadCSV('courses.csv', [header, ...rows].join('\n'));
  });

  // Rendu d’un item
  function renderItem(i) {
    console.log('🖊 renderItem', i);
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    if (i.done) li.classList.add('checked');
    li.innerHTML = `
      <span>${escapeHtml(i.text)}</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1" title="Toggle">✓</button>
        <button class="btn btn-sm btn-outline-danger"       title="Delete">❌</button>
      </div>
    `;
    const [btnDone, btnDel] = li.querySelectorAll('button');

    btnDone.onclick = () => {
      console.log('✅ toggle done', i.id);
      i.done = !i.done;
      saveAll();
      li.classList.toggle('checked');
    };

    btnDel.onclick = () => {
      console.log('🗑 delete item', i.id);
      items = items.filter(x => x.id !== i.id);
      saveAll();
      li.remove();
    };

    list.appendChild(li);
  }

  function saveAll() {
    console.log('💾 saveAll Courses', items);
    localStorage.setItem('courses', JSON.stringify(items));
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
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
}

