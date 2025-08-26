

// js/contacts.js

/**
* Module Contacts
*/
export function initContacts() {
console.log('⚙️ initContacts() démarré');

const form = document.getElementById('contact-form');
const nameI = document.getElementById('contact-name');
const mailI = document.getElementById('contact-email');
const phoneI = document.getElementById('contact-phone');
const list = document.getElementById('contact-list');
const btnExp = document.getElementById('export-contacts');

console.log('→ form ?', form, 'fields:', nameI, mailI, phoneI, 'list:', list, 'btnExp:', btnExp);
if (!form || !nameI || !mailI || !phoneI || !list || !btnExp) {
console.error('❌ Un élément contact est introuvable !');
return;
}

let contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
let editId = null;
console.log('→ contacts chargés', contacts);

// Affiche existants
contacts.forEach(renderContact);

// Soumission
form.addEventListener('submit', e => {
e.preventDefault();
const name = nameI.value.trim();
const email = mailI.value.trim();
const phone = phoneI.value.trim();
console.log('📥 submit contact', { name, email, phone, editId });
if (!name || !email || !phone) {
alert('Tous les champs sont requis');
return;
}

if (editId) {
const idx = contacts.findIndex(c => c.id === editId);
contacts[idx] = { id: editId, name, email, phone };
editId = null;
form.querySelector('button').textContent = 'OK';
list.innerHTML = '';
contacts.forEach(renderContact);
} else {
const c = { id: Date.now(), name, email, phone };
contacts.push(c);
renderContact(c);
}
saveAll();
form.reset();
});

// Export
btnExp.addEventListener('click', () => {
console.log('📤 export contacts');
if (!contacts.length) return alert('Aucun contact à exporter !');
const header = 'id,nom,email,telephone';
const rows = contacts.map(c => `${c.id},"${c.name.replace(/"/g,'""')}",${c.email},"${c.phone}"`);
downloadCSV('contacts.csv', [header, ...rows].join('\n'));
});

function renderContact(c) {
console.log('🖊 renderContact', c);
const li = document.createElement('li');
li.className = 'list-group-item d-flex justify-content-between align-items-center';
li.innerHTML = `
<div>
<strong>${escapeHtml(c.name)}</strong><br>
<small>${escapeHtml(c.email)}</small><br>
<small>📞 ${escapeHtml(c.phone)}</small>
</div>
<div>
<button class="btn btn-sm btn-outline-warning me-1" title="Modifier">✏️</button>
<button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>
</div>
`;
const [btnEdit, btnDel] = li.querySelectorAll('button');
btnEdit.onclick = () => {
console.log('✏️ modifier', c.id);
editId = c.id;
nameI.value = c.name;
mailI.value = c.email;
phoneI.value = c.phone;
form.querySelector('button').textContent = 'Modifier';
};
btnDel.onclick = () => {
console.log('🗑 supprimer', c.id);
if (!confirm('Supprimer ce contact ?')) return;
contacts = contacts.filter(x => x.id !== c.id);
saveAll();
li.remove();
if (editId === c.id) {
editId = null;
form.reset();
form.querySelector('button').textContent = 'OK';
}
};
list.appendChild(li);
}

function saveAll() {
console.log('💾 saveAll contacts', contacts);
localStorage.setItem('contacts', JSON.stringify(contacts));
}

function downloadCSV(filename, text) {
const a = document.createElement('a');
a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text);
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

export function getContacts() {
return JSON.parse(localStorage.getItem('contacts') || '[]');
}


