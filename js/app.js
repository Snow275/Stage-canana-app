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

<!-- PWA / head… -->
<script src="https://cdn.jsdelivr.net/npm/gun/gun.js"></script>
<!-- si tu veux un relais distant (optionnel) -->
<!-- <script>window.gun = Gun({ peers: ['https://your-relay.herokuapp.com/gun'] });</script> -->
<script>window.gun = Gun();</script>
<script type="module" src="js/app.js"></script>
</body>
</html>

// 2) Enregistrement du Service Worker pour la PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => console.log('Service Worker enregistré ✅'))
    .catch(err => console.error('Erreur SW :', err));
}

document.addEventListener('DOMContentLoaded', () => {
  // Au bout de 2.5s (durée de l'animation), on supprime l'overlay du DOM
  setTimeout(() => {
    const splash = document.getElementById('splash-overlay');
    if (splash) splash.remove();
  }, 2500);
});


// 3) Initialisation générale au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  // 3.1) Initialiser tous les modules fonctionnels
  initTasks();
  initCalendar();
  initContacts();
  initBudget();
  initCourses();
  initDishes();
  initInvoices();
  initDocuments();
  initDashboard();

  // 3.2) Mise en place de la navigation mobile (footer-nav)
  const navButtons = document.querySelectorAll('#mobile-nav button');
  if (navButtons.length) {
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Afficher l’onglet Bootstrap correspondant
        const target = btn.getAttribute('data-bs-target');
        const triggerEl = document.querySelector(`button[data-bs-target="${target}"]`);
        new bootstrap.Tab(triggerEl).show();

        // Gérer l’état "actif" du bouton
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    // Activer le premier bouton au démarrage
    navButtons[0].classList.add('active');
  }
});

