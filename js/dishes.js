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

// 1) Abonnement temps réel
export function subscribeDishes(cb) {
  return onSnapshot(dishesCol, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(list);
  });
}

// 2) Ajout d’un plat
// data = { text }
export function addDish(data) {
  return addDoc(dishesCol, { ...data, createdAt: Date.now() });
}

// 3) Suppression d’un plat
export function removeDish(id) {
  return deleteDoc(doc(db, "dishes", id));
}

/**
 * Module "Liste de plats" (onglet Courses)
 */
export function initDishes() {
  const form = document.getElementById("dish-form");
  const input = document.getElementById("dish-input");
  const list = document.getElementById("dish-list");
  const btnExp = document.getElementById("export-dishes");

  // Affichage initial + mise à jour en temps réel
  let currentDishes = [];
  subscribeDishes(listFromFirestore => {
    currentDishes = listFromFirestore.sort((a,b) => b.createdAt - a.createdAt);
    renderAll();
  });

  // Soumission du formulaire
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    await addDish({ text });
    input.value = "";
  });

  // Export CSV
  btnExp.addEventListener("click", () => {
    if (!currentDishes.length) return alert("Aucun plat à exporter !");
    const header = "id,plat";
    const rows = currentDishes.map(d => `${d.id},"${d.text.replace(/"/g,'""')}"`);
    downloadCSV("dishes.csv", [header, ...rows].join("\n"));
  });

  // Rouillette de rendu
  function renderAll() {
    list.innerHTML = "";
    currentDishes.forEach(renderDish);
  }

  function renderDish(d) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <span>${escapeHtml(d.text)}</span>
      <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
    `;
    li.querySelector("button").onclick = async () => {
      if (!confirm(`Supprimer "${d.text}" ?`)) return;
      await removeDish(d.id);
    };
    list.appendChild(li);
  }

  // Téléchargement CSV
  function downloadCSV(filename, text) {
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(text);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Sécurité XSS
  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
}
