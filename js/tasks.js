// js/tasks.js

import {
  db,
  collection,
  doc,
  onSnapshot,
  addDoc,
  deleteDoc
} from "./firebase.js";

const tasksCol = collection(db, "tasks");

/**
 * Écoute en temps réel des tâches depuis Firestore
 * @param {Function} callback — reçoit un tableau de tâches { id, text, createdAt }
 */
export function subscribeTasks(callback) {
  return onSnapshot(tasksCol, snapshot => {
    const tasks = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.createdAt - a.createdAt);
    callback(tasks);
  });
}

/**
 * Ajoute une tâche dans Firestore
 * @param {string} text — le texte de la tâche
 * @returns {Promise}
 */
export function addTask(text) {
  return addDoc(tasksCol, {
    text,
    createdAt: Date.now()
  });
}

/**
 * Supprime une tâche par son ID dans Firestore
 * @param {string} id
 * @returns {Promise}
 */
export function removeTask(id) {
  return deleteDoc(doc(db, "tasks", id));
}

/**
 * Module Tâches & To-Do en local (fallback / historique)
 */
export function initTasks() {
  const form = document.getElementById("task-form");
  const input = document.getElementById("task-input");
  const list = document.getElementById("task-list");
  const archiveList = document.getElementById("archived-list");
  const btnExp = document.getElementById("export-tasks");

  let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
  let archived = JSON.parse(localStorage.getItem("archivedTasks") || "[]");

  // Affichage initial en local
  tasks.forEach(renderTask);
  archived.forEach(renderArchived);

  // Soumission du formulaire (local)
  form.addEventListener("submit", e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    const t = { id: Date.now(), text: txt };
    tasks.push(t);
    saveLocal();
    renderTask(t);
    input.value = "";
  });

  // Export CSV
  btnExp.addEventListener("click", () => {
    if (!tasks.length) return alert("Aucune tâche à exporter !");
    const header = "id,texte";
    const rows = tasks.map(t => `${t.id},"${t.text.replace(/"/g, '""')}"`);
    downloadCSV("tasks.csv", [header, ...rows].join("\n"));
  });

  // ─── Fonctions internes ───

  function renderTask(t) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <span>${escapeHtml(t.text)}</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1" title="Terminer">✔️</button>
        <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
      </div>
    `;
    const [btnDone, btnDel] = li.querySelectorAll("button");
    btnDone.onclick = () => moveToArchive(t.id, li);
    btnDel.onclick = () => {
      if (!confirm("Supprimer définitivement ?")) return;
      tasks = tasks.filter(x => x.id !== t.id);
      saveLocal();
      li.remove();
    };
    list.appendChild(li);
  }

  function renderArchived(t) {
    const li = document.createElement("li");
    li.className = "list-group-item list-group-item-light d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <span><s>${escapeHtml(t.text)}</s></span>
      <div>
        <button class="btn btn-sm btn-outline-primary me-1" title="Restaurer">↩️</button>
        <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
      </div>
    `;
    const [btnRestore, btnDel] = li.querySelectorAll("button");
    btnRestore.onclick = () => restoreFromArchive(t.id, li);
    btnDel.onclick = () => {
      if (!confirm("Supprimer de l’archive ?")) return;
      archived = archived.filter(x => x.id !== t.id);
      saveLocal();
      li.remove();
    };
    archiveList.appendChild(li);
  }

  function moveToArchive(id, li) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const [t] = tasks.splice(idx, 1);
    archived.push(t);
    saveLocal();
    li.remove();
    renderArchived(t);
  }

  function restoreFromArchive(id, li) {
    const idx = archived.findIndex(t => t.id === id);
    if (idx === -1) return;
    const [t] = archived.splice(idx, 1);
    tasks.push(t);
    saveLocal();
    li.remove();
    renderTask(t);
  }

  function saveLocal() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    localStorage.setItem("archivedTasks", JSON.stringify(archived));
  }

  function downloadCSV(filename, text) {
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(text);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
}

/**
 * Pour le Dashboard : récupère le tableau local des tâches actives
 */
export function getTasks() {
  return JSON.parse(localStorage.getItem("tasks") || "[]");
}

/**
 * Pour le Dashboard : ajout rapide en local
 */
export function saveTask(text) {
  const tasks = getTasks();
  tasks.push({ id: Date.now(), text });
  localStorage.setItem("tasks", JSON.stringify(tasks));
}
