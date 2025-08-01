// js/dishes.js
import {
  db,
  collection,
  doc,
  onSnapshot,
  addDoc,
  deleteDoc
} from "./firebase.js";

const dishesCol = collection(db, "dishes");

export function subscribeDishes(cb) {
  return onSnapshot(dishesCol, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(list);
  });
}
export function addDish(data) {
  return addDoc(dishesCol, { ...data, createdAt: Date.now() });
}
export function deleteDish(id) {
  return deleteDoc(doc(db, "dishes", id));
}

export function initDishes() {
  const form   = document.getElementById('dish-form');
  const input  = document.getElementById('dish-input');
  const list   = document.getElementById('dish-list');
  const btnExp = document.getElementById('export-dishes');

  subscribeDishes(dishes => {
    list.innerHTML = "";
    dishes.forEach(renderDish);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    addDish({ text: txt }).then(() => input.value = "");
  });

  btnExp.addEventListener('click', () => {
    subscribeDishes(dishes => {
      if (!dishes.length) return alert('Aucun plat à exporter !');
      const header = 'id,plat';
      const rows   = dishes.map(d => `${d.id},"${d.text}"`);
      const csv    = [header, ...rows].join('\n');
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'dishes.csv';
      a.click();
    });
  });

  function renderDish(d) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `<span>${d.text}</span><button class="btn btn-sm btn-outline-danger">❌</button>`;
    li.querySelector('button').onclick = () => deleteDish(d.id);
    list.appendChild(li);
  }
}
