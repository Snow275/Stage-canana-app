// js/dishes.js
// js/dishes.js
import {
  db,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc
} from "./firebase.js";

const dishesCol = collection(db, "dishes");

export function subscribeDishes(cb) {
  return onSnapshot(dishesCol, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(list);
  });
}

// data = { name }
export function addDish(data) {
  return addDoc(dishesCol, { ...data, createdAt: Date.now() });
}

export function updateDish(id, updates) {
  return updateDoc(doc(db, "dishes", id), updates);
}

export function removeDish(id) {
  return deleteDoc(doc(db, "dishes", id));
}


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
    };
    list.appendChild(li);
  }

  function saveAll() {
    localStorage.setItem('dishes', JSON.stringify(dishes));
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
