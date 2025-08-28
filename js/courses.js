// js/courses.js

/**
* Module Courses / Packing List
*/

// ================================
// BACKENDLESS >>> CONFIG
const BL_APP_ID = "948A3DAD-06F1-4F45-BECA-A039688312DD"; // ton APP ID Backendless
const BL_REST_KEY = "8C69AAC6-204C-48CE-A60B-137706E8E183"; // ton REST API KEY Backendless
const BL_BASE = (BL_APP_ID && BL_REST_KEY)
  ? `https://api.backendless.com/${BL_APP_ID}/${BL_REST_KEY}/data/Courses`
  : null;
const BL_ON = !!BL_BASE;

// --- Notifications helper (discret, ne casse rien si non supporté) ---
async function notify(title, body) {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'granted') return; // on ne spam pas

    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.showNotification) {
      await reg.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        silent: false
      });
    } else {
      // fallback très simple
      new Notification(title, { body });
    }
  } catch { /* no-op */ }
}

async function blEnsureOK(res) {
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`Backendless HTTP ${res.status}: ${txt}`);
  }
}
async function blList() {
  const res = await fetch(`${BL_BASE}?sortBy=created%20desc`);
  await blEnsureOK(res);
  return res.json();
}
async function blCreate(text) {
  const res = await fetch(BL_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, done: false })
  });
  await blEnsureOK(res);
  return res.json();
}
async function blToggle(objectId, done) {
  const res = await fetch(`${BL_BASE}/${objectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done })
  });
  await blEnsureOK(res);
  return res.json();
}
async function blRemove(objectId) {
  const res = await fetch(`${BL_BASE}/${objectId}`, { method: "DELETE" });
  await blEnsureOK(res);
  return true;
}
// BACKENDLESS <<<
// ================================

export function initCourses() {
  console.log('⚙️ initCourses() démarré');

  const form = document.getElementById('course-form');
  const input = document.getElementById('course-input');
  const list = document.getElementById('course-list');
  const btnExp = document.getElementById('export-courses');

  console.log('→ form ? ', form, 'input ?', input, 'list ?', list, 'btnExp ?', btnExp);
  if (!form || !input || !list || !btnExp) {
    console.error('❌ Un élément Courses est introuvable !');
    return;
  }

  // --------------------------
  // BACKENDLESS >>> état mémoire
  let items = [];
  // BACKENDLESS <<<

  // ---------- Rendu d’un item ----------
  function renderItem(i) {
    console.log('🖊 renderItem', i);
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    if (i.done) li.classList.add('checked');
    li.innerHTML = `
      <span>${escapeHtml(i.text)}</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1" title="Toggle">✓</button>
        <button class="btn btn-sm btn-outline-danger" title="Delete">❌</button>
      </div>
    `;
    const [btnDone, btnDel] = li.querySelectorAll('button');

    btnDone.onclick = async () => {
      console.log('✅ toggle done', i.id || i.objectId);
      if (BL_ON) {
        await blToggle(i.objectId, !i.done);
        await refresh();
      } else {
        i.done = !i.done;
        saveAll();
        li.classList.toggle('checked');
        notify('Nouvelle tâche ajouté', txt);
      }
    };

    btnDel.onclick = async () => {
      console.log('🗑 delete item', i.id || i.objectId);
      if (BL_ON) {
        await blRemove(i.objectId);
        await refresh();
      } else {
        items = items.filter(x => x.id !== i.id);
        saveAll();
        li.remove();
      }
    };

    list.appendChild(li);
  }

  function renderAll() {
    list.innerHTML = '';
    items.forEach(renderItem);
  }

  // ---------- Chargement ----------
  async function refresh() {
    if (BL_ON) {
      items = await blList();
    } else {
      items = JSON.parse(localStorage.getItem('courses') || '[]');
    }
    renderAll();
  }

  // ---------- Gestion du formulaire ----------
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = input.value.trim();
    console.log('📥 Soumission Courses, texte =', text);
    if (!text) return;

    if (BL_ON) {
      await blCreate(text);
      input.value = '';
      await refresh();
    } else {
      const it = { id: Date.now(), text, done: false };
      items.push(it);
      saveAll();
      renderItem(it);
      input.value = '';
    }
  });




  // ---------- Export CSV ----------
  btnExp.addEventListener('click', async () => {
    if (BL_ON && !items.length) await refresh();
    if (!items.length) return alert('Rien à exporter');
    const header = 'id_or_objectId,texte,fait';
    const rows = items.map(i =>
      `${i.objectId || i.id},"${i.text.replace(/"/g,'""')}",${i.done}`
    );
    downloadCSV('courses.csv', [header, ...rows].join('\n'));
  });

  function saveAll() {
    console.log('💾 saveAll Courses', items);
    if (!BL_ON) {
      localStorage.setItem('courses', JSON.stringify(items));
    }
  }

  function downloadCSV(filename, text) {
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text);
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

  // ---------- Go ----------
  refresh();
}

