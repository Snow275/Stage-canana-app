// js/calendar.js
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { firebaseApp } from "./firebase.js";
const db = getFirestore(firebaseApp);
const eventsCol = collection(db, "events");

export function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  const modalEl    = document.getElementById('eventModal');
  if (!calendarEl || !modalEl) return console.error("FullCalendar ou modal introuvable");

  // FullCalendar + Bootstrap modal setup (idem)
  const bsModal   = new bootstrap.Modal(modalEl);
  const fldTitle  = modalEl.querySelector('#modal-title');
  const fldStart  = modalEl.querySelector('#modal-start');
  const fldEnd    = modalEl.querySelector('#modal-end');
  const fldColor  = modalEl.querySelector('#modal-color');
  const btnSave   = modalEl.querySelector('#save-event');
  const btnDel    = modalEl.querySelector('#delete-event');
  let currentEvt  = null;

  // 1) Récupère en temps réel les events
  const q = query(eventsCol, orderBy("createdAt"));
  onSnapshot(q, snap => {
    const evts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    calendar.removeAllEvents();
    evts.forEach(e => calendar.addEvent(e));
  });

  // 2) Init FullCalendar
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: { left:'prev,next today', center:'title', right:'dayGridMonth,timeGridWeek,timeGridDay' },
    locale: 'fr',
    selectable: true,
    editable: true,
    select: async info => {
      const title = prompt('Titre de l’événement :');
      if (!title) { calendar.unselect(); return; }
      const ev = {
        title,
        start: info.startStr,
        end:   info.endStr || info.startStr,
        backgroundColor:'#3788d8',
        borderColor:    '#3788d8',
        createdAt: Date.now()
      };
      await addDoc(eventsCol, ev);
      calendar.unselect();
    },
    eventClick: info => {
      currentEvt = info.event;
      fldTitle.value = currentEvt.title;
      fldStart.value = currentEvt.start.toISOString().slice(0,16);
      fldEnd.value   = (currentEvt.end || currentEvt.start).toISOString().slice(0,16);
      fldColor.value = currentEvt.backgroundColor;
      bsModal.show();
    }
  });
  calendar.render();

  // 3) Enregistre edits depuis modal
  btnSave.addEventListener('click', async () => {
    if (!currentEvt) return;
    const id    = currentEvt.id;
    const data  = {
      title: fldTitle.value.trim() || currentEvt.title,
      start: fldStart.value,
      end:   fldEnd.value,
      backgroundColor: fldColor.value,
      borderColor:     fldColor.value
    };
    await updateDoc(doc(db, "events", id), data);
    bsModal.hide();
  });

  btnDel.addEventListener('click', async () => {
    if (!currentEvt) return;
    if (!confirm(`Supprimer "${currentEvt.title}" ?`)) return;
    await deleteDoc(doc(db, "events", currentEvt.id));
    bsModal.hide();
  });
}


  // Supprime un événement depuis la modal
  btnDel.addEventListener('click', () => {
    if (!currentEvt) return;
    if (!confirm(`Supprimer "${currentEvt.title}" ?`)) return;
    console.log('🗑 delete-event', currentEvt.id);
    currentEvt.remove();
    const idx = events.findIndex(e => e.id == currentEvt.id);
    if (idx > -1) {
      events.splice(idx, 1);
      saveEvents();
    }
    bsModal.hide();
  });
}

// Pour le dashboard
export function getEvents() {
  return JSON.parse(localStorage.getItem('events') || '[]');
}

