// js/documents.js
// js/documents.js
import { gun } from './gundb.js';

const col = gun.get('documents');

export function subscribeDocuments(cb) {
  col.map().on((data, id) => {
    col.once(all => {
      const arr = Object.entries(all || {})
        .filter(([k,v]) => v && !v.deleted)
        .map(([k,v]) => ({ id: k, ...v }));
      cb(arr);
    });
  });
}

export function addDocument({ name, url }) {
  return col.set({ name, url, createdAt: Date.now() });
}

export function renameDocument(id, name) {
  return col.get(id).put({ name });
}

export function removeDocument(id) {
  return col.get(id).put({ deleted: true });
}


export function initDocuments() {
  const upload = document.getElementById('doc-upload');
  const list   = document.getElementById('doc-list');

  // Charge l’existant
  let docs = JSON.parse(localStorage.getItem('documents') || '[]');
  docs.forEach(renderDoc);

  // Écoute de l’upload
  upload.addEventListener('change', e => {
    for (const file of e.target.files) {
      const reader = new FileReader();
      reader.onload = () => {
        const doc = {
          id:   Date.now() + Math.random(),
          name: file.name,
          data: reader.result
        };
        docs.push(doc);
        save();
        renderDoc(doc);
      };
      reader.readAsDataURL(file);
    }
    upload.value = '';
  });

  // Affiche un élément de la liste
  function renderDoc(doc) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <a href="${doc.data}" download="${doc.name}" class="flex-grow-1 text-truncate">
        ${escapeHtml(doc.name)}
      </a>
      <div class="btn-group btn-group-sm ms-3">
        <button class="btn btn-outline-primary" title="Renommer">✏️</button>
        <button class="btn btn-outline-danger"  title="Supprimer">❌</button>
      </div>
    `;

    // Renommer
    li.querySelector('[title="Renommer"]').onclick = () => {
      const nouv = prompt('Nouveau nom du document :', doc.name);
      if (nouv && nouv.trim()) {
        doc.name = nouv.trim();
        save();
        // Met à jour le lien dans l’UI
        const a = li.querySelector('a');
        a.textContent = doc.name;
        a.setAttribute('download', doc.name);
      }
    };

    // Supprimer
    li.querySelector('[title="Supprimer"]').onclick = () => {
      if (!confirm(`Supprimer "${doc.name}" ?`)) return;
      docs = docs.filter(d => d.id !== doc.id);
      save();
      li.remove();
    };

    list.appendChild(li);
  }

  function save() {
    localStorage.setItem('documents', JSON.stringify(docs));
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}

