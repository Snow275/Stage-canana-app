// js/contacts.js

/**
 * Module Contacts
 * - Si BL_APP_ID_C & BL_REST_KEY_C sont renseignés => synchro Backendless (multi-appareils)
 * - Sinon => comportement identique à ton code d'origine (localStorage)
 */

// ================================
// BACKENDLESS >>> CONFIG (remplis si tu veux la synchro cloud)
const BL_APP_ID_C = "948A3DAD-06F1-4F45-BECA-A039688312DD"; // ex: "948A3DAD-06F1-4F45-BECA-XXXXXXXX"
const BL_REST_KEY_C = "8C69AAC6-204C-48CE-A60B-137706E8E183"; // ex: "4A7AA6A1-E3D7-4F93-87E6-XXXXXXXX"
const BL_BASE_C = (BL_APP_ID_C && BL_REST_KEY_C)
  ? `https://api.backendless.com/${BL_APP_ID_C}/${BL_REST_KEY_C}/data/Contacts`
  : null;
const BL_ON_C = !!BL_BASE_C;

async function blOkC(res){
  if (!res.ok) {
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error(`Backendless Contacts HTTP ${res.status}: ${txt}`);
  }
}
async function blListContacts(){
  const r = await fetch(`${BL_BASE_C}?sortBy=created%20desc`);
  await blOkC(r);
  return r.json(); // [{objectId,name,email,phone,...}]
}
async function blCreateContact(name,email,phone){
  const r = await fetch(BL_BASE_C, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ name, email, phone })
  });
  await blOkC(r);
  return r.json();
}
async function blUpdateContact(objectId, name, email, phone){
  const r = await fetch(`${BL_BASE_C}/${objectId}`, {
    method:"PATCH",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ name, email, phone })
  });
  await blOkC(r);
  return r.json();
}
async function blRemoveContact(objectId){
  const r = await fetch(`${BL_BASE_C}/${objectId}`, { method:"DELETE" });
  await blOkC(r);
  return true;
}
// BACKENDLESS <<<
// ================================

window.initContacts = function() {
  console.log('⚙️ initContacts() démarré');

  const form = document.getElementById('contact-form');
  const nameI = document.getElementById('contact-name');
  const mailI = document.getElementById('contact-email');
  const phoneI= document.getElementById('contact-phone');
  const list = document.getElementById('contact-list');
  const btnExp= document.getElementById('export-contacts');

  console.log('→ form ?', form, 'fields:', nameI, mailI, phoneI, 'list:', list, 'btnExp:', btnExp);
  if (!form || !nameI || !mailI || !phoneI || !list || !btnExp) {
    console.error('❌ Un élément contact est introuvable !');
    return;
  }

  // État
  let contacts = [];
  let editId = null; // pour localStorage
  let editObjectId = null; // pour Backendless

  // ------- Utils -------
  function escapeHtml(s){ const div = document.createElement('div'); div.textContent = s; return div.innerHTML; }
  function saveAll(){
    if (!BL_ON_C) localStorage.setItem('contacts', JSON.stringify(contacts));
  }
  function downloadCSV(filename, text){
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ------- Rendu -------
  function renderContact(c){
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

    // Modifier
    btnEdit.onclick = () => {
      console.log('✏️ modifier', c.id || c.objectId);
      nameI.value = c.name;
      mailI.value = c.email;
      phoneI.value = c.phone;
      form.querySelector('button[type="submit"], button:not([type])').textContent = 'Modifier';

      if (BL_ON_C) { editObjectId = c.objectId; editId = null; }
      else { editId = c.id; editObjectId = null; }
    };

    // Supprimer
    btnDel.onclick = async () => {
      console.log('🗑 supprimer', c.id || c.objectId);
      if (!confirm('Supprimer ce contact ?')) return;

      if (BL_ON_C) {
        await blRemoveContact(c.objectId);
        await refresh();
      } else {
        contacts = contacts.filter(x => x.id !== c.id);
        saveAll();
        li.remove();
        // reset si on supprimait celui en cours d'édition
        if (editId === c.id) {
          editId = null; form.reset();
          form.querySelector('button[type="submit"], button:not([type])').textContent = 'OK';
        }
      }
    };

    list.appendChild(li);
  }

  function renderAll(){
    list.innerHTML = '';
    contacts.forEach(renderContact);
  }

  // ------- Chargement -------
  async function refresh(){
    if (BL_ON_C) {
      contacts = await blListContacts();
    } else {
      contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
    }
    renderAll();
  }

  // ------- Soumission -------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameI.value.trim();
    const email = mailI.value.trim();
    const phone = phoneI.value.trim();
    console.log('📥 submit contact', { name, email, phone, editId, editObjectId });

    if (!name || !email || !phone) {
      alert('Tous les champs sont requis');
      return;
    }

    if (BL_ON_C) {
      // Mode Backendless
      if (editObjectId) {
        await blUpdateContact(editObjectId, name, email, phone);
        editObjectId = null;
        form.querySelector('button[type="submit"], button:not([type])').textContent = 'OK';
        form.reset();
        await refresh();
      } else {
        await blCreateContact(name, email, phone);
        form.reset();
        await refresh();
      }
    } else {
      // Mode localStorage (ton code d'origine)
      if (editId) {
        const idx = contacts.findIndex(c => c.id === editId);
        contacts[idx] = { id: editId, name, email, phone };
        editId = null;
        form.querySelector('button[type="submit"], button:not([type])').textContent = 'OK';
        list.innerHTML = '';
        contacts.forEach(renderContact);
      } else {
        const c = { id: Date.now(), name, email, phone };
        contacts.push(c);
        renderContact(c);
      }
      saveAll();
      form.reset();
    }
  });

  // ------- Export -------
  btnExp.addEventListener('click', async () => {
    console.log('📤 export contacts');
    if (BL_ON_C && !contacts.length) await refresh();
    if (!contacts.length) return alert('Aucun contact à exporter !');

    const header = 'id_or_objectId,nom,email,telephone';
    const rows = contacts.map(c =>
      `${(c.objectId || c.id)},"${String(c.name).replace(/"/g,'""')}",${c.email},"${String(c.phone).replace(/"/g,'""')}"`
    );
    downloadCSV('contacts.csv', [header, ...rows].join('\n'));
  });

  // Go
  refresh();
};

// Option: accès global similaire à ton export d'origine
window.getContacts = function(){
  if (BL_ON_C) return blListContacts(); // Promise
  return JSON.parse(localStorage.getItem('contacts') || '[]'); // sync
};

