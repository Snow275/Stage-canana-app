// js/calendar.js

/**
 * Module Calendrier (FullCalendar + Bootstrap Modal)
 */
export function initCalendar() {
  console.log('⚙️ initCalendar() démarré');

  const calendarEl = document.getElementById('calendar');
  const modalEl    = document.getElementById('eventModal');
  if (!calendarEl || !modalEl) {
    console.error('calendarEl ou modalEl introuvable');
    return;
  }

  // Préparation de la modal Bootstrap
  const bsModal   = new bootstrap.Modal(modalEl);
  const fldTitle  = modalEl.querySelector('#modal-title');
  const fldStart  = modalEl.querySelector('#modal-start');
  const fldEnd    = modalEl.querySelector('#modal-end');
  const fldColor  = modalEl.querySelector('#modal-color');
  const btnSave   = modalEl.querySelector('#save-event');
  const btnDel    = modalEl.querySelector('#delete-event');

  // Charge les événements
  let events = JSON.parse(localStorage.getItem('events') || '[]');
  let currentEvt = null;

  // Initialise FullCalendar
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left:  'prev,next today',
      center:'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    locale: 'fr',
    selectable: true,
    editable: true,
    events,
    select: info => {
      const title = prompt('Titre de l’événement :');
      if (title) {
        const ev = {
          id:              Date.now(),
          title,
          start:           info.startStr,
          end:             info.endStr || info.startStr,
          backgroundColor: '#3788d8',
          borderColor:     '#3788d8'
        };
        calendar.addEvent(ev);
        events.push(ev);
        saveEvents();
      }
      calendar.unselect();
    },
    eventClick: info => {
      currentEvt = info.event;
      fldTitle.value = currentEvt.title;
      fldStart.value = currentEvt.start.toISOString().slice(0,16);
      fldEnd.value   = (currentEvt.end || currentEvt.start).toISOString().slice(0,16);
      fldColor.value = currentEvt.backgroundColor || '#3788d8';
      bsModal.show();
    }
  });

  calendar.render();
  console.log('✅ FullCalendar rendu');

  // Sauvegarde en localStorage
  function saveEvents() {
    localStorage.setItem('events', JSON.stringify(events));
  }

  // Bouton Enregistrer
  btnSave.addEventListener('click', () => {
    if (!currentEvt) return;
    const col = fldColor.value;
    currentEvt.setProp('title', fldTitle.value.trim() || currentEvt.title);
    currentEvt.setStart(fldStart.value);
    currentEvt.setEnd(fldEnd.value);
    currentEvt.setProp('backgroundColor', col);
    currentEvt.setProp('borderColor', col);

    // Met à jour le tableau events
    const idx = events.findIndex(e => e.id == currentEvt.id);
    if (idx > -1) {
      events[idx] = {
        id:              currentEvt.id,
        title:           currentEvt.title,
        start:           currentEvt.start.toISOString(),
        end:             currentEvt.end ? currentEvt.end.toISOString() : null,
        backgroundColor: col,
        borderColor:     col
      };
      saveEvents();
    }
    bsModal.hide();
  });

  // Bouton Supprimer
  btnDel.addEventListener('click', () => {
    if (!currentEvt) return;
    if (!confirm(`Supprimer "${currentEvt.title}" ?`)) return;
    currentEvt.remove();
    events = events.filter(e => e.id != currentEvt.id);
    saveEvents();
    bsModal.hide();
  });
}

// Pour le dashboard
export function getEvents() {
  return JSON.parse(localStorage.getItem('events') || '[]');
}
