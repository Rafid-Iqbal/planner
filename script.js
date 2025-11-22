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
    } catch (e) {
      // ignore theme storage errors
    }
  }

  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const mode = document.body.classList.contains("dark") ? "dark" : "light";
    try {
      localStorage.setItem("habit-theme", mode);
    } catch (e) {
      // ignore storage errors
    }
    syncThemeFromStorage();
  });

  syncThemeFromStorage();

  // ---------- STORAGE ----------

  function normalizeMatrix() {
    // rows
    while (matrix.length < habits.length) {
      matrix.push(Array.from({ length: daysInMonth }, () => false));
    }
    while (matrix.length > habits.length) {
      matrix.pop();
    }

    // columns
    for (let i = 0; i < matrix.length; i++) {
      if (!Array.isArray(matrix[i])) matrix[i] = [];
      while (matrix[i].length < daysInMonth) matrix[i].push(false);
      while (matrix[i].length > daysInMonth) matrix[i].pop();
    }
  }

  function saveState() {
    try {
      const payload = { habits, matrix };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("localStorage save failed", e);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.habits) && Array.isArray(parsed.matrix)) {
        habits = parsed.habits;
        matrix = parsed.matrix.map(row => row.map(v => !!v));
        normalizeMatrix();
        return true;
      }
    } catch (e) {
      console.warn("localStorage load failed", e);
    }
    return false;
  }

  // ---------- DATA HELPERS ----------

  function generateRandomCompletion() {
    const m = [];
    for (let h = 0; h < habits.length; h++) {
      const row = [];
      for (let d = 0; d < daysInMonth; d++) {
        const baseChance = 0.6;
        const modifier = (Math.sin(d / 4) + 1) / 4;
        const chance = baseChance + modifier - 0.1;
        row.push(Math.random() < chance);
      }
      m.push(row);
    }
    return m;
  }

  function calculateDailyCompletion(m) {
    const daily = [];
    for (let d = 0; d < daysInMonth; d++) {
      let done = 0;
      for (let h = 0; h < habits.length; h++) {
        if (m[h]?.[d]) done++;
      }
      const denom = Math.max(habits.length, 1);
      daily.push((done / denom) * 100);
    }
    return daily;
  }

  function calculateGlobalTotals(m) {
    let totalCompleted = 0;
    for (let h = 0; h < habits.length; h++) {
      for (let d = 0; d < daysInMonth; d++) {
        if (m[h]?.[d]) totalCompleted++;
      }
    }
    const totalPossible = Math.max(habits.length * daysInMonth, 1);
    const overallPercent = Math.round((totalCompleted / totalPossible) * 100);
    return { totalCompleted, overallPercent };
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
          y: { ticks: { color: "#555" }, grid: { display: false } }
        },
        responsive: true,
        maintainAspectRatio: false // height controlled by CSS aspect-ratio
      }
    });
  }

  function updateCharts() {
    const completionData = calculateDailyCompletion(matrix);

    if (!completionChart) {
      completionChart = createLineChart(
        completionCanvas,
        completionData,
        "#7bc96f",
        "rgba(123, 201, 111, 0.25)",
        "Completion %"
      );
    } else {
      completionChart.data.datasets[0].data = completionData;
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

    // day headers
    for (let d = 0; d < daysInMonth; d++) {
      const th = document.createElement("th");
      const dayNum = d + 1;
      const weekDay = dayLabels[d % 7];
      th.innerHTML = `${weekDay}<br>${dayNum}`;
      theadRow.appendChild(th);
    }

    // rows
    habits.forEach((habit, hIndex) => {
      const tr = document.createElement("tr");

      const habitCell = document.createElement("td");
      habitCell.classList.add("habit-col");

      const habitWrap = document.createElement("div");
      habitWrap.classList.add("habit-name");
      const emojiSpan = document.createElement("span");
      emojiSpan.classList.add("habit-emoji");
      emojiSpan.textContent = habit.icon || "✅";

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
        if (matrix[hIndex]?.[d]) box.classList.add("checked");
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
    if (editingIndex === null) {
      habitSubmitBtn.textContent = "Add Habit";
      habitCancelBtn.hidden = true;
    } else {
      habitSubmitBtn.textContent = "Save Habit";
      habitCancelBtn.hidden = false;
    }
  }

  function renderHabitList() {
    habitListEl.innerHTML = "";
    habits.forEach((habit, index) => {
      const li = document.createElement("li");

      const labelSpan = document.createElement("span");
      labelSpan.classList.add("label");
      labelSpan.textContent = `${habit.icon || "✅"} ${habit.name}`;

      const actionsDiv = document.createElement("div");
      actionsDiv.classList.add("habit-actions");

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.dataset.action = "edit";
      editBtn.dataset.index = String(index);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.dataset.action = "delete";
      deleteBtn.dataset.index = String(index);

      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);

      li.appendChild(labelSpan);
      li.appendChild(actionsDiv);
      habitListEl.appendChild(li);
    });
  }

  habitForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = habitNameInput.value.trim();
    const icon = (habitIconInput.value.trim() || "✅").slice(0, 4);
    if (!name) return;

    if (editingIndex === null) {
      habits.push({ name, icon });
    } else {
      habits[editingIndex] = { name, icon };
    }

    normalizeMatrix();
    renderTable();
    renderHabitList();
    updateCharts();
    refreshGlobalStats();
    saveState();

    habitForm.reset();
    editingIndex = null;
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
    if (Number.isNaN(index)) return;

    if (btn.dataset.action === "edit") {
      editingIndex = index;
      habitNameInput.value = habits[index].name;
      habitIconInput.value = habits[index].icon;
      updateHabitFormMode();
      habitNameInput.focus();
    } else if (btn.dataset.action === "delete") {
      habits.splice(index, 1);
      normalizeMatrix();
      renderTable();
      renderHabitList();
      updateCharts();
      refreshGlobalStats();
      saveState();

      if (editingIndex === index) {
        editingIndex = null;
        habitForm.reset();
      } else if (editingIndex !== null && index < editingIndex) {
        editingIndex -= 1;
      }
      updateHabitFormMode();
    }
  });

  // ---------- CHECKBOX TICKS ----------

  dashboardSection.addEventListener("click", (e) => {
    const box = e.target.closest(".checkbox");
    if (!box || !dashboardSection.contains(box)) return;

    const hIndex = Number(box.dataset.habit);
    const dIndex = Number(box.dataset.day);
    if (Number.isNaN(hIndex) || Number.isNaN(dIndex)) return;

    matrix[hIndex][dIndex] = !matrix[hIndex][dIndex];
    box.classList.toggle("checked");

    updateCharts();
    refreshGlobalStats();
    saveState();
  });

  // ---------- INIT ----------

  const hasSaved = loadState();
  if (!hasSaved) {
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
