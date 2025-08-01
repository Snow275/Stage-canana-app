// js/app.js
import './gundb.js';              // initialise Gun
import { subscribeTasks, addTask }    from './tasks.js';
import { initCalendar }               from './calendar.js';  // calendar.js gère déjà Gun en interne
import { subscribeContacts }          from './contacts.js';
import { subscribeBudget }            from './budget.js';
import { subscribeCourses }           from './courses.js';
import { subscribeDishes }            from './dishes.js';
import { subscribeInvoices }          from './invoices.js';
import { subscribeDocuments }         from './documents.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => console.log('SW enregistré'))
    .catch(console.error);
}

document.addEventListener('DOMContentLoaded', () => {
  // — Dashboard tâches —
  const taskList = document.getElementById('dashboard-tasks');
  subscribeTasks(tasks => {
    taskList.innerHTML = '';
    tasks
      .sort((a,b)=> b.createdAt - a.createdAt)
      .slice(0,3)
      .forEach(t => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between';
        li.textContent = t.text;
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-danger';
        btn.textContent = '✖';
        btn.onclick = () => removeTask(t.id);
        li.append(btn);
        taskList.append(li);
      });
  });
  document.getElementById('dash-task-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('dash-task-input');
    const txt = input.value.trim();
    if (txt) addTask(txt).then(() => input.value = '');
  });

  // — Calendrier —
  initCalendar();  // affiche et synchronise en temps réel via Gun

  // — Les autres modules en « subscribe » —
  subscribeContacts(contacts => { /* mettre à jour #contact-list */ });
  subscribeBudget(entries   => { /* MAJ #budget-list + graphique */ });
  subscribeCourses(items   => { /* MAJ #course-list */ });
  subscribeDishes(dishes   => { /* MAJ #dish-list */ });
  subscribeInvoices(invs   => { /* MAJ #invoice-list */ });
  subscribeDocuments(docs  => { /* MAJ #doc-list */ });
});
