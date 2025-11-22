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

// ---------- TABLE GENERATION + DATA ----------

function generateRandomCompletion() {
  // create some semi-realistic completion pattern
  const matrix = [];
  for (let h = 0; h < habits.length; h++) {
    const row = [];
    for (let d = 0; d < daysInMonth; d++) {
      // 60% chance done, tweak for variety
      const baseChance = 0.6;
      const modifier = (Math.sin(d / 4) + 1) / 4; // 0..0.5
      const chance = baseChance + modifier - 0.1;
      row.push(Math.random() < chance);
    }
    matrix.push(row);
  }
  return matrix;
}

function createTableForDashboard(dashboardEl, completionMatrix) {
  const table = dashboardEl.querySelector(".habit-table");
  const theadRow = table.querySelector("thead tr");
  const tbody = table.querySelector("tbody");

  // Add day headers (1..30) with weekday labels
  for (let d = 0; d < daysInMonth; d++) {
    const th = document.createElement("th");
    const dayNum = d + 1;
    const weekDay = dayLabels[d % 7];
    th.innerHTML = `${weekDay}<br>${dayNum}`;
    theadRow.appendChild(th);
  }

  // Body
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
      if (completionMatrix[hIndex][d]) {
        box.classList.add("checked");
      }
      td.appendChild(box);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });
}

// ---------- CALCULATIONS ----------

function calculateDailyCompletion(completionMatrix) {
  const daily = [];
  for (let d = 0; d < daysInMonth; d++) {
    let done = 0;
    for (let h = 0; h < habits.length; h++) {
      if (completionMatrix[h][d]) done++;
    }
    const percentage = (done / habits.length) * 100;
    daily.push(percentage);
  }
  return daily;
}

function calculateHabitTotals(completionMatrix) {
  const totals = [];
  for (let h = 0; h < habits.length; h++) {
    let count = 0;
    for (let d = 0; d < daysInMonth; d++) {
      if (completionMatrix[h][d]) count++;
    }
    totals.push(count);
  }
  return totals;
}

// ---------- CHARTS ----------

function createBarChart(canvas, habitTotals) {
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: habits.map(h => h.name),
      datasets: [
        {
          label: "Completed days",
          data: habitTotals,
          backgroundColor: "rgba(123,201,111,0.8)"
        }
      ]
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: "var(--text)" },
          grid: { display: false }
        },
        y: {
          ticks: { color: "var(--text)", font: { size: 10 } },
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
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { display: false },
          grid: { display: false }
        },
        y: {
          ticks: { color: "var(--text)" },
          grid: { display: false }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// ---------- MAIN INITIALIZATION ----------

function initDashboard(dashboardEl) {
  const completionMatrix = generateRandomCompletion();
  createTableForDashboard(dashboardEl, completionMatrix);

  const dailyCompletion = calculateDailyCompletion(completionMatrix);
  const habitTotals = calculateHabitTotals(completionMatrix);

  // update global stats (only once, from first dashboard)
  const totalCompleted = habitTotals.reduce((a, b) => a + b, 0);
  const totalPossible = habits.length * daysInMonth;
  const overallPercent = Math.round((totalCompleted / totalPossible) * 100);

  if (!window.__globalStatsInitialized) {
    document.getElementById("totalHabits").textContent = habits.length;
    document.getElementById("completedHabitsTotal").textContent = totalCompleted;
    document.getElementById("overallProgressPercent").textContent =
      overallPercent + "%";
    document.getElementById("overallProgressFill").style.width =
      overallPercent + "%";
    window.__globalStatsInitialized = true;
  }

  // Charts
  const barCanvas = dashboardEl.querySelector(".habit-bar-chart");
  const habitLineCanvas = dashboardEl.querySelector(".habit-line-chart");
  const motivationLineCanvas = dashboardEl.querySelector(
    ".motivation-line-chart"
  );

  createBarChart(barCanvas, habitTotals);

  createLineChart(
    habitLineCanvas,
    dailyCompletion,
    "#7bc96f",
    "rgba(123,201,111,0.25)",
    "Completion %"
  );

  // Fake motivation data: completion plus some noise
  const motivationData = dailyCompletion.map((p, i) => {
    const noise = (Math.sin(i / 3) * 10) | 0;
    return Math.max(15, Math.min(100, p + noise - 15));
  });

  createLineChart(
    motivationLineCanvas,
    motivationData,
    "#f3a6c4",
    "rgba(243,166,196,0.3)",
    "Motivation"
  );
}

document.querySelectorAll(".dashboard").forEach(initDashboard);