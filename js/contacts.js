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

// Référence à la collection Firestore
const contactsCol = collection(db, "contacts");

/**
 * Écoute temps réel des contacts.
 * @param {Function} cb callback qui reçoit un tableau [{id, name, email, phone, createdAt}, ...]
 * @returns unsubscribe function
 */
export function subscribeContacts(cb) {
  return onSnapshot(contactsCol, snap => {
    const contacts = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.createdAt - b.createdAt);
    cb(contacts);
  });
}

/** Ajout d’un contact. data = { name, email, phone } */
export function addContact(data) {
  return addDoc(contactsCol, { ...data, createdAt: Date.now() });
}

/** Mise à jour d’un contact */
export function updateContact(id, updates) {
  return updateDoc(doc(db, "contacts", id), updates);
}

/** Suppression d’un contact */
export function removeContact(id) {
  return deleteDoc(doc(db, "contacts", id));
}


/**
 * Module Contacts – initialisation UI
 */
export function initContacts() {
  const form = document.getElementById("contact-form");
  const nameI = document.getElementById("contact-name");
  const mailI = document.getElementById("contact-email");
  const phoneI = document.getElementById("contact-phone");
  const list = document.getElementById("contact-list");
  const btnExp = document.getElementById("export-contacts");

  if (!form || !nameI || !mailI || !phoneI || !list || !btnExp) {
    console.error("❌ initContacts: un élément introuvable");
    return;
  }

  let editId = null;

  // 1) Affiche en temps réel
  subscribeContacts(contacts => {
    list.innerHTML = "";
    contacts.forEach(renderContact);
  });

  // 2) Gestion du formulaire
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const name = nameI.value.trim();
    const email = mailI.value.trim();
    const phone = phoneI.value.trim();
    if (!name || !email || !phone) {
      return alert("Tous les champs sont requis.");
    }

    if (editId) {
      await updateContact(editId, { name, email, phone });
      editId = null;
      form.querySelector("button").textContent = "OK";
    } else {
      await addContact({ name, email, phone });
    }

    form.reset();
  });

  // 3) Export CSV manuel
  btnExp.addEventListener("click", () => {
    subscribeContacts(contacts => {
      if (!contacts.length) return alert("Aucun contact à exporter !");
      const header = "id,nom,email,telephone";
      const rows = contacts.map(c =>
        `${c.id},"${c.name.replace(/"/g, '""')}",${c.email},"${c.phone}"`
      );
      downloadCSV("contacts.csv", [header, ...rows].join("\n"));
    })();
  });

  // Affichage d’un contact dans la liste
  function renderContact(c) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <div>
        <strong>${escape(c.name)}</strong><br>
        <small>${escape(c.email)}</small><br>
        <small>📞 ${escape(c.phone)}</small>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-warning me-1" title="Modifier">✏️</button>
        <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
      </div>
    `;
    const [btnEdit, btnDel] = li.querySelectorAll("button");

    btnEdit.onclick = () => {
      editId = c.id;
      nameI.value = c.name;
      mailI.value = c.email;
      phoneI.value = c.phone;
      form.querySelector("button").textContent = "Modifier";
    };

    btnDel.onclick = async () => {
      if (confirm("Supprimer ce contact ?")) {
        await removeContact(c.id);
      }
    };

    list.appendChild(li);
  }

  function downloadCSV(filename, text) {
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(text);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function escape(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
}
