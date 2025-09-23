const activities = [
  // Transport
  {
    name: "Car (Petrol) - per km",
    category: "transport",
    co2Value: 0.21,
    unit: "km",
  },
  {
    name: "Car (Diesel) - per km",
    category: "transport",
    co2Value: 0.17,
    unit: "km",
  },
  { name: "Bus - per km", category: "transport", co2Value: 0.08, unit: "km" },
  { name: "Train - per km", category: "transport", co2Value: 0.04, unit: "km" },
  {
    name: "Flight (Domestic) - per km",
    category: "transport",
    co2Value: 0.25,
    unit: "km",
  },
  {
    name: "Flight (International) - per km",
    category: "transport",
    co2Value: 0.15,
    unit: "km",
  },

  // Food
  { name: "Beef - per 100g", category: "food", co2Value: 6.0, unit: "100g" },
  { name: "Chicken - per 100g", category: "food", co2Value: 1.6, unit: "100g" },
  { name: "Fish - per 100g", category: "food", co2Value: 1.2, unit: "100g" },
  {
    name: "Vegetables - per 100g",
    category: "food",
    co2Value: 0.4,
    unit: "100g",
  },
  { name: "Dairy - per 100ml", category: "food", co2Value: 0.6, unit: "100ml" },
  { name: "Coffee - per cup", category: "food", co2Value: 0.05, unit: "cup" },

  // Energy
  {
    name: "Electricity - per kWh",
    category: "energy",
    co2Value: 0.4,
    unit: "kWh",
  },
  {
    name: "Natural Gas - per kWh",
    category: "energy",
    co2Value: 0.2,
    unit: "kWh",
  },
  {
    name: "Heating Oil - per liter",
    category: "energy",
    co2Value: 2.5,
    unit: "liter",
  },

  // Waste
  {
    name: "General Waste - per kg",
    category: "waste",
    co2Value: 0.5,
    unit: "kg",
  },
  { name: "Recycling - per kg", category: "waste", co2Value: 0.1, unit: "kg" },
];

// Auth + API helpers
const API_BASE = "/api";
let token = localStorage.getItem("token") || null;

async function apiFetch(url, options = {}) {
  const headers = options.headers || {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  headers["Content-Type"] = "application/json";
  const res = await fetch(API_BASE + url, { ...options, headers });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

async function registerUser(email, password, name) {
  const data = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  token = data.token;
  localStorage.setItem("token", token);
  localStorage.setItem("name", data.user.name);
  localStorage.setItem("email", data.user.email);
  return data.user;
}

async function loginUser(email, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  token = data.token;
  localStorage.setItem("token", token);
  localStorage.setItem("name", data.user.name);
  localStorage.setItem("email", data.user.email);
  return data.user;
}

function logoutUser() {
  token = null;
  localStorage.removeItem("token");
  localStorage.removeItem("name");
  localStorage.removeItem("email");
  alert("Logged out!");
}

// Activity logging
async function deleteActivity(logId, activityId) {
  return apiFetch(`/activities/${logId}/activities/${activityId}`, {
    method: "DELETE",
  });
}

function showLoader() {
  document.getElementById("loader").style.display = "block";
}
function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

async function logActivity(date, activity) {
  return apiFetch("/activities/log", {
    method: "POST",
    body: JSON.stringify({ date, activity }),
  });
}

async function getUserLogs(from, to) {
  const query = [];
  if (from) query.push(`from=${from}`);
  if (to) query.push(`to=${to}`);
  return apiFetch(`/activities/my-logs?${query.join("&")}`);
}

async function getWeeklySummary() {
  return apiFetch("/activities/weekly-summary");
}

async function getCommunityAverage() {
  return apiFetch("/activities/community-average");
}

async function getLeaderboard(days = 7) {
  return apiFetch(`/activities/leaderboard?days=${days}`);
}

// UI Elements
const form = document.getElementById("activity-form");
const logContainer = document.getElementById("log-container");
const summaryContainer = document.getElementById("summary");
const leaderboardContainer = document.getElementById("leaderboard");
const activitySelect = document.getElementById("activity-select");

// Populate dropdown
activities.forEach((act, i) => {
  const opt = document.createElement("option");
  opt.value = i;
  opt.textContent = act.name;
  activitySelect.appendChild(opt);
});

// Auto-fill on change
activitySelect.addEventListener("change", () => {
  const idx = activitySelect.value;
  if (idx !== "") {
    const act = activities[idx];
    document.getElementById("category").value = act.category;
    document.getElementById("unit").value = act.unit;
    document.getElementById("co2-value").value = act.co2Value;
  } else {
    document.getElementById("category").value = "";
    document.getElementById("unit").value = "";
    document.getElementById("co2-value").value = "";
  }
});

// Form handling
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!token) {
    alert("Please log in first!");
    return;
  }

  const idx = document.getElementById("activity-select").value;
  if (idx === "") {
    alert("Please select an activity");
    return;
  }

  const act = activities[idx];
  const activity = {
    name: act.name,
    category: act.category,
    unit: act.unit,
    quantity: parseFloat(document.getElementById("quantity").value),
    co2Value: act.co2Value,
  };

  const date =
    document.getElementById("date").value ||
    new Date().toISOString().split("T")[0];

  try {
    await logActivity(date, activity);
    await renderLogs();
    await renderSummary();
    await renderActivityTable();
    await renderEmissionTotal();
    await renderPieChart();
    await setupWebSocket();
    await loadWeeklyGoal();
    alert("Activity logged!");
    form.reset();
  } catch (err) {
    console.error(err);
    alert("Failed to log activity");
  }
});

