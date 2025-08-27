// js/dishes.js — localStorage + sync Backendless (optionnel, sans rien casser)

// 👉 Renseigne tes clés Backendless :
const BL_APP_ID   = '948A3DAD-06F1-4F45-BECA-A039688312DD';
const BL_REST_KEY = '8C69AAC6-204C-48CE-A60B-137706E8E183';
const BL_API_URL  = 'https://api.backendless.com';
const BL_TABLE    = 'Dishes';
const PAGE_SIZE   = 200;

// Headers REST
const JSON_HEADERS_GET  = { Accept: 'application/json' };
const JSON_HEADERS_JSON = { 'Content-Type': 'application/json', Accept: 'application/json' };

// ——— REST helpers (ne jettent pas d’erreur non-catchée) ———
async function blListDishes() {
  try {
    const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}?pageSize=${PAGE_SIZE}&sortBy=created%20desc`;
    const r = await fetch(url, { headers: JSON_HEADERS_GET });
    if (!r.ok) throw new Error(await r.text());
    return await r.json(); // [{objectId,text,localId?}, ...]
  } catch (e) {
    console.warn('BL list KO:', e);
    return null; // on signale l’échec mais on ne casse pas l’UI
  }
}
async function blCreateDish(payload) {
  try {
    const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}`;
    const r = await fetch(url, { method: 'POST', headers: JSON_HEADERS_JSON, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(await r.text());
    return await r.json(); // {objectId, text, ...}
  } catch (e) {
    console.warn('BL create KO:', e);
    return null;
  }
}
async function blDeleteDish(objectId) {
  try {
    const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}/${encodeURIComponent(objectId)}`;
    const r = await fetch(url, { method: 'DELETE', headers: JSON_HEADERS_JSON });
    if (!r.ok) throw new Error(await r.text());
    return true;
  } catch (e) {
    console.warn('BL delete KO:', e);
    return false;
  }
}

// ——— Utilitaires UI/local ———
function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
function saveAll(dishes) {
  localStorage.setItem('dishes', JSON.stringify(dishes));
}
function uid() {
  return 'loc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

// ——— Rendu d’un item ———
function renderDish(list, d, onDelete) {
  const li = document.createElement('li');
  li.className = 'list-group-item d-flex justify-content-between align-items-center';
  li.dataset.id = d.id;                 // id local
  if (d.objectId) li.dataset.oid = d.objectId; // id Backendless si présent
  li.innerHTML = `
    <span>${escapeHtml(d.text)}</span>
    <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
  `;
  li.querySelector('button').onclick = () => onDelete(d, li);
  list.appendChild(li);
}

// ——— INIT PUBLIC ———
function initDishes() {
  const form   = document.getElementById('dish-form');
  const input  = document.getElementById('dish-input');
  const list   = document.getElementById('dish-list');
  const btnExp = document.getElementById('export-dishes');
  if (!form || !input || !list || !btnExp) return;

  // 1) Charge local
  let dishes = [];
  try { dishes = JSON.parse(localStorage.getItem('dishes') || '[]'); } catch { dishes = []; }

  // Rendu initial local
  list.innerHTML = '';
  dishes.forEach(d => renderDish(list, d, handleDelete));

  // 2) Ajout
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;

    // a) Ajoute local immédiatement (UI fluide)
    const d = { id: Date.now(), text: txt }; // id local
    dishes.push(d);
    saveAll(dishes);
    renderDish(list, d, handleDelete);
    input.value = '';

    // b) Tente la création côté Backendless (sans bloquer si ça échoue)
    const created = await blCreateDish({ text: d.text, localId: d.id });
    if (created && created.objectId) {
      // stocke objectId dans l’élément local correspondant
      const idx = dishes.findIndex(x => x.id === d.id);
      if (idx !== -1) {
        dishes[idx].objectId = created.objectId;
        saveAll(dishes);
        const li = list.querySelector(`li[data-id="${d.id}"]`);
        if (li) li.dataset.oid = created.objectId;
      }
    }
  });

  // 3) Suppression
  async function handleDelete(d, li) {
    if (!confirm(`Supprimer "${d.text}" ?`)) return;
    // local
    dishes = dishes.filter(x => x.id !== d.id);
    saveAll(dishes);
    li.remove();
    // backendless (best-effort)
    if (d.objectId) await blDeleteDish(d.objectId);
  }

  // 4) Export CSV (local)
  btnExp.addEventListener('click', () => {
    if (!dishes.length) return alert('Aucun plat à exporter !');
    const header = 'id,plat';
    const rows = dishes.map(d => `${(d.objectId || d.id)},"${(d.text || '').replace(/"/g, '""')}"`);
    const csv = [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'dishes.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });

  // 5) Premier sync depuis Backendless (merge → n’écrase pas le local)
  (async function initialSync() {
    const remote = await blListDishes();
    if (!remote) return; // si KO, on reste en local
    // Construire un index des items locaux par (objectId || local id)
    const known = new Set(dishes.map(x => x.objectId || x.id));
    let added = 0;
    remote.forEach(r => {
      const key = r.objectId || r.localId;
      if (!key || known.has(key)) return;
      const item = { id: r.localId || Date.now(), text: r.text || '', objectId: r.objectId };
      dishes.push(item);
      renderDish(list, item, handleDelete);
      known.add(key);
      added++;
    });
    if (added) saveAll(dishes);
  })();
}

// Expose global (car inclus en <script src="...">)
window.initDishes = initDishes;
