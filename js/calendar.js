// js/calendar.js
import {
  db,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc
} from "./firebase.js";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";

// 1) Référence Firestore
const eventsCol = collection(db, "events");

// 2) Abonnement temps réel
export function subscribeEvents(cb) {
  return onSnapshot(eventsCol, snap => {
    const evts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Optionnel : trier par date de début
    evts.sort((a,b) => new Date(a.start) - new Date(b.start));
    cb(evts);
  });
}

// 3) CRUD
export function addEvent(evt) {
  // evt = { title, start, end, backgroundColor, borderColor }
  return addDoc(eventsCol, { ...evt, createdAt: Date.now() });
}

export function updateEvent(id, updates) {
  return updateDoc(doc(db, "events", id), updates);
}

export function removeEvent(id) {
  return deleteDoc(doc(db, "events", id));
}

// 4) Initialisation du calendrier
export function initCalendar() {
  const calendarEl = document.getElementById("calendar");
  const modalEl    = document.getElementById("eventModal");
  if (!calendarEl || !modalEl) {
    console.error("❌ initCalendar: éléments introuvables");
    return;
  }

  // Prépare la modal Bootstrap
  const bsModal  = new bootstrap.Modal(modalEl);
  const fldTitle = modalEl.querySelector("#modal-title");
  const fldStart = modalEl.querySelector("#modal-start");
  const fldEnd   = modalEl.querySelector("#modal-end");
  const fldColor = modalEl.querySelector("#modal-color");
  const btnSave  = modalEl.querySelector("#save-event");
  const btnDel   = modalEl.querySelector("#delete-event");

  let currentEvt = null;

  // Crée le calendrier FullCalendar
  const calendar = new Calendar(calendarEl, {
    plugins: [ dayGridPlugin, timeGridPlugin, interactionPlugin ],
    initialView: "dayGridMonth",
    headerToolbar: {
      left:  "prev,next today",
      center:"title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },
    locale: frLocale,
    selectable: true,
    editable: true,
    select: async info => {
      const title = prompt("Titre de l’événement ?");
      if (!title) {
        calendar.unselect();
        return;
      }
      const newEvt = {
        title,
        start: info.startStr,
        end:   info.endStr || info.startStr,
        backgroundColor: "#3788d8",
        borderColor:     "#3788d8"
      };
      await addEvent(newEvt);
      calendar.unselect();
    },
    eventClick: info => {
      // ouvre la modal pour éditer
      currentEvt = info.event;
      fldTitle.value = currentEvt.title;
      fldStart.value = currentEvt.start.toISOString().slice(0,16);
      fldEnd.value   = (currentEvt.end||currentEvt.start).toISOString().slice(0,16);
      fldColor.value = currentEvt.backgroundColor || "#3788d8";
      bsModal.show();
    }
  });

  calendar.render();

  // 5) Synchronisation Firestore → FullCalendar
  subscribeEvents(evts => {
    calendar.removeAllEvents();
    evts.forEach(e => {
      calendar.addEvent({
        id: e.id,
        title: e.title,
        start: e.start,
        end:   e.end,
        backgroundColor: e.backgroundColor,
        borderColor:     e.borderColor
      });
    });
  });

  // 6) Édition depuis la modal
  btnSave.addEventListener("click", async () => {
    if (!currentEvt) return;
    const updates = {
      title: fldTitle.value.trim(),
      start: fldStart.value,
      end:   fldEnd.value,
      backgroundColor: fldColor.value,
      borderColor:     fldColor.value
    };
    await updateEvent(currentEvt.id, updates);
    bsModal.hide();
  });

  // 7) Suppression depuis la modal
  btnDel.addEventListener("click", async () => {
    if (!currentEvt) return;
    if (confirm(`Supprimer "${currentEvt.title}" ?`)) {
      await removeEvent(currentEvt.id);
      bsModal.hide();
    }
  });

  // Pour le dashboard
export function getEvents() {
  return JSON.parse(localStorage.getItem('events') || '[]');
}

}
