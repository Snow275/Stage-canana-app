// js/contacts.js
import {
  db,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc
} from "./firebase.js";

const contactsCol = collection(db, "contacts");

// Écoute temps réel
export function subscribeContacts(cb) {
  return onSnapshot(contactsCol, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(list);
  });
}

// Opérations CRUD
export function addContact(data) {
  return addDoc(contactsCol, { ...data, createdAt: Date.now() });
}
export function updateContact(id, updates) {
  return updateDoc(doc(db, "contacts", id), updates);
}
export function deleteContact(id) {
  return deleteDoc(doc(db, "contacts", id));
}

/**
 * Module Contacts – UI
 */
export function initContacts() {
  const form   = document.getElementById('contact-form');
  const nameI  = document.getElementById('contact-name');
  const mailI  = document.getElementById('contact-email');
  const phoneI = document.getElementById('contact-phone');
  const list   = document.getElementById('contact-list');
  const btnExp = document.getElementById('export-contacts');

  let editId = null;

  // Abonnement Firestore
  subscribeContacts(contacts => {
    list.innerHTML = "";
    contacts.forEach(c => renderContact(c));
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name  = nameI.value.trim();
    const email = mailI.value.trim();
    const phone = phoneI.value.trim();
    if (!name || !email || !phone) return;

    if (editId) {
      updateContact(editId, { name, email, phone })
        .then(() => { editId = null; form.querySelector('button').textContent = 'OK'; form.reset(); });
    } else {
      addContact({ name, email, phone })
        .then(() => form.reset());
    }
  });

  btnExp.addEventListener('click', () => {
    subscribeContacts(contacts => {
      if (!contacts.length) return alert('Aucun contact à exporter !');
      const header = 'id,nom,email,telephone';
      const rows   = contacts.map(c =>
        `${c.id},"${c.name.replace(/"/g,'""')}",${c.email},"${c.phone}"`
      );
      const csv = [header, ...rows].join('\n');
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'contacts.csv';
      a.click();
    });
  });

  function renderContact(c) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <div>
        <strong>${c.name}</strong><br>
        <small>${c.email}</small><br>
        <small>📞 ${c.phone}</small>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-warning me-1">✏️</button>
        <button class="btn btn-sm btn-outline-danger">❌</button>
      </div>
    `;
    const [btnEdit, btnDel] = li.querySelectorAll('button');
    btnEdit.onclick = () => {
      editId = c.id;
      nameI.value  = c.name;
      mailI.value  = c.email;
      phoneI.value = c.phone;
      form.querySelector('button').textContent = 'Modifier';
    };
    btnDel.onclick = () => {
      if (confirm('Supprimer ce contact ?')) {
        deleteContact(c.id);
      }
    };
    list.appendChild(li);
  }
}
