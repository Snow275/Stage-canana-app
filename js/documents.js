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

export function subscribeDocuments(cb) {
  return onSnapshot(docsCol, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(docs);
  });
}
export function addDocument(data) {
  return addDoc(docsCol, { ...data, createdAt: Date.now() });
}
export function deleteDocument(id) {
  return deleteDoc(doc(db, "documents", id));
}

export function initDocuments() {
  const upload = document.getElementById('doc-upload');
  const list   = document.getElementById('doc-list');

  subscribeDocuments(docs => {
    list.innerHTML = "";
    docs.forEach(renderDoc);
  });

  upload.addEventListener('change', e => {
    for (const file of e.target.files) {
      const reader = new FileReader();
      reader.onload = () => {
        addDocument({ name: file.name, url: reader.result });
      };
      reader.readAsDataURL(file);
    }
    upload.value = '';
  });

  function renderDoc(doc) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <a href="${doc.url}" download="${doc.name}">${doc.name}</a>
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-primary">✏️</button>
        <button class="btn btn-outline-danger">❌</button>
      </div>`;
    li.querySelector('.btn-outline-primary').onclick = () => {
      const newName = prompt('Nouveau nom:', doc.name);
      if (newName) updateDoc(doc(db, 'documents', doc.id), { name: newName });
    };
    li.querySelector('.btn-outline-danger').onclick = () => deleteDocument(doc.id);
    list.appendChild(li);
  }
}
