// js/dishes.js  — Dishes avec sync Backendless + fallback local (offline)

// ⛳ RENSEIGNE TES CLÉS ↓↓↓
const BL_APP_ID     = '948A3DAD-06F1-4F45-BECA-A039688312DD';
const BL_REST_KEY   = '8C69AAC6-204C-48CE-A60B-137706E8E183';
const BL_API_URL    = 'https://api.backendless.com';
const BL_TABLE      = 'Dishes';               // Table à créer côté Backendless
const PAGE_SIZE     = 200;

// LocalStorage key
const LS_KEY = 'dishes';

// Petite aide : en prod, garde un polling raisonnable
const POLL_MS = 6000;

// Headers communs pour Backendless
const jsonHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// ===== API REST Backendless ==================================================
async function blListDishes() {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}?pageSize=${PAGE_SIZE}&sortBy=created%20desc`;
  const r = await fetch(url, { headers: jsonHeaders });
  if (!r.ok) throw new Error('BL list');
  return r.json();
}

async function blCreateDish(payload) {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error('BL create');
  return r.json(); // renvoie l'objet avec objectId
}

async function blDeleteDish(objectId) {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}/${encodeURIComponent(objectId)}`;
  const r = await fetch(url, { method: 'DELETE', headers: jsonHeaders });
  if (!r.ok) throw new Error('BL delete');
  return true;
}

// ===== Local helpers =========================================================
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}
function saveLocal(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
}
function uid() { return 'loc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }

// ===== UI / Logic ============================================================
function renderOne(liContainer, dish, onDelete) {
  const li = document.createElement('li');
  li.className = 'list-group-item d-flex justify-content-between align-items-center';
  li.dataset.localId  = dish.localId;
  if (dish.objectId) li.dataset.objectId = dish.objectId;

  li.innerHTML = `
    <span>${escapeHtml(dish.text)}</span>
    <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
  `;

  const btnDel = li.querySelector('button');
  btnDel.onclick = () => onDelete(dish, li);

  liContainer.appendChild(li);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ===== Public init ===========================================================
function initDishes() {
  const form   = document.getElementById('dish-form');
  const input  = document.getElementById('dish-input');
  const list   = document.getElementById('dish-list');
  const btnExp = document.getElementById('export-dishes');

  if (!form || !input || !list || !btnExp) return;

  // État local en mémoire
  let dishes = loadLocal(); // [{ localId, objectId?, text }]
  list.innerHTML = '';
  dishes.forEach(d => renderOne(list, d, handleDelete));

  // 1) Ajout
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;

    // Ajout immédiat local (optimistic UI)
    const dish = { localId: uid(), text: txt };
    dishes.unshift(dish);
    saveLocal(dishes);
    renderTop(dish);

    input.value = '';

    // Sync serveur si en ligne
    if (navigator.onLine) {
      try {
        const created = await blCreateDish({ text: dish.text, localId: dish.localId });
        // Met à jour objectId dans le local
        const idx = dishes.findIndex(x => x.localId === dish.localId);
        if (idx !== -1) {
          dishes[idx].objectId = created.objectId;
          saveLocal(dishes);
          // marque le li avec objectId
          const li = list.querySelector(`li[data-local-id="${dish.localId}"]`);
          if (li) li.dataset.objectId = created.objectId;
        }
      } catch (err) {
        console.warn('Création BL échouée (offline ?):', err);
      }
    }
  });

  function renderTop(d) {
    // insère en haut de liste
    const tmp = document.createElement('ul');
    renderOne(tmp, d, handleDelete);
    const newLi = tmp.firstElementChild;
    if (list.firstChild) list.insertBefore(newLi, list.firstChild);
    else list.appendChild(newLi);
  }

  // 2) Suppression
  async function handleDelete(dish, li) {
    if (!confirm(`Supprimer "${dish.text}" ?`)) return;

    // UI + local
    dishes = dishes.filter(x => x.localId !== dish.localId);
    saveLocal(dishes);
    li.remove();

    // Serveur si on a un objectId
    if (dish.objectId && navigator.onLine) {
      try { await blDeleteDish(dish.objectId); }
      catch (err) { console.warn('Suppression BL échouée:', err); }
    }
  }

  // 3) Export CSV
  btnExp.addEventListener('click', () => {
    if (!dishes.length) return alert('Aucun plat à exporter !');
    const header = 'id,text';
    const rows = dishes.map(d => `${(d.objectId || d.localId)},"${(d.text||'').replace(/"/g,'""')}"`);
    const csv = [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'dishes.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });

  // 4) Premier sync depuis le serveur (merge)
  async function initialSync() {
    if (!navigator.onLine) return;
    try {
      const remote = await blListDishes(); // [{objectId,text,localId?...}]
      // Merge simple : prends tous les remote non présents localement par objectId/localId
      const byKey = new Map(dishes.map(d => [d.objectId || d.localId, d]));
      remote.forEach(r => {
        const key = r.objectId || r.localId;
        if (!byKey.has(key)) {
          const item = { localId: r.localId || uid(), objectId: r.objectId, text: r.text || '' };
          dishes.push(item);
          renderTop(item);
        }
      });
      saveLocal(dishes);
    } catch (e) {
      console.warn('Initial BL sync KO:', e);
    }
  }
  initialSync();

  // 5) Petit polling pour rafraîchir si quelqu’un d’autre ajoute/supprime
  let pollTimer = null;
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        const remote = await blListDishes();
        // Reconstruit la liste à partir du remote pour rester simple
        const next = remote.map(r => ({ localId: r.localId || uid(), objectId: r.objectId, text: r.text || '' }));
        // Si changement, rerender
        const localSig = JSON.stringify(dishes.map(d => [d.objectId||d.localId, d.text]));
        const remoteSig = JSON.stringify(next.map(d => [d.objectId||d.localId, d.text]));
        if (localSig !== remoteSig) {
          dishes = next;
          saveLocal(dishes);
          list.innerHTML = '';
          dishes.forEach(d => renderOne(list, d, handleDelete));
        }
      } catch (e) {
        // silencieux
      }
    }, POLL_MS);
  }
  function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  // Démarre/stop le polling selon l’état réseau
  startPolling();
  window.addEventListener('online',  () => { initialSync(); startPolling(); });
  window.addEventListener('offline', () => { stopPolling(); });
}

// Expose en global si tu inclus le script en <script src="js/dishes.js"></script>
window.initDishes = initDishes;



