// ---------- GLOBAL CONFIG ----------

const STORAGE_KEY = "habit-tracker-v1";

let habits = [
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

// matrix[habitIndex][dayIndex] = true/false
let matrix = [];

// chart instance
let completionChart = null;

// ---------- MAIN APP ----------

window.addEventListener("DOMContentLoaded", () => {
  // DOM refs
  const themeToggleBtn = document.getElementById("themeToggle");
  const dashboardSection = document.querySelector(".dashboard");
  const tableEl = dashboardSection.querySelector(".habit-table");
  const completionCanvas = dashboardSection.querySelector(".habit-line-chart");

  const habitForm = document.getElementById("habitForm");
  const habitNameInput = document.getElementById("habitName");
  const habitIconInput = document.getElementById("habitIcon");
  const habitSubmitBtn = document.getElementById("habitSubmit");
  const habitCancelBtn = document.getElementById("habitCancelEdit");
  const habitListEl = document.getElementById("habitList");

  let editingIndex = null;

  // ---------- THEME ----------

  function syncThemeFromStorage() {
    try {
      const saved = localStorage.getItem("habit-theme");
      if (saved === "dark") {
        document.body.classList.add("dark");
        themeToggleBtn.textContent = "🌙 Dark";
      } else {
        document.body.classList.remove("dark");
        themeToggleBtn.textContent = "🌞 Light";
      }
    } catch (e) {}
  }

  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const mode = document.body.classList.contains("dark") ? "dark" : "light";
    try {
      localStorage.setItem("habit-theme", mode);
    } catch (e) {}
    syncThemeFromStorage();
  });

  syncThemeFromStorage();

  // ---------- STORAGE ----------

  function normalizeMatrix() {
    while (matrix.length < habits.length) {
      matrix.push(Array.from({ length: daysInMonth }, () => false));
    }
    while (matrix.length > habits.length) {
      matrix.pop();
    }

    for (let i = 0; i < matrix.length; i++) {
      while (matrix[i].length < daysInMonth) matrix[i].push(false);
      while (matrix[i].length > daysInMonth) matrix[i].pop();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ habits, matrix }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (Array.isArray(data.habits) && Array.isArray(data.matrix)) {
        habits = data.habits;
        matrix = data.matrix;
        normalizeMatrix();
        return true;
      }
    } catch (e) {}
    return false;
  }

  // ---------- DATA HELPERS ----------

  function generateRandomCompletion() {
    const m = [];
    for (let h = 0; h < habits.length; h++) {
      const row = [];
      for (let d = 0; d < daysInMonth; d++) {
        row.push(Math.random() < 0.5);
      }
      m.push(row);
    }
    return m;
  }

  // 🔥 NOW RETURNS 1–20 (habit count), NOT 0–100%
  function calculateDailyCompletion(m) {
    const daily = [];
    for (let d = 0; d < daysInMonth; d++) {
      let done = 0;
      for (let h = 0; h < habits.length; h++) {
        if (m[h][d]) done++;
      }
      daily.push(done); // 👈 count, not percentage
    }
    return daily;
  }

  function calculateGlobalTotals(m) {
    let total = 0;
    for (let h = 0; h < habits.length; h++) {
      for (let d = 0; d < daysInMonth; d++) {
        if (m[h][d]) total++;
      }
    }
    const totalPossible = habits.length * daysInMonth;
    const overall = Math.round((total / totalPossible) * 100);
    return { totalCompleted: total, overallPercent: overall };
  }

  // ---------- CHARTS ----------

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
          y: {
            min: 0,
            max: 20, // 👈 FIXED SCALE: 0 to 20
            ticks: {
              stepSize: 2,
              color: "#555"
            },
            grid: { display: false }
          }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  function updateCharts() {
    const data = calculateDailyCompletion(matrix);

    if (!completionChart) {
      completionChart = createLineChart(
        completionCanvas,
        data,
        "#7bc96f",
        "rgba(123, 201, 111, 0.25)",
        "Completed Habits" // 👈 updated label
      );
    } else {
      completionChart.data.datasets[0].data = data;
      completionChart.update();
    }
  }

  // ---------- TABLE ----------

  function renderTable() {
    normalizeMatrix();

    const theadRow = tableEl.querySelector("thead tr");
    const tbody = tableEl.querySelector("tbody");

    theadRow.innerHTML = '<th class="habit-col">Habit</th>';
    tbody.innerHTML = "";

    for (let d = 0; d < daysInMonth; d++) {
      const th = document.createElement("th");
      th.innerHTML = `${dayLabels[d % 7]}<br>${d + 1}`;
      theadRow.appendChild(th);
    }

    habits.forEach((habit, h) => {
      const tr = document.createElement("tr");

      const cell = document.createElement("td");
      cell.classList.add("habit-col");
      cell.innerHTML = `<div class="habit-name"><span class="habit-emoji">${habit.icon}</span>${habit.name}</div>`;
      tr.appendChild(cell);

      for (let d = 0; d < daysInMonth; d++) {
        const td = document.createElement("td");
        const box = document.createElement("div");
        box.classList.add("checkbox");
        if (matrix[h][d]) box.classList.add("checked");
        box.dataset.habit = h;
        box.dataset.day = d;
        td.appendChild(box);
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });
  }

  // ---------- GLOBAL STATS ----------

  function refreshGlobalStats() {
    const { totalCompleted, overallPercent } = calculateGlobalTotals(matrix);
    document.getElementById("totalHabits").textContent = habits.length;
    document.getElementById("completedHabitsTotal").textContent = totalCompleted;
    document.getElementById("overallProgressPercent").textContent =
      overallPercent + "%";
    document.getElementById("overallProgressFill").style.width =
      overallPercent + "%";
  }

  // ---------- HABIT MANAGEMENT ----------

  function updateHabitFormMode() {
    habitSubmitBtn.textContent = editingIndex === null ? "Add Habit" : "Save Habit";
    habitCancelBtn.hidden = editingIndex === null;
  }

  function renderHabitList() {
    habitListEl.innerHTML = "";
    habits.forEach((habit, i) => {
      habitListEl.innerHTML += `
      <li>
        <span class="label">${habit.icon} ${habit.name}</span>
        <div class="habit-actions">
          <button data-action="edit" data-index="${i}">Edit</button>
          <button data-action="delete" data-index="${i}">Delete</button>
        </div>
      </li>`;
    });
  }

  habitForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = habitNameInput.value.trim();
    const icon = (habitIconInput.value.trim() || "✅").slice(0, 4);
    if (!name) return;

    if (editingIndex === null) habits.push({ name, icon });
    else habits[editingIndex] = { name, icon };

    editingIndex = null;
    habitForm.reset();

    normalizeMatrix();
    renderHabitList();
    renderTable();
    updateCharts();
    refreshGlobalStats();
    saveState();
    updateHabitFormMode();
  });

  habitCancelBtn.addEventListener("click", () => {
    editingIndex = null;
    habitForm.reset();
    updateHabitFormMode();
  });

  habitListEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const index = Number(btn.dataset.index);
    if (btn.dataset.action === "edit") {
      editingIndex = index;
      habitNameInput.value = habits[index].name;
      habitIconInput.value = habits[index].icon;
      updateHabitFormMode();
    } else {
      habits.splice(index, 1);
      normalizeMatrix();
      renderHabitList();
      renderTable();
      updateCharts();
      refreshGlobalStats();
      saveState();
    }
  });

  // ---------- CHECKBOX TICKS ----------

  dashboardSection.addEventListener("click", (e) => {
    const box = e.target.closest(".checkbox");
    if (!box) return;

    const h = Number(box.dataset.habit);
    const d = Number(box.dataset.day);

    matrix[h][d] = !matrix[h][d];
    box.classList.toggle("checked");

    updateCharts();
    refreshGlobalStats();
    saveState();
  });

  // ---------- INIT ----------

  if (!loadState()) {
    matrix = generateRandomCompletion();
    normalizeMatrix();
    saveState();
  }

  normalizeMatrix();
  renderHabitList();
  renderTable();
  updateCharts();
  refreshGlobalStats();
  updateHabitFormMode();
});
