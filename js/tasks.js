// js/tasks.js
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { firebaseApp } from "./firebase.js"; // ton init Firebase
const db = getFirestore(firebaseApp);
const tasksCol = collection(db, "tasks");

export function initTasks() {
  const form        = document.getElementById('task-form');
  const input       = document.getElementById('task-input');
  const list        = document.getElementById('task-list');
  const archiveList = document.getElementById('archived-list');
  const btnExp      = document.getElementById('export-tasks');

  let archivedTasks = []; // on garde l’archive en local

  // 1) Écoute temps réel et rendu
  const q = query(tasksCol, orderBy("createdAt", "desc"));
  onSnapshot(q, snap => {
    list.innerHTML = '';
    snap.docs.forEach(d => renderTask({ id: d.id, ...d.data() }));
  });

  // 2) Ajout
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    await addDoc(tasksCol, { text: txt, createdAt: Date.now() });
    input.value = '';
  });

  // 3) Export CSV
  btnExp.addEventListener('click', () => {
    // on re-récupère snapshot synchrone pour exporter
    onSnapshot(q, snap => {
      if (snap.empty) return alert("Rien à exporter");
      const header = 'id,texte';
      const rows = snap.docs.map(d => `${d.id},"${d.data().text.replace(/"/g,'""')}"`);
      downloadCSV('tasks.csv', [header, ...rows].join('\n'));
    }, { includeMetadataChanges: false });
  });

  // --- Fonctions internes ---
  function renderTask(t) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span>${escapeHtml(t.text)}</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1" title="Terminer">✔️</button>
        <button class="btn btn-sm btn-outline-danger"       title="Supprimer">❌</button>
      </div>
    `;
    const [btnDone, btnDel] = li.querySelectorAll('button');

    btnDone.onclick = async () => {
      // on archive localement
      archivedTasks.push(t);
      li.remove();
      // Optionnel : tu peux stocker archiveTasks dans Firestore aussi
    };
    btnDel.onclick = async () => {
      if (!confirm('Supprimer définitivement ?')) return;
      await deleteDoc(doc(db, "tasks", t.id));
    };
    list.appendChild(li);
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
