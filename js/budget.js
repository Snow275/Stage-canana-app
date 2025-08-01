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
import Chart from "chart.js/auto";

// Référence à la collection Firestore
const budgetCol = collection(db, "budget");

// 1) Abonnement temps réel
export function subscribeBudget(cb) {
  return onSnapshot(budgetCol, snap => {
    // transforme chaque doc en objet { id, ...data }
    const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // trie par date de création ascendante
    entries.sort((a,b) => a.createdAt - b.createdAt);
    cb(entries);
  });
}

// 2) CRUD
export function addBudget(data) {
  return addDoc(budgetCol, { ...data, createdAt: Date.now() });
}

export function updateBudget(id, updates) {
  return updateDoc(doc(db, "budget", id), updates);
}

export function removeBudget(id) {
  return deleteDoc(doc(db, "budget", id));
}


// ----------------------
// Module Finances – Budget
// ----------------------
export function initBudget() {
  const form   = document.getElementById("budget-form");
  const descI  = document.getElementById("budget-desc");
  const amtI   = document.getElementById("budget-amount");
  const typeI  = document.getElementById("budget-type");
  const list   = document.getElementById("budget-list");
  const canvas = document.getElementById("budget-chart");

  if (!form || !descI || !amtI || !typeI || !list || !canvas) {
    console.error("❌ initBudget: éléments introuvables");
    return;
  }
  const ctx = canvas.getContext("2d");
  let editId = null;

  // Initialisation du graphique vide
  const chart = new Chart(ctx, {
    type: "pie",
    data: { labels: [], datasets: [{ data: [], backgroundColor: ["#dc3545", "#198754"] }] },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });

  // Fonction pour mettre à jour le graphique à partir d'un tableau d'entries
  function updateChart(entries) {
    const sums = entries.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + e.amount;
      return acc;
    }, {});
    chart.data.labels = Object.keys(sums);
    chart.data.datasets[0].data = Object.values(sums);
    chart.update();
  }

  // Affiche la liste et met à jour le graphique
  subscribeBudget(entries => {
    list.innerHTML = "";
    entries.forEach(renderEntry);
    updateChart(entries);
  });

  // Gère le submit du formulaire (ajout ou modification)
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const desc   = descI.value.trim();
    const amount = parseFloat(amtI.value);
    const type   = typeI.value;
    if (!desc || isNaN(amount)) {
      return alert("Veuillez saisir description ET montant valides.");
    }

    if (editId) {
      await updateBudget(editId, { desc, amount, type });
      editId = null;
      form.querySelector("button").textContent = "Ajouter";
    } else {
      await addBudget({ desc, amount, type });
    }
    form.reset();
  });

  // Crée un <li> pour une entrée et ses boutons
  function renderEntry(e) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <span>${escapeHtml(e.desc)} : ${e.amount.toFixed(2)}€ (${e.type})</span>
      <div>
        <button class="btn btn-sm btn-outline-warning me-1" title="Modifier">✏️</button>
        <button class="btn btn-sm btn-outline-danger"       title="Supprimer">❌</button>
      </div>
    `;
    const [btnEdit, btnDel] = li.querySelectorAll("button");

    btnEdit.onclick = () => {
      editId = e.id;
      descI.value = e.desc;
      amtI.value  = e.amount;
      typeI.value = e.type;
      form.querySelector("button").textContent = "Modifier";
    };

    btnDel.onclick = async () => {
      if (confirm("Supprimer cette entrée ?")) {
        await removeBudget(e.id);
      }
    };

    list.appendChild(li);
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
}
