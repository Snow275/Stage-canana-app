import { getTasks, saveTask }     from './tasks.js';
import { getBudgetData }          from './budget.js';
import { getInvoices }            from './invoices.js';


const WEATHER_API_KEY = '600c8b2ce3f1613f3936612c9bbc42ff';
const WEATHER_CACHE_KEY = 'lastWeather';
const GEO_OPTS = { enableHighAccuracy: false, timeout: 8000, maximumAge: 30 * 60 * 1000 };

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

  // Helpers
  const showFromCache = (fallbackMsg) => {
    try {
      const cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || 'null');
      if (cached) {
        const { temp, description, icon } = cached;
        const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        container.innerHTML = `
          <div class="d-flex align-items-center">
            <img src="${iconUrl}" alt="${description}" style="width:60px;height:60px; margin-right:10px;">
            <div>
              <strong>${temp.toFixed(1)}°C</strong><br>
              <small style="text-transform:capitalize;">${description}</small>
              <div><span class="badge bg-secondary mt-1">données en cache</span></div>
            </div>
          </div>
        `;
        return true;
      }
    } catch {}
    container.textContent = fallbackMsg;
    return false;
  };

  const saveCache = (data) => {
    try { localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data)); } catch {}
  };

  // Hors-ligne → on tente le cache
  if (!navigator.onLine) {
    showFromCache('Pas de connexion pour la météo.');
    return;
  }

  if (!navigator.geolocation) {
    // Pas de géoloc → essaye cache
    showFromCache('Géolocalisation non supportée.');
    return;
  }

  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude: lat, longitude: lon } = pos.coords;
    try {
      const resp = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${WEATHER_API_KEY}`
      );
      if (!resp.ok) throw new Error('Erreur API météo');
      const data = await resp.json();
      const payload = {
        temp: data.main.temp,
        description: data.weather?.[0]?.description || 'Météo',
        icon: data.weather?.[0]?.icon || '01d'
      };
      // Affiche + cache
      const iconUrl = `https://openweathermap.org/img/wn/${payload.icon}@2x.png`;
      container.innerHTML = `
        <img src="${iconUrl}" alt="${payload.description}" style="width:60px;height:60px; margin-right:10px;">
        <div>
          <strong>${payload.temp.toFixed(1)}°C</strong><br>
          <small style="text-transform:capitalize;">${payload.description}</small>
        </div>
      `;
      saveCache(payload);
    } catch (err) {
      // Erreur réseau/API → tente le cache
      showFromCache('Erreur chargement météo.');
    }
  }, (err) => {
    // Refus/timeout → tente le cache avec message adapté
    const msg = (err && err.code === 1)
      ? 'Autorisation géoloc. refusée.'
      : (err && err.code === 3)
        ? 'Géolocalisation trop lente (timeout).'
        : 'Géolocalisation indisponible.';
    showFromCache(msg);
  }, GEO_OPTS);
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

