// js/budget.js
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

// data = { desc, amount, type }
export function addBudget(data) {
  return addDoc(budgetCol, { ...data, createdAt: Date.now() });
}

export function updateBudget(id, updates) {
  return updateDoc(doc(db, "budget", id), updates);
}

export function removeBudget(id) {
  return deleteDoc(doc(db, "budget", id));
}

/**
 * Module Finances – Budget
 */
export function initBudget() {
  console.log('⚙️ initBudget() démarré');

  const form  = document.getElementById('budget-form');
  const descI = document.getElementById('budget-desc');
  const amtI  = document.getElementById('budget-amount');
  const typeI = document.getElementById('budget-type');
  const list  = document.getElementById('budget-list');
  const canvas = document.getElementById('budget-chart');
  if (!form || !descI || !amtI || !typeI || !list || !canvas) {
    console.error('❌ Élément budget introuvable:', { form, descI, amtI, typeI, list, canvas });
    return;
  }
  const ctx = canvas.getContext('2d');

  // Charge les entrées existantes
  let entries = JSON.parse(localStorage.getItem('budget') || '[]');
  let editId  = null;

  // Initialise le graphique
  const chart = new Chart(ctx, {
    type: 'pie',
    data: getChartData(),
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });

  // Rendu initial
  entries.forEach(renderEntry);
  updateChart();

  // Gestion du formulaire
  form.addEventListener('submit', e => {
    e.preventDefault();
    const desc   = descI.value.trim();
    const amount = parseFloat(amtI.value);
    const type   = typeI.value;
    console.log('💰 Soumission budget', { desc, amount, type, editId });

    if (!desc || isNaN(amount)) {
      alert('Veuillez saisir une description et un montant valides.');
      return;
    }

    if (editId !== null) {
      // Modification
      const idx = entries.findIndex(x => x.id === editId);
      if (idx > -1) {
        entries[idx] = { id: editId, desc, amount, type };
      }
      editId = null;
      form.querySelector('button').textContent = 'Ajouter';
      // On remet la liste à zéro et on la re-render
      list.innerHTML = '';
      entries.forEach(renderEntry);
    } else {
      // Création
      const entry = { id: Date.now(), desc, amount, type };
      entries.push(entry);
      renderEntry(entry);
    }

    saveAll();
    updateChart();
    form.reset();
  });

  // FONCTIONS INTERNES

  function renderEntry(e) {
    console.log('🖊 renderEntry', e);
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${escapeHtml(e.desc)} : ${e.amount.toFixed(2)}€ (${e.type})</span>
      <div>
        <button class="btn btn-sm btn-outline-warning me-1" title="Modifier">✏️</button>
        <button class="btn btn-sm btn-outline-danger"  title="Supprimer">❌</button>
      </div>
    `;
    const [btnEdit, btnDel] = li.querySelectorAll('button');

    btnEdit.onclick = () => {
      editId      = e.id;
      descI.value = e.desc;
      amtI.value  = e.amount;
      typeI.value = e.type;
      form.querySelector('button').textContent = 'Modifier';
    };

    btnDel.onclick = () => {
      if (!confirm('Supprimer cette ligne ?')) return;
      entries = entries.filter(x => x.id !== e.id);
      li.remove();
      saveAll();
      updateChart();
      // Si on supprimait l’élément en cours d’édition, on réinitialise le form
      if (editId === e.id) {
        editId = null;
        form.reset();
        form.querySelector('button').textContent = 'Ajouter';
      }
    };

    list.appendChild(li);
  }

  function getChartData() {
    const sums = entries.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + e.amount;
      return acc;
    }, {});
    return {
      labels: Object.keys(sums),
      datasets: [{
        data: Object.values(sums),
        backgroundColor: ['#198754', '#dc3545']
      }]
    };
  }

  function updateChart() {
    console.log('📊 updateChart');
    chart.data = getChartData();
    chart.update();
  }

  function saveAll() {
    console.log('💾 saveAll budget', entries);
    localStorage.setItem('budget', JSON.stringify(entries));
  }

  function download(filename, text) {
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

// Helpers pour le dashboard
export function getEntries() {
  return JSON.parse(localStorage.getItem('budget') || '[]');
}
export function getBudgetData() {
  const data = getEntries().reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + e.amount;
    return acc;
  }, {});
  return {
    labels: Object.keys(data),
    datasets: [{ data: Object.values(data), backgroundColor: ['#dc3545','#198754'] }]
  };
}
export function addEntry(entry) {
  const arr = getEntries();
  arr.push({ id: Date.now(), ...entry });
  localStorage.setItem('budget', JSON.stringify(arr));
}