// Rendering functions
async function renderLogs() {
  if (!token) return;

  const logs = await getUserLogs();
  const logContainer = document.getElementById("log-container");
  logContainer.innerHTML = "";

  logs.forEach((log) => {
    const total = log.activities
      .reduce((s, a) => s + (a.totalCO2 || 0), 0)
      .toFixed(2);

    const div = document.createElement("div");
    div.className = "log-day";

    const activityList = log.activities.length
      ? log.activities
          .map(
            (a) => `
        <li>
          ${a.name} - ${a.quantity} ${a.unit} → ${a.totalCO2} kg
          <button data-log="${log._id}" data-activity="${a._id}" class="delete-btn">🗑️</button>
        </li>`
          )
          .join("")
      : "<li>No activities logged</li>";

    div.innerHTML = `
      <h3>${new Date(log.date).toISOString().split("T")[0]}</h3>
      <p>Total: ${total} kg CO₂</p>
      <ul>${activityList}</ul>
    `;
    logContainer.appendChild(div);
  });

  // Attach delete handlers
  document.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      const logId = btn.dataset.log;
      const activityId = btn.dataset.activity;
      if (confirm("Delete this activity?")) {
        try {
          const res = await deleteActivity(logId, activityId);
          await renderLogs();
          await renderSummary();
          await renderActivityTable();
          await renderEmissionTotal();
          await renderPieChart();
          await setupWebSocket();
          await loadWeeklyGoal();
          alert("Activity deleted successfully!"); // show success only on success
        } catch (err) {
          console.error(err);
          alert("Failed to delete activity");
        }
      }
    })
  );
}

async function renderSummary() {
  if (!token) return;

  const { summary, streak } = await getWeeklySummary();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const fullSummary = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayData = summary.find((s) => s.date === dateStr);
    fullSummary.push({
      date: dateStr,
      total: dayData ? dayData.total : 0,
    });
  }

  summaryContainer.innerHTML = `
    <h3>Weekly Summary</h3>
    <ul>
      ${fullSummary.map((d) => `<li>${d.date}: ${d.total} kg</li>`).join("")}
    </ul>
    `;
}

