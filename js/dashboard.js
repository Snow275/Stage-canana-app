// js/dashboard.js
import { subscribeTasks, deleteTask } from './tasks.js';
import { subscribeEvents }            from './calendar.js';
import { subscribeBudget }            from './budget.js';
import { subscribeInvoices }          from './invoices.js';

export function initDashboard() {
  const taskList = document.getElementById('dashboard-tasks');
  const nextEvt  = document.getElementById('dashboard-next-event');
  const budCtx   = document.getElementById('dashboard-budget-chart').getContext('2d');
  const invList  = document.getElementById('dashboard-invoices');

  // A) Tâches urgentes
  subscribeTasks(tasks => {
    taskList.innerHTML = "";
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
        btn.onclick = () => deleteTask(t.id);
        li.appendChild(btn);
        taskList.appendChild(li);
      });
  });

  // B) Prochain événement
  subscribeEvents(evts => {
    const up = evts.filter(e=>new Date(e.start)>=new Date())
                   .sort((a,b)=>new Date(a.start)-new Date(b.start));
    nextEvt.textContent = up.length
      ? `${up[0].title} le ${new Date(up[0].start).toLocaleDateString()}`
      : '—';
  });

  // C) Budget
  let budgetChart;
  subscribeBudget(entries => {
    const sums = entries.reduce((a,e)=>{a[e.type]=(a[e.type]||0)+e.amount;return a;},{});
    const data = { labels:Object.keys(sums), datasets:[{data:Object.values(sums),backgroundColor:['#dc3545','#198754']}]};
    if (!budgetChart) {
      budgetChart = new Chart(budCtx, { type:'doughnut', data, options:{maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}} });
    } else {
      budgetChart.data = data;
      budgetChart.update();
    }
  });

  // D) Factures
  subscribeInvoices(invs => {
    invList.innerHTML = "";
    invs.filter(i=>!i.paid)
        .sort((a,b)=>new Date(a.date)-new Date(b.date))
        .forEach(i=>{
          const li = document.createElement('li');
          li.className = 'list-group-item';
          li.textContent = `${i.date} – ${i.amount.toFixed(2)}€`;
          invList.appendChild(li);
        });
  });
}
