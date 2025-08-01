// js/calendar.js

/**
 * Module Calendrier
 */
export function initCalendar() {
  console.log('⚙️ initCalendar() démarré');

  const calendarEl = document.getElementById('calendar');
  const modalEl    = document.getElementById('eventModal');
  console.log('→ calendarEl ?', calendarEl, 'modalEl ?', modalEl);

  if (!calendarEl || !modalEl) {
    console.error('❌ calendarEl ou modalEl introuvable !');
    return;
  }

  const bsModal   = new bootstrap.Modal(modalEl);
  const fldTitle  = modalEl.querySelector('#modal-title');
  const fldStart  = modalEl.querySelector('#modal-start');
  const fldEnd    = modalEl.querySelector('#modal-end');
  const fldColor  = modalEl.querySelector('#modal-color');
  const btnSave   = modalEl.querySelector('#save-event');
  const btnDel    = modalEl.querySelector('#delete-event');

  if (!fldTitle || !fldStart || !fldEnd || !fldColor || !btnSave || !btnDel) {
    console.error('❌ Un des champs de la modal est introuvable !', { fldTitle, fldStart, fldEnd, fldColor, btnSave, btnDel });
    return;
  }

  // Charge les événements existants
  let events = JSON.parse(localStorage.getItem('events') || '[]');
  console.log('→ événements chargés', events);

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
      console.log('▶️ select', info.startStr, info.endStr);
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
        console.log('➕ événement ajouté', ev);
      }
      calendar.unselect();
    },
    eventClick: info => {
      console.log('▶️ eventClick', info.event);
      currentEvt = info.event;
      fldTitle.value = currentEvt.title;
      fldStart.value = currentEvt.start.toISOString().slice(0,16);
      fldEnd.value   = currentEvt.end
                        ? currentEvt.end.toISOString().slice(0,16)
                        : currentEvt.start.toISOString().slice(0,16);
      fldColor.value = currentEvt.backgroundColor || '#3788d8';
      bsModal.show();
    }
  });

  calendar.render();
  console.log('✅ FullCalendar rendu');

  // Sauvegarde et mise à jour stockage
  function saveEvents() {
    localStorage.setItem('events', JSON.stringify(events));
    console.log('💾 events sauvegardés', events);
  }

  // Enregistre les modifications depuis la modal
  btnSave.addEventListener('click', () => {
    if (!currentEvt) return;
    console.log('✏️ save-event', {
      title: fldTitle.value,
      start: fldStart.value,
      end:   fldEnd.value,
      color: fldColor.value
    });
    currentEvt.setProp('title', fldTitle.value.trim() || currentEvt.title);
    currentEvt.setStart(fldStart.value);
    currentEvt.setEnd(fldEnd.value);
    const col = fldColor.value;
    currentEvt.setProp('backgroundColor', col);
    currentEvt.setProp('borderColor', col);

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
