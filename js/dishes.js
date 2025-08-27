 // js/dishes.js
// --- Backendless config ---
const BL_APP_ID   = '948A3DAD-06F1-4F45-BECA-A039688312DD';
const BL_REST_KEY = '8C69AAC6-204C-48CE-A60B-137706E8E183';
const BL_API_URL  = 'https://api.backendless.com';
const BL_TABLE    = 'Dishes';

// --- API Backendless ---
async function blListDishes() {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}?sortBy=created%20desc`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('Erreur lecture Backendless');
  return r.json(); // [{objectId, text, localId?}, ...]
}
async function blCreateDish(d) {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Accept: 'application/json' },
    body: JSON.stringify({ text: d.text, localId: d.id })
  });
  if (!r.ok) throw new Error('Erreur création Backendless');
  return r.json(); // {objectId, ...}
}
async function blDeleteDish(objectId) {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}/${encodeURIComponent(objectId)}`;
  const r = await fetch(url, { method: 'DELETE' });
  if (!r.ok) throw new Error('Erreur suppression Backendless');
}

// --- util ---
function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s; return div.innerHTML; }

// ========= UI principale (avec sync sans doublons) =========
export async function initDishes() {
  const form   = document.getElementById('dish-form');
  const input  = document.getElementById('dish-input');
  const list   = document.getElementById('dish-list');
  const btnExp = document.getElementById('export-dishes');
  if (!form || !input || !list || !btnExp) return;

  let dishes = JSON.parse(localStorage.getItem('dishes') || '[]');

  const saveAll = () => localStorage.setItem('dishes', JSON.stringify(dishes));

  const renderAll = arr => {
    list.innerHTML = '';
    arr.forEach(renderDish);
  };

  // Affichage d'un item
  function renderDish(d) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${escapeHtml(d.text)}</span>
      <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
    `;
    li.querySelector('button').onclick = async () => {
      if (!confirm(`Supprimer "${d.text}" ?`)) return;
      dishes = dishes.filter(x => x !== d);
      saveAll();
      li.remove();
      if (d.objectId && navigator.onLine) {
        try { await blDeleteDish(d.objectId); } catch (e) { console.warn('BL delete KO', e); }
      }
    };
    list.appendChild(li);
  }

  // === Chargement initial sans doublons ===
  if (navigator.onLine) {
    try {
      const remote = await blListDishes();
      // On remplace complètement par le serveur (pas de merge -> pas de doublons)
      dishes = remote.map(r => ({
        id: r.localId || Date.now() + Math.random(),
        text: r.text || '',
        objectId: r.objectId
      }));
      saveAll();
      renderAll(dishes);
    } catch (e) {
      console.warn('BL list KO, fallback local', e);
      renderAll(dishes);
    }
  } else {
    // Offline → on affiche le local
    renderAll(dishes);
  }

  // Ajout d’un plat
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;

    const d = { id: Date.now(), text: txt };
    dishes.unshift(d);
    saveAll();
    // Insère en haut
    list.insertAdjacentHTML('afterbegin', `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span>${escapeHtml(d.text)}</span>
        <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
      </li>
    `);
    const firstLi = list.firstElementChild;
    firstLi.querySelector('button').onclick = async () => {
      if (!confirm(`Supprimer "${d.text}" ?`)) return;
      dishes = dishes.filter(x => x !== d);
      saveAll();
      firstLi.remove();
      if (d.objectId && navigator.onLine) {
        try { await blDeleteDish(d.objectId); } catch (e2) { console.warn('BL delete KO', e2); }
      }
    };

    input.value = '';

    // Sync serveur (mise à jour de l'objectId dans le local)
    if (navigator.onLine) {
      try {
        const obj = await blCreateDish(d);
        d.objectId = obj.objectId;
        saveAll();
      } catch (err) {
        console.warn('BL create KO', err);
      }
    }
  });

  // Export CSV (local)
  btnExp.addEventListener('click', () => {
    if (!dishes.length) return alert('Aucun plat à exporter !');
    const header = 'id,plat';
    const rows = dishes.map(d => `${d.id},"${(d.text || '').replace(/"/g,'""')}"`);
    const csv = [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'dishes.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });
 
window.initDishes = initDishes;






}








