// js/app.js

// 1) Imports des modules
import { initTasks }       from './tasks.js';
import { initCalendar, getCalendarInstance } from './calendar.js';
import { initContacts }    from './contacts.js';
import { initBudget }      from './budget.js';
import { initCourses }     from './courses.js';
import { initDishes }      from './dishes.js';
import { initInvoices }    from './invoices.js';
import { initDocuments }   from './documents.js';
import { initDashboard }   from './dashboard.js';

// 2) Enregistrement du Service Worker pour la PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => console.log('✅ SW enregistré'))
    .catch(err => console.error('❌ SW failed', err));
}

document.addEventListener('DOMContentLoaded', () => {
  // 3.1) Affichage du splash puis retrait après 2.5s
  setTimeout(() => {
    const splash = document.getElementById('splash-overlay');
    if (splash) splash.remove();
  }, 2500);

  // 3.2) Initialisation de tous les modules
  initTasks();
  initCalendar();
  initContacts();
  initBudget();
  initCourses();
  initDishes();
  initInvoices();
  initDocuments();
  initDashboard();

  // 3.3) Empêchements généraux de rechargement par <form>
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', e => e.preventDefault());
  });

  // 3.4) Navigation mobile (footer nav)
  const navButtons = document.querySelectorAll('#mobile-nav button');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-bs-target');
      const triggerEl = document.querySelector(`button[data-bs-target="${target}"]`);
      new bootstrap.Tab(triggerEl).show();
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  if (navButtons[0]) navButtons[0].classList.add('active');

  // 3.5) Re-render du calendrier quand on affiche l'onglet Préparation
  const prepTabBtn = document.querySelector('button[data-bs-target="#preparation"]');
  if (prepTabBtn) {
    prepTabBtn.addEventListener('shown.bs.tab', () => {
      const cal = getCalendarInstance();
      if (cal) {
        cal.render();
        window.dispatchEvent(new Event('resize'));
      }
    });
  }
});
