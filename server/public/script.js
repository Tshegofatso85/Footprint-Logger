// =====================
// Auth + API helpers
// =====================
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
  return data.user;
}

async function loginUser(email, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  token = data.token;
  localStorage.setItem("token", token);
  return data.user;
}

function logoutUser() {
  token = null;
  localStorage.removeItem("token");
  alert("Logged out!");
}

// =====================
// Activity logging
// =====================
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

async function getUserTotal(date) {
  return apiFetch(`/activities/my-total?date=${date}`);
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

// =====================
// UI Elements
// =====================
const form = document.getElementById("activity-form");
const logContainer = document.getElementById("log-container");
const summaryContainer = document.getElementById("summary");
const leaderboardContainer = document.getElementById("leaderboard");

// =====================
// Form handling
// =====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!token) {
    alert("Please log in first!");
    return;
  }

  const activity = {
    name: document.getElementById("activity-name").value,
    category: document.getElementById("category").value,
    unit: document.getElementById("unit").value,
    quantity: parseFloat(document.getElementById("quantity").value),
    co2Value: parseFloat(document.getElementById("co2-value").value),
  };

  const date =
    document.getElementById("date").value ||
    new Date().toISOString().split("T")[0];

  try {
    await logActivity(date, activity);
    await renderLogs();
    await renderSummary();
    alert("Activity logged!");
    form.reset();
  } catch (err) {
    console.error(err);
    alert("Failed to log activity");
  }
});

// =====================
// Rendering functions
// =====================
async function renderLogs() {
  if (!token) return;
  const logs = await getUserLogs();
  logContainer.innerHTML = "";
  logs.forEach((log) => {
    const total = log.activities.reduce((s, a) => s + a.totalCO2, 0).toFixed(2);
    const div = document.createElement("div");
    div.className = "log-day";
    div.innerHTML = `<h3>${log.date.split("T")[0]}</h3>
      <p>Total: ${total} kg CO₂</p>
      <ul>${log.activities
        .map(
          (a) =>
            `<li>${a.name} - ${a.quantity} ${a.unit} → ${a.totalCO2} kg</li>`
        )
        .join("")}</ul>`;
    logContainer.appendChild(div);
  });
}

async function renderSummary() {
  if (!token) return;
  const { summary, streak } = await getWeeklySummary();
  summaryContainer.innerHTML = `
    <h3>Weekly Summary</h3>
    <ul>
      ${summary.map((d) => `<li>${d.date}: ${d.total} kg</li>`).join("")}
    </ul>
    <p>Streak: ${streak} days</p>
  `;

  const community = await getCommunityAverage();
  summaryContainer.innerHTML += `
    <h3>Community Average</h3>
    <p>Users: ${community.usersCount}</p>
    <p>Average per user: ${community.avgPerUser} kg</p>
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

// =====================
// Initial load
// =====================
window.addEventListener("DOMContentLoaded", async () => {
  if (token) {
    await renderLogs();
    await renderSummary();
    await renderLeaderboard();
  }
});
