// js/invoices.js
// js/invoices.js
import { gun } from './gundb.js';

const col = gun.get('invoices');

export function subscribeInvoices(cb) {
  col.map().on((data, id) => {
    col.once(all => {
      const arr = Object.entries(all || {})
        .filter(([k,v]) => v && !v.deleted)
        .map(([k,v]) => ({ id: k, ...v }));
      cb(arr);
    });
  });
}

export function addInvoice({ date, amount }) {
  return col.set({ date, amount, paid: false, createdAt: Date.now() });
}

export function toggleInvoice(id, paid) {
  return col.get(id).put({ paid });
}

export function removeInvoice(id) {
  return col.get(id).put({ deleted: true });
}


/**
 * Module Factures
 */
export function initInvoices() {
  console.log('⚙️ initInvoices() démarré');

  const form  = document.getElementById('invoice-form');
  const dateI = document.getElementById('invoice-date');
  const amtI  = document.getElementById('invoice-amount');
  const list  = document.getElementById('invoice-list');

  console.log('→ form ?', form, 'dateI ?', dateI, 'amtI ?', amtI, 'list ?', list);
  if (!form || !dateI || !amtI || !list) {
    console.error('❌ Un élément Invoices est introuvable !');
    return;
  }

  // Charge les factures existantes
  let invs = JSON.parse(localStorage.getItem('invoices') || '[]');
  console.log('→ invoices chargées', invs);
  invs.forEach(renderInvoice);

  // Soumission du formulaire
  form.addEventListener('submit', e => {
    e.preventDefault();
    const inv = {
      id:     Date.now(),
      date:   dateI.value,
      amount: parseFloat(amtI.value),
      paid:   false
    };
    console.log('📥 submit invoice', inv);
    if (!inv.date || isNaN(inv.amount)) {
      alert('Date et montant valides requis');
      return;
    }
    invs.push(inv);
    saveAll();
    renderInvoice(inv);
    form.reset();
  });

  // Affiche une facture
  function renderInvoice(inv) {
    console.log('🖊 renderInvoice', inv);
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${inv.date} – ${inv.amount.toFixed(2)}€ (${inv.paid ? 'Payée' : 'En attente'})</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1" title="TogglePaid">
          ${inv.paid ? '🔄' : '✔️'}
        </button>
        <button class="btn btn-sm btn-outline-danger" title="Delete">❌</button>
      </div>
    `;
    const [btnToggle, btnDel] = li.querySelectorAll('button');

    btnToggle.onclick = () => {
      inv.paid = !inv.paid;
      console.log('🔄 toggle invoice paid', inv.id, 'now paid=', inv.paid);
      saveAll();
      // Mise à jour du libellé
      btnToggle.textContent = inv.paid ? '🔄' : '✔️';
      li.querySelector('span').textContent =
        `${inv.date} – ${inv.amount.toFixed(2)}€ (${inv.paid ? 'Payée' : 'En attente'})`;
    };

    btnDel.onclick = () => {
      console.log('🗑 delete invoice', inv.id);
      if (!confirm(`Supprimer la facture du ${inv.date} ?`)) return;
      invs = invs.filter(x => x.id !== inv.id);
      saveAll();
      li.remove();
    };

    list.appendChild(li);
  }

  // Sauvegarde en localStorage
  function saveAll() {
    console.log('💾 saveAll invoices', invs);
    localStorage.setItem('invoices', JSON.stringify(invs));
  }
}

// Pour le Dashboard
export function getInvoices() {
  return JSON.parse(localStorage.getItem('invoices') || '[]');
}