async function renderLeaderboard() {
  if (!token) return;
  const leaders = await getLeaderboard(7);
  leaderboardContainer.innerHTML = `
    <h3>Leaderboard (7-day avg)</h3>
    <ol>
      ${leaders
        .map((u) => `<li>${u.name || u.email}: ${u.avgDaily} kg/day</li>`)
        .join("")}
    </ol>
  `;
}

async function getAllActivities(category = null) {
  let url = "/activities/all";
  if (category) url += `?category=${category}`;
  const data = await apiFetch(url);
  return data;
}

async function renderEmissionTotal() {
  if (!token) return;
  const data = await getAllActivities();
  const totalEmersion = document.getElementById("total-emissions");

  totalEmersion.textContent = `Total Emissions: ${data.totalCO2.toFixed(
    2
  )} kg CO₂ within ${
    data.total === 1 ? "1 activity" : `${data.total} activities`
  }`;
}

async function renderActivityTable(category = null) {
  if (!token) return;

  const data = await getAllActivities(category);

  const tbody = document.getElementById("activity-table-body");
  const totalEl = document.getElementById("activity-total");

  tbody.innerHTML = "";

  data.activities.forEach((a) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(a.date).toISOString().split("T")[0]}</td>
      <td>${a.name}</td>
      <td>${a.category}</td>
      <td>${a.quantity}</td>
      <td>${a.unit}</td>
      <td>${a.totalCO2.toFixed(2)} kg</td>
    `;
    tbody.appendChild(tr);
  });

  totalEl.textContent = `Total CO₂: ${data.totalCO2.toFixed(2)} kg across ${
    data.total
  } activities.`;
}

async function renderPieChart() {
  if (!token) return;

  const data = await getAllActivities();
  const chartSection = document.getElementById("chart-section");

  if (data.activities.length > 0) {
    chartSection.style.display = "block";

    const categoryTotals = {};
    data.activities.forEach((a) => {
      categoryTotals[a.category] =
        (categoryTotals[a.category] || 0) + a.totalCO2;
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    if (categoryChart && typeof categoryChart.destroy === "function") {
      categoryChart.destroy();
    }

    const ctx = document.getElementById("categoryChart").getContext("2d");
    categoryChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            label: "CO₂ by Category",
            data: values,
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
              "#FF9F40",
            ],
          },
        ],
      },
    });
  } else {
    chartSection.style.display = "none";
    if (categoryChart) {
      categoryChart.destroy();
      categoryChart = null;
    }
  }
}

async function loadWeeklyGoal() {
  if (!localStorage.getItem("token")) return;

  try {
    const res = await apiFetch("/activities/weekly-goal");
    document.getElementById(
      "goal-summary"
    ).textContent = `Emitted: ${res.totalCO2.toFixed(
      2
    )}kg CO2 this week. Goal: ${
      res.weeklyTarget
    }kg. Remaining: ${res.remaining.toFixed(2)}kg.`;
    document.getElementById("goal-tip").textContent = res.tip;
    document.getElementById("weekly-goal-section").style.display = "block";
  } catch (err) {
    console.error(err);
  }
}

// Call this after login
if (localStorage.getItem("token")) {
  loadWeeklyGoal();
}

function setupWebSocket() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const ws = new WebSocket(`ws://localhost:4000?token=${token}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.tip) {
      document.getElementById("goal-tip").textContent = data.tip;
    }
  };
}

// Call after login or page load
setupWebSocket();

// Event listeners
document
  .getElementById("filter-category")
  .addEventListener("change", async (e) => {
    await renderActivityTable(e.target.value || null);
  });

// Initial load
window.addEventListener("DOMContentLoaded", async () => {
  if (token) {
    await renderLogs();
    await renderSummary();
    await renderActivityTable();
    await renderEmissionTotal();
    await renderPieChart();
    await loadWeeklyGoal();
    await setupWebSocket();
    // await renderLeaderboard();
  }
});
