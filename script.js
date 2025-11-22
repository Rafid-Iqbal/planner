// ---------- CONFIG ----------

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

const dashboards = []; // store per-dashboard state

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

// ---------- DATA HELPERS ----------

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

function calculateDailyCompletion(matrix) {
  const daily = [];
  for (let d = 0; d < daysInMonth; d++) {
    let done = 0;
    for (let h = 0; h < habits.length; h++) {
      if (matrix[h]?.[d]) done++;
    }
    daily.push((done / Math.max(habits.length, 1)) * 100);
  }
  return daily;
}

function calculateGlobalTotals(matrix) {
  let totalCompleted = 0;
  for (let h = 0; h < habits.length; h++) {
    for (let d = 0; d < daysInMonth; d++) {
      if (matrix[h]?.[d]) totalCompleted++;
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
      maintainAspectRatio: false
    }
  });
}

// ---------- RENDERING DASHBOARDS ----------

function renderDashboard(dashboard) {
  const { sectionEl, tableEl, matrix, isMaster } = dashboard;

  // Adjust matrix rows to current habits length
  while (matrix.length < habits.length) {
    matrix.push(Array.from({ length: daysInMonth }, () => false));
  }
  while (matrix.length > habits.length) {
    matrix.pop();
  }

  const theadRow = tableEl.querySelector("thead tr");
  const tbody = tableEl.querySelector("tbody");

  // reset head/body
  theadRow.innerHTML = '<th class="habit-col">Habit</th>';
  tbody.innerHTML = "";

  // Add day headers
  for (let d = 0; d < daysInMonth; d++) {
    const th = document.createElement("th");
    const dayNum = d + 1;
    const weekDay = dayLabels[d % 7];
    th.innerHTML = `${weekDay}<br>${dayNum}`;
    theadRow.appendChild(th);
  }

  // Build rows
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

  // Rebuild charts
  if (dashboard.charts.completion) dashboard.charts.completion.destroy();
  if (dashboard.charts.motivation) dashboard.charts.motivation.destroy();

  const completionData = calculateDailyCompletion(matrix);

  dashboard.charts.completion = createLineChart(
    dashboard.completionCanvas,
    completionData,
    "#7bc96f",
    "rgba(123, 201, 111, 0.25)",
    "Completion %"
  );

  const motivationData = completionData.map((p, i) => {
    const noise = Math.sin(i / 3) * 10 - 15;
    const val = p + noise;
    return Math.max(15, Math.min(100, val));
  });

  dashboard.charts.motivation = createLineChart(
    dashboard.motivationCanvas,
    motivationData,
    "#f3a6c4",
    "rgba(243, 166, 196, 0.3)",
    "Motivation"
  );

  if (isMaster) refreshGlobalStats();
}

function refreshGlobalStats() {
  const master = dashboards.find((d) => d.isMaster);
  if (!master) return;
  const { totalCompleted, overallPercent } = calculateGlobalTotals(master.matrix);

  document.getElementById("totalHabits").textContent = habits.length;
  document.getElementById("completedHabitsTotal").textContent = totalCompleted;
  document.getElementById("overallProgressPercent").textContent =
    overallPercent + "%";
  document.getElementById("overallProgressFill").style.width =
    overallPercent + "%";
}

// ---------- INIT ONE DASHBOARD ----------

function initDashboard(sectionEl, isMaster) {
  const tableEl = sectionEl.querySelector(".habit-table");
  const completionCanvas = sectionEl.querySelector(".habit-line-chart");
  const motivationCanvas = sectionEl.querySelector(".motivation-line-chart");

  const matrix = generateRandomCompletion();

  const dashboard = {
    sectionEl,
    tableEl,
    completionCanvas,
    motivationCanvas,
    matrix,
    charts: {},
    isMaster
  };

  dashboards.push(dashboard);
  renderDashboard(dashboard);

  // checkbox click handler (delegated)
  sectionEl.addEventListener("click", (e) => {
    const box = e.target.closest(".checkbox");
    if (!box || !sectionEl.contains(box)) return;

    const hIndex = Number(box.dataset.habit);
    const dIndex = Number(box.dataset.day);
    if (Number.isNaN(hIndex) || Number.isNaN(dIndex)) return;

    dashboard.matrix[hIndex][dIndex] = !dashboard.matrix[hIndex][dIndex];
    box.classList.toggle("checked");

    // Update charts and global stats
    renderDashboard(dashboard);
  });
}

// ---------- HABIT MANAGEMENT UI ----------

const habitForm = document.getElementById("habitForm");
const habitNameInput = document.getElementById("habitName");
const habitIconInput = document.getElementById("habitIcon");
const habitSubmitBtn = document.getElementById("habitSubmit");
const habitCancelBtn = document.getElementById("habitCancelEdit");
const habitListEl = document.getElementById("habitList");

let editingIndex = null;

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
  const icon = habitIconInput.value.trim() || "✅";
  if (!name) return;

  if (editingIndex === null) {
    // add
    habits.push({ name, icon });
    dashboards.forEach((d) => {
      d.matrix.push(Array.from({ length: daysInMonth }, () => false));
      renderDashboard(d);
    });
  } else {
    // edit
    habits[editingIndex] = { name, icon };
    dashboards.forEach(renderDashboard);
  }

  renderHabitList();
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
    dashboards.forEach((d) => {
      d.matrix.splice(index, 1);
      renderDashboard(d);
    });
    if (editingIndex === index) {
      editingIndex = null;
      habitForm.reset();
    } else if (editingIndex !== null && index < editingIndex) {
      editingIndex -= 1;
    }
    updateHabitFormMode();
    renderHabitList();
  }
});

// ---------- BOOTSTRAP ----------

document.querySelectorAll(".dashboard").forEach((section, idx) => {
  initDashboard(section, idx === 0); // first dashboard is master
});

renderHabitList();
updateHabitFormMode();
refreshGlobalStats();
