// ---------- CONFIG ----------

const habits = [
  { name: "Wake up at 6:00", icon: "⏰" },
  { name: "Gym", icon: "💪" },
  { name: "Reading / Learning", icon: "📚" },
  { name: "Day Planning", icon: "📝" },
  { name: "Budget Tracking", icon: "💰" },
  { name: "Project Work", icon: "💻" },
  { name: "No Alcohol", icon: "🚫🍺" },
  { name: "Social Media Detox", icon: "📵" },
  { name: "Goal Journaling", icon: "📒" },
  { name: "Cold Shower", icon: "🚿" }
];

const daysInMonth = 30;
const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ---------- THEME TOGGLE ----------

const themeToggleBtn = document.getElementById("themeToggle");

function syncThemeFromStorage() {
  const saved = localStorage.getItem("habit-theme");
  if (saved === "dark") {
    document.body.classList.add("dark");
    themeToggleBtn.textContent = "🌙 Dark";
  } else {
    document.body.classList.remove("dark");
    themeToggleBtn.textContent = "🌞 Light";
  }
}

themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const mode = document.body.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem("habit-theme", mode);
  syncThemeFromStorage();
});

syncThemeFromStorage();

// ---------- DATA GENERATION ----------

function generateRandomCompletion() {
  const matrix = [];
  for (let h = 0; h < habits.length; h++) {
    const row = [];
    for (let d = 0; d < daysInMonth; d++) {
      const baseChance = 0.6;
      const modifier = (Math.sin(d / 4) + 1) / 4;
      const chance = baseChance + modifier - 0.1;
      row.push(Math.random() < chance);
    }
    matrix.push(row);
  }
  return matrix;
}

// ---------- CALCULATIONS ----------

function calculateDailyCompletion(matrix) {
  const daily = [];
  for (let d = 0; d < daysInMonth; d++) {
    let done = 0;
    for (let h = 0; h < habits.length; h++) {
      if (matrix[h][d]) done++;
    }
    daily.push((done / habits.length) * 100);
  }
  return daily;
}

function calculateHabitTotals(matrix) {
  const totals = [];
  for (let h = 0; h < habits.length; h++) {
    let count = 0;
    for (let d = 0; d < daysInMonth; d++) {
      if (matrix[h][d]) count++;
    }
    totals.push(count);
  }
  return totals;
}

function calculateGlobalTotals(matrix) {
  let totalCompleted = 0;
  for (let h = 0; h < habits.length; h++) {
    for (let d = 0; d < daysInMonth; d++) {
      if (matrix[h][d]) totalCompleted++;
    }
  }
  const totalPossible = habits.length * daysInMonth;
  const overallPercent = Math.round((totalCompleted / totalPossible) * 100);
  return { totalCompleted, overallPercent };
}

// ---------- TABLE CREATION ----------

