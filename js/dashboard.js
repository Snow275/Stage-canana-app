// js/dashboard.js
import {
  subscribeTasks,
  addTask,
  removeTask
} from "./tasks.js";
import { getBudgetData } from "./budget.js";
import { getInvoices } from "./invoices.js";

// Ta clé OpenWeather (si tu préfères, mets-la dans un .env)
const WEATHER_API_KEY = "600c8b2ce3f1613f3936612c9bbc42ff";

export function initDashboard() {
  // Références DOM
  const form = document.getElementById("dash-task-form");
  const input = document.getElementById("dash-task-input");
  const list = document.getElementById("dashboard-tasks");
  const weatherDiv = document.getElementById("dashboard-weather");
  const budCtx = document.getElementById("dashboard-budget-chart").getContext("2d");
  const invList = document.getElementById("dashboard-invoices");

  // — A) Tâches urgentes (top 3 récentes)
  subscribeTasks(tasks => {
    list.innerHTML = "";
    tasks
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3)
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
    const text = input.value.trim();
    if (!text) return;
    addTask({ text, createdAt: Date.now() }).then(() => {
      input.value = "";
    });
  });

  // — B) Météo en temps réel
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${WEATHER_API_KEY}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("API météo ko");
        const data = await resp.json();
        const { temp } = data.main;
        const { description, icon } = data.weather[0];
        weatherDiv.innerHTML = `
          <img src="https://openweathermap.org/img/wn/${icon}@2x.png"
               alt="${description}"
               style="width:50px;height:50px;">
          <span>${temp.toFixed(1)}°C – 
            <small style="text-transform:capitalize">${description}</small>
          </span>
        `;
      } catch {
        weatherDiv.textContent = "Erreur météo";
      }
    }, () => {
      weatherDiv.textContent = "Géoloc refusée";
    });
  } else {
    weatherDiv.textContent = "Géoloc non supportée";
  }

  // — C) Budget (récap doughnut)
  const budChart = new Chart(budCtx, {
    type: "doughnut",
    data: getBudgetData(),
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
  function updateBudgetChart() {
    budChart.data = getBudgetData();
    budChart.update();
  }
  // On ne gère pas ici l'ajout (déjà dans la page Finances)
  updateBudgetChart();

  // — D) Factures à venir
  function renderInvoices() {
    invList.innerHTML = "";
    getInvoices()
      .filter(i => !i.paid)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(i => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = `${i.date} – ${i.amount.toFixed(2)}€`;
        invList.appendChild(li);
      });
  }
  renderInvoices();
}
