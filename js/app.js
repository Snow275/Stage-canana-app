// js/app.js

// 1) Imports des modules
import { initTasks }     from './tasks.js';
import { initCalendar }  from './calendar.js';
import { initContacts }  from './contacts.js';
import { initBudget }    from './budget.js';
import { initCourses }   from './courses.js';
import { initDishes }    from './dishes.js';
import { initInvoices }  from './invoices.js';
import { initDocuments } from './documents.js';
import { initDashboard } from './dashboard.js';

// 2) Enregistrement du Service Worker pour la PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => console.log('Service Worker enregistré ✅'))
    .catch(err => console.error('Erreur SW :', err));
}

document.addEventListener('DOMContentLoaded', () => {
  // 3) Initialisation de tous les modules
  initTasks();
  initCalendar();
  initContacts();
  initBudget();
  initCourses();
  initDishes();
  initInvoices();
  initDocuments();
  initDashboard();

  // 4) Navigation mobile en bas d'écran
  const navButtons = document.querySelectorAll('#mobile-nav button');
  if (navButtons.length) {
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-bs-target');
        const triggerEl = document.querySelector(`button[data-bs-target="${target}"]`);
        new bootstrap.Tab(triggerEl).show();
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    // Activation du premier onglet mobile
    navButtons[0].classList.add('active');
  }

  // 5) Quand on passe à l’onglet "Préparation", redimensionner le calendrier
  const prepTabBtn = document.querySelector('button[data-bs-target="#preparation"]');
  if (prepTabBtn) {
    prepTabBtn.addEventListener('shown.bs.tab', () => {
      window.dispatchEvent(new Event('resize'));
    });
  }
});
