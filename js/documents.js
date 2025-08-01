// js/documents.js
import {
  db,
  collection,
  doc,
  onSnapshot,
  addDoc,
  deleteDoc
} from "./firebase.js";

const docsCol = collection(db, "documents");

// 1) Abonnement temps réel aux documents
export function subscribeDocuments(cb) {
  return onSnapshot(docsCol, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(docs);
  });
}

// 2) Ajouter un document
// data = { name, url } (url = URL du fichier uploadé)
export function addDocument(data) {
  return addDoc(docsCol, { ...data, createdAt: Date.now() });
}

// 3) Supprimer un document
export function removeDocument(id) {
  return deleteDoc(doc(db, "documents", id));
}

/**
 * Module Documents (téléchargement, affichage, gestion)
 */
export function initDocuments() {
  const upload = document.getElementById("doc-upload");
  const list = document.getElementById("doc-list");

  // 4) Chargement initial + mise à jour en temps réel
  let currentDocs = [];
  subscribeDocuments(docsFromFirestore => {
    currentDocs = docsFromFirestore;
    renderAll();
  });

  // 5) Écouteur pour ajouter un fichier (document)
  upload.addEventListener("change", e => {
    for (const file of e.target.files) {
      const reader = new FileReader();
      reader.onload = async () => {
        const doc = {
          name: file.name,
          url: reader.result
        };
        await addDocument(doc); // Ajouter à Firestore
      };
      reader.readAsDataURL(file);
    }
    upload.value = ""; // Réinitialiser l'input
  });

  // 6) Rendu de tous les documents
  function renderAll() {
    list.innerHTML = "";
    currentDocs.forEach(renderDoc);
  }

  // 7) Rendu d'un document
  function renderDoc(doc) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <a href="${doc.url}" download="${doc.name}" class="flex-grow-1 text-truncate">
        ${escapeHtml(doc.name)}
      </a>
      <div class="btn-group btn-group-sm ms-3">
        <button class="btn btn-outline-primary" title="Renommer">✏️</button>
        <button class="btn btn-outline-danger" title="Supprimer">❌</button>
      </div>
    `;

    // 8) Renommer le document
    li.querySelector('[title="Renommer"]').onclick = () => {
      const nouv = prompt("Nouveau nom du document :", doc.name);
      if (nouv && nouv.trim()) {
        doc.name = nouv.trim();
        // Mise à jour Firestore
        updateDocument(doc.id, { name: doc.name });
        // Mise à jour du lien dans l’UI
        const a = li.querySelector("a");
        a.textContent = doc.name;
        a.setAttribute("download", doc.name);
      }
    };

    // 9) Supprimer le document
    li.querySelector('[title="Supprimer"]').onclick = () => {
      if (!confirm(`Supprimer "${doc.name}" ?`)) return;
      removeDocument(doc.id); // Supprimer de Firestore
      li.remove(); // Retirer de l'UI
    };

    list.appendChild(li);
  }

  // 10) Fonction de mise à jour dans Firestore
  function updateDocument(id, updates) {
    const docRef = doc(db, "documents", id);
    return updateDoc(docRef, updates);
  }

  // 11) Échappement des caractères HTML pour éviter les attaques XSS
  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
}