function createTableForDashboard(dashboardEl, matrix) {
  const table = dashboardEl.querySelector(".habit-table");
  const theadRow = table.querySelector("thead tr");
  const tbody = table.querySelector("tbody");

  // Add day headers
  for (let d = 0; d < daysInMonth; d++) {
    const th = document.createElement("th");
    const dayNum = d + 1;
    const weekDay = dayLabels[d % 7];
    th.innerHTML = `${weekDay}<br>${dayNum}`;
    theadRow.appendChild(th);
  }

  // Build body
  habits.forEach((habit, hIndex) => {
    const tr = document.createElement("tr");

    const habitCell = document.createElement("td");
    habitCell.classList.add("habit-col");

    const habitWrap = document.createElement("div");
    habitWrap.classList.add("habit-name");
    const emojiSpan = document.createElement("span");
    emojiSpan.classList.add("habit-emoji");
    emojiSpan.textContent = habit.icon;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = habit.name;

    habitWrap.appendChild(emojiSpan);
    habitWrap.appendChild(nameSpan);
    habitCell.appendChild(habitWrap);
    tr.appendChild(habitCell);

    for (let d = 0; d < daysInMonth; d++) {
      const td = document.createElement("td");
      const box = document.createElement("div");
      box.classList.add("checkbox");
      box.dataset.habit = String(hIndex);
      box.dataset.day = String(d);
      if (matrix[hIndex][d]) box.classList.add("checked");
      td.appendChild(box);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });
}

// ---------- CHART HELPERS ----------

function createBarChart(canvas, habitTotals) {
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: habits.map(h => h.name),
      datasets: [
        {
          label: "Completed days",
          data: habitTotals,
          backgroundColor: "rgba(123, 201, 111, 0.8)"
        }
      ]
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "#555" },
          grid: { display: false }
        },
        y: {
          ticks: { color: "#555", font: { size: 10 } },
          grid: { display: false }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function createLineChart(canvas, data, color, softColor, label) {
  return new Chart(canvas, {
    type: "line",
    data: {
      labels: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      datasets: [
        {
          label,
          data,
          tension: 0.4,
          borderWidth: 2,
          fill: true,
          borderColor: color,
          backgroundColor: softColor,
          pointRadius: 0
        }
      ]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { display: false }, grid: { display: false } },
        y: { ticks: { color: "#555" }, grid: { display: false } }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Recompute and update charts/statistics for one dashboard
function refreshDashboard(dashboardEl, matrix, isMaster) {
  const dailyCompletion = calculateDailyCompletion(matrix);
  const habitTotals = calculateHabitTotals(matrix);

  const charts = dashboardEl._charts;

  // update bar chart
  charts.bar.data.datasets[0].data = habitTotals;
  charts.bar.update();

  // completion line
  charts.completion.data.datasets[0].data = dailyCompletion;
  charts.completion.update();

  // motivation is completion + some fixed curve
  const motivationData = dailyCompletion.map((p, i) => {
    const noise = Math.sin(i / 3) * 10 - 15;
    const val = p + noise;
    return Math.max(15, Math.min(100, val));
  });
  charts.motivation.data.datasets[0].data = motivationData;
  charts.motivation.update();

  // if this is the main dashboard, update top summary
  if (isMaster) {
    const { totalCompleted, overallPercent } = calculateGlobalTotals(matrix);
    document.getElementById("totalHabits").textContent = habits.length;
    document.getElementById("completedHabitsTotal").textContent =
      totalCompleted;
    document.getElementById("overallProgressPercent").textContent =
      overallPercent + "%";
    document.getElementById("overallProgressFill").style.width =
      overallPercent + "%";
  }
}

// ---------- INITIALIZE ONE DASHBOARD ----------

function initDashboard(dashboardEl, index) {
  const isMaster = index === 0;

  // matrix for this dashboard
  const matrix = generateRandomCompletion();
  dashboardEl._matrix = matrix;

  // table
  createTableForDashboard(dashboardEl, matrix);

  // charts
  const barCanvas = dashboardEl.querySelector(".habit-bar-chart");
  const habitLineCanvas = dashboardEl.querySelector(".habit-line-chart");
  const motivationLineCanvas = dashboardEl.querySelector(
    ".motivation-line-chart"
  );

  const habitTotals = calculateHabitTotals(matrix);
  const dailyCompletion = calculateDailyCompletion(matrix);

  const barChart = createBarChart(barCanvas, habitTotals);
  const completionChart = createLineChart(
    habitLineCanvas,
    dailyCompletion,
    "#7bc96f",
    "rgba(123, 201, 111, 0.25)",
    "Completion %"
  );

  const motivationData = dailyCompletion.map((p, i) => {
    const noise = Math.sin(i / 3) * 10 - 15;
    const val = p + noise;
    return Math.max(15, Math.min(100, val));
  });

  const motivationChart = createLineChart(
    motivationLineCanvas,
    motivationData,
    "#f3a6c4",
    "rgba(243, 166, 196, 0.3)",
    "Motivation"
  );

  dashboardEl._charts = {
    bar: barChart,
    completion: completionChart,
    motivation: motivationChart
  };

  // initial summary from first dashboard
  if (isMaster) {
    const { totalCompleted, overallPercent } = calculateGlobalTotals(matrix);
    document.getElementById("totalHabits").textContent = habits.length;
    document.getElementById("completedHabitsTotal").textContent =
      totalCompleted;
    document.getElementById("overallProgressPercent").textContent =
      overallPercent + "%";
    document.getElementById("overallProgressFill").style.width =
      overallPercent + "%";
  }

  // click handler for checkboxes (event delegation)
  dashboardEl.addEventListener("click", (e) => {
    const box = e.target.closest(".checkbox");
    if (!box || !dashboardEl.contains(box)) return;

    const hIndex = Number(box.dataset.habit);
    const dIndex = Number(box.dataset.day);
    if (Number.isNaN(hIndex) || Number.isNaN(dIndex)) return;

    // toggle data
    matrix[hIndex][dIndex] = !matrix[hIndex][dIndex];

    // toggle style
    box.classList.toggle("checked");

    // refresh charts & global stats
    refreshDashboard(dashboardEl, matrix, isMaster);
  });
}

// ---------- BOOTSTRAP ----------

document.querySelectorAll(".dashboard").forEach((dash, idx) => {
  initDashboard(dash, idx);
});
