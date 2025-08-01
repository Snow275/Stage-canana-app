import { getTasks, saveTask }     from './tasks.js';
import { getBudgetData }          from './budget.js';
import { getInvoices }            from './invoices.js';


const WEATHER_API_KEY = '600c8b2ce3f1613f3936612c9bbc42ff';

export function initDashboard() {
  // Références DOM
  const taskForm   = document.getElementById('dash-task-form');
  const taskInput  = document.getElementById('dash-task-input');
  const taskList   = document.getElementById('dashboard-tasks');
  const budCtx     = document.getElementById('dashboard-budget-chart').getContext('2d');
  const invList    = document.getElementById('dashboard-invoices');

  // A) Tâches urgentes
  function renderTasks() {
    taskList.innerHTML = '';
    getTasks().slice(-3).reverse().forEach(t => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.textContent = t.text;
      taskList.appendChild(li);
    });
  }
  taskForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    saveTask(text);
    taskInput.value = '';
    renderTasks();
  });

  // B) Météo en temps réel
  function renderWeather() {
    const container = document.getElementById('dashboard-weather');
    if (!navigator.geolocation) {
      container.textContent = 'Géolocalisation non supportée.';
      return;
    }
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        const resp = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}` +
          `&units=metric&lang=fr&appid=${WEATHER_API_KEY}`
        );
        if (!resp.ok) throw new Error('Erreur API météo');
        const data = await resp.json();
        const { temp } = data.main;
        const { description, icon } = data.weather[0];
        const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        container.innerHTML = `
          <img src="${iconUrl}" alt="${description}" style="width:60px;height:60px; margin-right:10px;">
          <div>
            <strong>${temp.toFixed(1)}°C</strong><br>
            <small style="text-transform:capitalize;">${description}</small>
          </div>
        `;
      } catch {
        container.textContent = 'Erreur chargement météo.';
      }
    }, () => {
      container.textContent = 'Autorisation géoloc. refusée.';
    });
  }

  // C) Budget (récap)
  const budChart = new Chart(budCtx, {
    type: 'doughnut',
    data: getBudgetData(),
    options: { maintainAspectRatio: false, plugins: { legend:{position:'bottom'} } }
  });
  function updateBudgetChart() {
    budChart.data = getBudgetData();
    budChart.update();
  }

  // D) Factures à venir
  function renderInvoices() {
    invList.innerHTML = '';
    getInvoices()
      .filter(i => !i.paid)
      .sort((a,b)=> new Date(a.date) - new Date(b.date))
      .forEach(i => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = `${i.date} – ${i.amount.toFixed(2)}€`;
        invList.appendChild(li);
      });
  }

  // Initialisation
  renderTasks();
  renderWeather();    
  updateBudgetChart();
  renderInvoices();
}
