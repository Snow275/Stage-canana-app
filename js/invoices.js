// js/invoices.js
import {
  db,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc
} from "./firebase.js";

const invoicesCol = collection(db, "invoices");

export function subscribeInvoices(cb) {
  return onSnapshot(invoicesCol, snap => {
    const invs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(invs);
  });
}
export function addInvoice(data) {
  return addDoc(invoicesCol, { ...data, createdAt: Date.now() });
}
export function updateInvoice(id, updates) {
  return updateDoc(doc(db, "invoices", id), updates);
}
export function deleteInvoice(id) {
  return deleteDoc(doc(db, "invoices", id));
}

export function initInvoices() {
  const form  = document.getElementById('invoice-form');
  const dateI = document.getElementById('invoice-date');
  const amtI  = document.getElementById('invoice-amount');
  const list  = document.getElementById('invoice-list');

  subscribeInvoices(invs => {
    list.innerHTML = "";
    invs.forEach(renderInvoice);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const inv = { date: dateI.value, amount: parseFloat(amtI.value), paid: false };
    addInvoice(inv).then(() => form.reset());
  });

  function renderInvoice(inv) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${inv.date} – ${inv.amount.toFixed(2)}€ (${inv.paid?'Payée':'En attente'})</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1">${inv.paid?'🔄':'✔️'}</button>
        <button class="btn btn-sm btn-outline-danger">❌</button>
      </div>`;
    const [btnToggle, btnDel] = li.querySelectorAll('button');
    btnToggle.onclick = () => updateInvoice(inv.id, { paid: !inv.paid });
    btnDel.onclick    = () => deleteInvoice(inv.id);
    list.appendChild(li);
  }
}
