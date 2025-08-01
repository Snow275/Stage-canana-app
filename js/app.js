// js/app.js

// 1) Imports des modules
import { initTasks } from './tasks.js';
import { initCalendar } from './calendar.js';
import { initContacts } from './contacts.js';
import { initBudget } from './budget.js';
import { initCourses } from './courses.js';
import { initDishes } from './dishes.js';
import { initInvoices } from './invoices.js';
import { initDocuments } from './documents.js';
import { initDashboard } from './dashboard.js';

// 2) Enregistrement du Service Worker (PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => console.log('✅ Service Worker enregistré'))
    .catch(err => console.error('❌ Erreur SW :', err));
}

// 3) Au chargement du DOM, on lance tout
document.addEventListener('DOMContentLoaded', () => {
  // 3.1) Splash screen : on le retire après 2,5 s
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

  // 3.3) Navigation mobile « footer » (si présente)
  const navButtons = document.querySelectorAll('#mobile-nav button');
  if (navButtons.length) {
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.bsTarget;
        const trigger = document.querySelector(`button[data-bs-target="${target}"]`);
        new bootstrap.Tab(trigger).show();
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    // Activer le premier bouton par défaut
    navButtons[0].classList.add('active');
  }
});
