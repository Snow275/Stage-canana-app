// js/dishes.js
// Backendless config
const BL_APP_ID   = '948A3DAD-06F1-4F45-BECA-A039688312DD';
const BL_REST_KEY = '8C69AAC6-204C-48CE-A60B-137706E8E183';
const BL_API_URL  = 'https://api.backendless.com';
const BL_TABLE    = 'Dishes';

export function initDishes() {


const form   = document.getElementById('dish-form');


const input  = document.getElementById('dish-input');


const list   = document.getElementById('dish-list');


const btnExp = document.getElementById('export-dishes');


// récupère la liste ou initialise


let dishes = JSON.parse(localStorage.getItem('dishes') || '[]');


// affichage initial


dishes.forEach(renderDish);


// ajout d’un plat


form.addEventListener('submit', e => {


e.preventDefault();

const txt = input.value.trim();

if (!txt) return;

const d = { id: Date.now(), text: txt };

dishes.push(d);

saveAll();

renderDish(d);

input.value = '';



});


// export CSV


btnExp.addEventListener('click', () => {


if (!dishes.length) return alert('Aucun plat à exporter !');

const header = 'id,plat';

const rows = dishes.map(d => `${d.id},"${d.text.replace(/"/g,'""')}"`);

downloadCSV('dishes.csv', [header, ...rows].join('\n'));



});


// affiche un plat dans la liste


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

  saveAll();

  li.remove();

  if (navigator.onLine) {
  blListDishes().then(remote => {
    remote.forEach(r => {
      if (!dishes.find(x => x.objectId === r.objectId)) {
        const item = { id: r.localId || Date.now(), text: r.text, objectId: r.objectId };
        dishes.push(item);
        renderDish(item);
      }
    });
    saveAll();
  }).catch(err => console.warn("BL list KO", err));
  }

};

// Après renderDish(d);
if (navigator.onLine) {
  blCreateDish(d).then(obj => {
    // stocke l'objectId renvoyé par Backendless
    d.objectId = obj.objectId;
    saveAll();
  }).catch(err => console.warn("BL create KO", err));
}
  
list.appendChild(li);



}


function saveAll() {


localStorage.setItem('dishes', JSON.stringify(dishes));



}

  if (d.objectId && navigator.onLine) {
  blDeleteDish(d.objectId).catch(err => console.warn("BL delete KO", err));
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

async function blCreateDish(d) {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ text: d.text, localId: d.id })
  });
  if (!r.ok) throw new Error('Erreur création Backendless');
  return r.json();
}

async function blDeleteDish(objectId) {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}/${objectId}`;
  await fetch(url, { method: 'DELETE' });
}

async function blListDishes() {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}?sortBy=created%20desc`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Erreur lecture Backendless');
  return r.json();
}
