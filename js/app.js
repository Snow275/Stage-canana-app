// js/app.js
import { initTasks }       from './tasks.js';
import { initCalendar }    from './calendar.js';
import { initContacts }    from './contacts.js';
import { initBudget }      from './budget.js';
import { initCourses }     from './courses.js';
import { initInvoices }    from './invoices.js';
import { initDocuments }   from './documents.js';
import { initDashboard }   from './dashboard.js';
import { initDishes }      from './dishes.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('SW enregistré'))
    .catch(console.error);
}

document.addEventListener('DOMContentLoaded', () => {
  initTasks();
  initCalendar();
  initContacts();
  initBudget();
  initCourses();
  initDishes();
  initInvoices();
  initDocuments();
  initDashboard();
});
