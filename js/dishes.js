// js/dishes.js
// ================= Backendless config =================
const BL_APP_ID   = '948A3DAD-06F1-4F45-BECA-A039688312DD';
const BL_REST_KEY = '8C69AAC6-204C-48CE-A60B-137706E8E183';
const BL_API_URL  = 'https://api.backendless.com';
const BL_TABLE    = 'Dishes';

// ================= Helpers (local/UI) =================
function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
function saveAll(dishes) {
  localStorage.setItem('dishes', JSON.stringify(dishes));
}

// ================= Backendless REST ===================
async function blCreateDish(d) {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ text: d.text, localId: d.id })
  });
  if (!r.ok) throw new Error('Erreur création Backendless');
  return r.json(); // {objectId, ...}
}
async function blDeleteDish(objectId) {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}/${objectId}`;
  await fetch(url, { method: 'DELETE' });
}
async function blListDishes() {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}?sortBy=created%20desc`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Erreur lecture Backendless');
  return r.json(); // [{objectId, text, localId?}, ...]
}

// ==================== INIT ===========================
function initDishes() {
  const form   = document.getElementById('dish-form');
  const input  = document.getElementById('dish-input');
  const list   = document.getElementById('dish-list');
  const btnExp = document.getElementById('export-dishes');
  if (!form || !input || !list || !btnExp) return;

  // 1) Charge local
  let dishes = JSON.parse(localStorage.getItem('dishes') || '[]');

  // 2) Rendu initial
  list.innerHTML = '';
  dishes.forEach(d => renderDish(d));

  // 3) Ajout d’un plat
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;

    const d = { id: Date.now(), text: txt };
    dishes.push(d);
    saveAll(dishes);
    renderDish(d);
    input.value = '';

    // Sync Backendless (optionnel, non bloquant)
    if (navigator.onLine) {
      blCreateDish(d).then(obj => {
        d.objectId = obj.objectId; // mémorise l’objectId
        saveAll(dishes);
      }).catch(err => console.warn('BL create KO', err));
    }
  });

  // 4) Export CSV (local)
  btnExp.addEventListener('click', () => {
    if (!dishes.length) return alert('Aucun plat à exporter !');
    const header = 'id,plat';
    const rows = dishes.map(d => `${d.objectId || d.id},"${(d.text || '').replace(/"/g,'""')}"`);
    downloadCSV('dishes.csv', [header, ...rows].join('\n'));
  });

  // 5) Sync initial (merge doux depuis Backendless)
  if (navigator.onLine) {
    blListDishes().then(remote => {
      let changed = false;
      remote.forEach(r => {
        if (!dishes.find(x => x.objectId === r.objectId)) {
          const item = { id: r.localId || Date.now(), text: r.text || '', objectId: r.objectId };
          dishes.push(item);
          renderDish(item);
          changed = true;
        }
      });
      if (changed) saveAll(dishes);
    }).catch(err => console.warn('BL list KO', err));
  }

  // ===== Rendu d’un item + suppression =====
  function renderDish(d) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${escapeHtml(d.text)}</span>
      <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
    `;
    li.querySelector('button').onclick = () => {
      if (!confirm(`Supprimer "${d.text}" ?`)) return;
      dishes = dishes.filter(x => x.id !== d.id);
      saveAll(dishes);
      li.remove();

      // suppression serveur si on a un objectId
      if (d.objectId && navigator.onLine) {
        blDeleteDish(d.objectId).catch(err => console.warn('BL delete KO', err));
      }
    };
    list.appendChild(li);
  }

  // ===== util export =====
  function downloadCSV(filename, text) {
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// Expose global (car inclus via <script src="js/dishes.js"></script>)
window.initDishes = initDishes;
