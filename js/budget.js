// js/budget.js
import {
  db,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc
} from "./firebase.js";

const budgetCol = collection(db, "budget");

export function subscribeBudget(cb) {
  return onSnapshot(budgetCol, snap => {
    const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(entries);
  });
}
export function addBudget(data) {
  return addDoc(budgetCol, { ...data, createdAt: Date.now() });
}
export function updateBudget(id, updates) {
  return updateDoc(doc(db, "budget", id), updates);
}
export function deleteBudget(id) {
  return deleteDoc(doc(db, "budget", id));
}

/**
 * Module Budget – UI
 */
export function initBudget() {
  const form  = document.getElementById('budget-form');
  const descI = document.getElementById('budget-desc');
  const amtI  = document.getElementById('budget-amount');
  const typeI = document.getElementById('budget-type');
  const list  = document.getElementById('budget-list');
  const ctx   = document.getElementById('budget-chart').getContext('2d');

  let chart;
  subscribeBudget(entries => {
    list.innerHTML = "";
    entries.forEach(renderEntry);
    updateChart(entries);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const desc = descI.value.trim();
    const amount = parseFloat(amtI.value);
    const type = typeI.value;
    if (!desc || isNaN(amount)) return;
    addBudget({ desc, amount, type }).then(() => form.reset());
  });

  function renderEntry(e) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${e.desc} : ${e.amount.toFixed(2)}€ (${e.type})</span>
      <div>
        <button class="btn btn-sm btn-outline-warning me-1">✏️</button>
        <button class="btn btn-sm btn-outline-danger">❌</button>
      </div>`;
    const [btnEdit, btnDel] = li.querySelectorAll('button');
    btnEdit.onclick = () => {
      descI.value = e.desc;
      amtI.value  = e.amount;
      typeI.value = e.type;
      form.querySelector('button').textContent = 'Modifier';
      form.onsubmit = ev => {
        ev.preventDefault();
        updateBudget(e.id, {
          desc: descI.value,
          amount: parseFloat(amtI.value),
          type: typeI.value
        }).then(() => {
          form.reset();
          form.querySelector('button').textContent = 'Ajouter';
          form.onsubmit = null;
        });
      };
    };
    btnDel.onclick = () => deleteBudget(e.id);
    list.appendChild(li);
  }

  function updateChart(entries) {
    const sums = entries.reduce((a,e) => {
      a[e.type] = (a[e.type]||0) + e.amount;
      return a;
    }, {});
    const data = { labels: Object.keys(sums), datasets:[{ data: Object.values(sums), backgroundColor:['#dc3545','#198754'] }] };
    if (!chart) {
      chart = new Chart(ctx, { type: 'pie', data, options:{ maintainAspectRatio:false, plugins:{legend:{position:'bottom'}} } });
    } else {
      chart.data = data;
      chart.update();
    }
  }
}
