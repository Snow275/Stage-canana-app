// js/dashboard.js
import { subscribeTasks, addTask, removeTask } from "./tasks.js";
import { getBudgetData }                     from "./budget.js";
import { getInvoices }                       from "./invoices.js";

const WEATHER_API_KEY = '600c8b2ce3f1613f3936612c9bbc42ff';

export let myCalendar;  // exposé pour forcer son redraw depuis app.js si besoin

export function initDashboard() {
  console.log('⚙️ initDashboard()');

  // ── A) Tâches urgentes ───────────────────────────────────────
  const form     = document.getElementById("dash-task-form");
  const input    = document.getElementById("dash-task-input");
  const list     = document.getElementById("dashboard-tasks");

  subscribeTasks(tasks => {
    list.innerHTML = "";
    tasks
      .sort((a,b)=> b.createdAt - a.createdAt)
      .slice(0,3)
      .forEach(t => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";
        li.textContent = t.text;
        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-outline-danger";
        btn.textContent = "✖";
        btn.onclick = () => removeTask(t.id);
        li.appendChild(btn);
        list.appendChild(li);
      });
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    addTask(txt).then(() => input.value = "");
  });


  // ── B) Météo en temps réel ───────────────────────────────────
  const weatherContainer = document.getElementById("dashboard-weather");
  if (!navigator.geolocation) {
    weatherContainer.textContent = "📍 Géo non supportée";
  } else {
    weatherContainer.textContent = "Chargement météo…";
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const resp = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}` +
          `&units=metric&lang=fr&appid=${WEATHER_API_KEY}`
        );
        if (!resp.ok) throw new Error();
        const data = await resp.json();
        const { temp } = data.main;
        const { description, icon } = data.weather[0];
        weatherContainer.innerHTML = `
          <img src="https://openweathermap.org/img/wn/${icon}@2x.png"
               alt="${description}" style="width:40px;height:40px;margin-right:8px;">
          <div>
            <strong>${temp.toFixed(1)}°C</strong><br>
            <small style="text-transform:capitalize;">${description}</small>
          </div>
        `;
      } catch {
        weatherContainer.textContent = "Erreur charg. météo";
      }
    }, _=> weatherContainer.textContent = "📍 Géo refusée");
  }


  // ── C) Budget (récap) ───────────────────────────────────────
  const ctx = document.getElementById("dashboard-budget-chart").getContext("2d");
  const chart = new Chart(ctx, {
    type: "doughnut",
    data: getBudgetData(),
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
  function updateBudget() {
    chart.data = getBudgetData();
    chart.update();
  }
  updateBudget();


  // ── D) Factures à venir ──────────────────────────────────────
  const invList = document.getElementById("dashboard-invoices");
  function renderInvs() {
    invList.innerHTML = "";
    getInvoices()
      .filter(i=> !i.paid)
      .sort((a,b)=> new Date(a.date)-new Date(b.date))
      .forEach(i=>{
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = `${i.date} – ${i.amount.toFixed(2)}€`;
        invList.appendChild(li);
      });
  }
  renderInvs();

  console.log('✅ Dashboard initialisé');
}
// js/dashboard.js
import { subscribeTasks, addTask, removeTask } from "./tasks.js";
import { getBudgetData }                     from "./budget.js";
import { getInvoices }                       from "./invoices.js";

const WEATHER_API_KEY = '600c8b2ce3f1613f3936612c9bbc42ff';

export let myCalendar;  // exposé pour forcer son redraw depuis app.js si besoin

export function initDashboard() {
  console.log('⚙️ initDashboard()');

  // ── A) Tâches urgentes ───────────────────────────────────────
  const form     = document.getElementById("dash-task-form");
  const input    = document.getElementById("dash-task-input");
  const list     = document.getElementById("dashboard-tasks");

  subscribeTasks(tasks => {
    list.innerHTML = "";
    tasks
      .sort((a,b)=> b.createdAt - a.createdAt)
      .slice(0,3)
      .forEach(t => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";
        li.textContent = t.text;
        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-outline-danger";
        btn.textContent = "✖";
        btn.onclick = () => removeTask(t.id);
        li.appendChild(btn);
        list.appendChild(li);
      });
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    addTask(txt).then(() => input.value = "");
  });


  // ── B) Météo en temps réel ───────────────────────────────────
  const weatherContainer = document.getElementById("dashboard-weather");
  if (!navigator.geolocation) {
    weatherContainer.textContent = "📍 Géo non supportée";
  } else {
    weatherContainer.textContent = "Chargement météo…";
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const resp = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}` +
          `&units=metric&lang=fr&appid=${WEATHER_API_KEY}`
        );
        if (!resp.ok) throw new Error();
        const data = await resp.json();
        const { temp } = data.main;
        const { description, icon } = data.weather[0];
        weatherContainer.innerHTML = `
          <img src="https://openweathermap.org/img/wn/${icon}@2x.png"
               alt="${description}" style="width:40px;height:40px;margin-right:8px;">
          <div>
            <strong>${temp.toFixed(1)}°C</strong><br>
            <small style="text-transform:capitalize;">${description}</small>
          </div>
        `;
      } catch {
        weatherContainer.textContent = "Erreur charg. météo";
      }
    }, _=> weatherContainer.textContent = "📍 Géo refusée");
  }


  // ── C) Budget (récap) ───────────────────────────────────────
  const ctx = document.getElementById("dashboard-budget-chart").getContext("2d");
  const chart = new Chart(ctx, {
    type: "doughnut",
    data: getBudgetData(),
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
  function updateBudget() {
    chart.data = getBudgetData();
    chart.update();
  }
  updateBudget();


  // ── D) Factures à venir ──────────────────────────────────────
  const invList = document.getElementById("dashboard-invoices");
  function renderInvs() {
    invList.innerHTML = "";
    getInvoices()
      .filter(i=> !i.paid)
      .sort((a,b)=> new Date(a.date)-new Date(b.date))
      .forEach(i=>{
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = `${i.date} – ${i.amount.toFixed(2)}€`;
        invList.appendChild(li);
      });
  }
  renderInvs();

  console.log('✅ Dashboard initialisé');
}
