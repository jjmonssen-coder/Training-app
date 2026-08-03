/* Styrkeprogresjon – lokal styrketreningsapp
 * Data lagres i localStorage. Ingen backend.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "styrkeprogresjon.v1";

  /* ---------- Domenekunnskap: anbefalinger ---------- */

  // Base-multiplikatorer: arbeidsvekt for ~10RM som andel av kroppsvekt (nybegynner).
  const CATEGORY = {
    lower_big:   { label: "Underkropp (stor)",  mult: 0.50, increment: 5,   base: 20 },
    lower_small: { label: "Underkropp (liten)", mult: 0.25, increment: 2.5, base: 5 },
    upper_push:  { label: "Overkropp press",    mult: 0.35, increment: 2.5, base: 20 },
    upper_pull:  { label: "Overkropp trekk",    mult: 0.35, increment: 2.5, base: 20 },
    isolation:   { label: "Isolasjon",          mult: 0.10, increment: 2.5, base: 2.5 },
    bodyweight:  { label: "Kroppsvekt",         mult: 0.00, increment: 2.5, base: 0 },
  };

  // Justering av startvekt etter erfaringsnivå.
  const LEVEL_FACTOR = { beginner: 1.0, intermediate: 1.35, advanced: 1.7 };

  // Repetisjonsområde etter mål.
  const GOAL_REPS = {
    strength:    [3, 5],
    hypertrophy: [8, 12],
    general:     [5, 8],
  };

  // Standardpakke med øvelser (navn + kategori). Vekt/reps beregnes ved seeding.
  // repMin/repMax kan settes eksplisitt – f.eks. for mageøvelser med høyt repvolum.
  const STARTER_EXERCISES = [
    { name: "Leg Press",             category: "lower_big" },
    { name: "Leg Extension",         category: "lower_small" },
    { name: "Biceps Curl",           category: "isolation" },
    { name: "Seated Row",            category: "upper_pull" },
    { name: "Sit-ups",               category: "bodyweight", repMin: 15, repMax: 25 },
    { name: "Cross-body Leg Raises", category: "bodyweight", repMin: 15, repMax: 25 },
    { name: "Incline Chest Press",   category: "upper_push" },
    { name: "Deadlift",              category: "lower_big" },
  ];

  // Oppretter standardøvelsene med anbefalinger. Hopper over de som finnes fra før.
  function seedStarterExercises() {
    const existing = new Set(state.exercises.map((e) => e.name.toLowerCase()));
    const [rMin, rMax] = recommendReps();
    let added = 0;
    for (const s of STARTER_EXERCISES) {
      if (existing.has(s.name.toLowerCase())) continue;
      state.exercises.push({
        id: uid(),
        name: s.name,
        category: s.category,
        weight: recommendStartWeight(s.category),
        increment: CATEGORY[s.category].increment,
        repMin: s.repMin != null ? s.repMin : rMin,
        repMax: s.repMax != null ? s.repMax : rMax,
        sets: 3,
      });
      added++;
    }
    if (added > 0) saveState();
    return added;
  }

  /* ---------- Tilstand ---------- */

  let state = loadState();

  function defaultState() {
    return {
      profile: null, // { bodyweight, unit, level, goal }
      exercises: [], // { id, name, category, weight, increment, repMin, repMax, sets }
      logs: [],      // { id, date, exerciseId, sets:[{weight,reps}] }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      console.error("Kunne ikke laste data:", e);
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  const unit = () => (state.profile ? state.profile.unit : "kg");

  /* ---------- Anbefalingsmotor ---------- */

  function roundTo(value, step) {
    return Math.round(value / step) * step;
  }

  // Anbefalt startvekt for en øvelse basert på profil + kategori.
  function recommendStartWeight(category) {
    const cat = CATEGORY[category];
    if (!cat || !state.profile) return 0;
    if (category === "bodyweight") return 0;
    const bw = Number(state.profile.bodyweight) || 0;
    const factor = LEVEL_FACTOR[state.profile.level] || 1;
    let w = bw * cat.mult * factor;
    if (w < cat.base) w = cat.base; // gulv for veldig lette utøvere
    w = roundTo(w, cat.increment);
    return Math.max(0, w);
  }

  function recommendReps() {
    const goal = state.profile ? state.profile.goal : "hypertrophy";
    return GOAL_REPS[goal] || GOAL_REPS.hypertrophy;
  }

  // Estimert 1RM (Epley). Begrenset til reps<=12 for rimelig nøyaktighet.
  function epley1RM(weight, reps) {
    if (reps <= 1) return weight;
    return weight * (1 + reps / 30);
  }

  function best1RMOfLog(log) {
    let best = 0;
    for (const s of log.sets) {
      const est = epley1RM(Number(s.weight) || 0, Number(s.reps) || 0);
      if (est > best) best = est;
    }
    return best;
  }

  // Dobbel/lineær progresjon: gitt siste økt for en øvelse, foreslå neste mål.
  function nextTarget(exercise) {
    const logs = logsForExercise(exercise.id).sort(byDate);
    const last = logs[logs.length - 1];
    const inc = Number(exercise.increment) || 2.5;
    const repMax = Number(exercise.repMax);
    const repMin = Number(exercise.repMin);

    if (!last) {
      return {
        weight: Number(exercise.weight) || 0,
        reps: repMin,
        note: "Første økt. Start rolig og finn en vekt du klarer med god teknikk.",
        progressed: false,
      };
    }

    // Vekten det trentes med sist (mest brukte vekt i økta).
    const workingWeight = mostCommonWeight(last.sets);
    const workSets = last.sets.filter((s) => Number(s.weight) === workingWeight);
    const allHitMax = workSets.length > 0 && workSets.every((s) => Number(s.reps) >= repMax);

    if (allHitMax) {
      return {
        weight: roundTo(workingWeight + inc, 0.5),
        reps: repMin,
        note: `Du traff ${repMax} reps på alle sett sist 💪 Øk vekten med ${inc} ${unit()} og start på ${repMin} reps.`,
        progressed: true,
      };
    }

    // Ellers: samme vekt, sikt mot +1 rep opp mot øvre grense.
    const minReps = Math.min(...workSets.map((s) => Number(s.reps) || 0));
    const targetReps = Math.min(repMax, minReps + 1);
    return {
      weight: workingWeight,
      reps: targetReps,
      note: `Behold ${workingWeight} ${unit()} og prøv å øke til ${targetReps} reps på alle sett. Når du klarer ${repMax} på alle, øker du vekten.`,
      progressed: false,
    };
  }

  function mostCommonWeight(sets) {
    const counts = {};
    let bestW = 0, bestC = -1;
    for (const s of sets) {
      const w = Number(s.weight) || 0;
      counts[w] = (counts[w] || 0) + 1;
      if (counts[w] > bestC || (counts[w] === bestC && w > bestW)) {
        bestC = counts[w];
        bestW = w;
      }
    }
    return bestW;
  }

  function logsForExercise(exId) {
    return state.logs.filter((l) => l.exerciseId === exId);
  }

  function byDate(a, b) {
    return new Date(a.date) - new Date(b.date);
  }

  /* ---------- Visningsruter ---------- */

  const views = ["exercises", "log", "progress", "settings"];

  function showView(name) {
    for (const v of views.concat(["onboarding"])) {
      const el = document.getElementById("view-" + v);
      if (el) el.hidden = v !== name;
    }
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.view === name);
    });
    document.getElementById("tabs").style.visibility =
      name === "onboarding" ? "hidden" : "visible";

    if (name === "exercises") renderExercises();
    if (name === "log") renderLogView();
    if (name === "progress") renderProgress();
    if (name === "settings") renderSettings();
  }

  /* ---------- Onboarding ---------- */

  document.getElementById("onboarding-form").addEventListener("submit", (e) => {
    e.preventDefault();
    state.profile = {
      bodyweight: Number(document.getElementById("ob-bodyweight").value),
      unit: document.getElementById("ob-unit").value,
      level: document.getElementById("ob-level").value,
      goal: document.getElementById("ob-goal").value,
    };
    saveState();
    seedStarterExercises();
    updateUnitLabels();
    toast("Klar! Standardøvelsene er lagt til.");
    showView("exercises");
  });

  document.getElementById("ob-unit").addEventListener("change", (e) => {
    document.getElementById("ob-unit-suffix").textContent = e.target.value;
  });

  /* ---------- Øvelser ---------- */

  const modal = document.getElementById("exercise-modal");
  let editingExerciseId = null;

  function openExerciseModal(exId) {
    editingExerciseId = exId || null;
    const ex = exId ? state.exercises.find((e) => e.id === exId) : null;
    document.getElementById("exercise-modal-title").textContent = ex ? "Rediger øvelse" : "Ny øvelse";

    const cat = ex ? ex.category : "upper_push";
    document.getElementById("ex-name").value = ex ? ex.name : "";
    document.getElementById("ex-category").value = cat;

    const [rMin, rMax] = recommendReps();
    document.getElementById("ex-weight").value = ex ? ex.weight : recommendStartWeight(cat);
    document.getElementById("ex-increment").value = ex ? ex.increment : CATEGORY[cat].increment;
    document.getElementById("ex-repmin").value = ex ? ex.repMin : rMin;
    document.getElementById("ex-repmax").value = ex ? ex.repMax : rMax;
    document.getElementById("ex-sets").value = ex ? ex.sets : 3;

    updateRecHint();
    modal.hidden = false;
  }

  function closeExerciseModal() {
    modal.hidden = true;
    editingExerciseId = null;
  }

  // Når kategori endres i modalen: foreslå vekt/økning på nytt (kun for ny øvelse).
  document.getElementById("ex-category").addEventListener("change", (e) => {
    const cat = e.target.value;
    if (!editingExerciseId) {
      document.getElementById("ex-weight").value = recommendStartWeight(cat);
      document.getElementById("ex-increment").value = CATEGORY[cat].increment;
    }
    updateRecHint();
  });

  function updateRecHint() {
    const cat = document.getElementById("ex-category").value;
    const hint = document.getElementById("ex-rec-hint");
    const [rMin, rMax] = recommendReps();
    const rec = recommendStartWeight(cat);
    if (cat === "bodyweight") {
      hint.innerHTML = `Anbefaling: <b>${rMin}–${rMax} reps</b> med kroppsvekt. Legg til vekt (belte) når du klarer ${rMax} reps på alle sett.`;
    } else {
      hint.innerHTML = `Anbefalt utgangspunkt: <b>${fmt(rec)} ${unit()}</b> for <b>${rMin}–${rMax} reps</b>. Gjør ett sett – klarer du mer enn ${rMax} med god teknikk, øk vekten.`;
    }
  }

  document.getElementById("exercise-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const repMin = clampInt(document.getElementById("ex-repmin").value, 1, 100, 8);
    const repMax = clampInt(document.getElementById("ex-repmax").value, repMin, 100, Math.max(repMin, 12));
    const data = {
      name: document.getElementById("ex-name").value.trim(),
      category: document.getElementById("ex-category").value,
      weight: Number(document.getElementById("ex-weight").value) || 0,
      increment: Number(document.getElementById("ex-increment").value) || 2.5,
      repMin,
      repMax,
      sets: clampInt(document.getElementById("ex-sets").value, 1, 10, 3),
    };
    if (!data.name) return;

    if (editingExerciseId) {
      const ex = state.exercises.find((e) => e.id === editingExerciseId);
      Object.assign(ex, data);
      toast("Øvelse oppdatert");
    } else {
      state.exercises.push(Object.assign({ id: uid() }, data));
      toast("Øvelse lagt til");
    }
    saveState();
    closeExerciseModal();
    renderExercises();
  });

  function renderExercises() {
    const list = document.getElementById("exercise-list");
    const empty = document.getElementById("exercises-empty");
    const intro = document.getElementById("exercises-intro");
    list.innerHTML = "";

    if (state.exercises.length === 0) {
      empty.hidden = false;
      intro.hidden = true;
      return;
    }
    empty.hidden = true;
    intro.hidden = false;

    for (const ex of state.exercises) {
      const cat = CATEGORY[ex.category];
      const div = document.createElement("div");
      div.className = "exercise-card";
      const weightText = ex.category === "bodyweight" && !ex.weight
        ? "Kroppsvekt"
        : `${fmt(ex.weight)} ${unit()}`;
      div.innerHTML = `
        <div class="ex-info">
          <span class="badge">${cat ? cat.label : ex.category}</span>
          <h3>${escapeHtml(ex.name)}</h3>
          <div class="ex-meta">
            <span>Start: <b>${weightText}</b></span>
            <span>Reps: <b>${ex.repMin}–${ex.repMax}</b></span>
            <span>Sett: <b>${ex.sets}</b></span>
            <span>Økning: <b>${fmt(ex.increment)} ${unit()}</b></span>
          </div>
        </div>
        <div class="ex-actions">
          <button class="btn ghost" data-edit="${ex.id}">✎</button>
          <button class="btn ghost" data-del="${ex.id}">🗑</button>
        </div>`;
      list.appendChild(div);
    }

    list.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => openExerciseModal(b.dataset.edit))
    );
    list.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => deleteExercise(b.dataset.del))
    );
  }

  function deleteExercise(id) {
    const ex = state.exercises.find((e) => e.id === id);
    if (!ex) return;
    const hasLogs = logsForExercise(id).length > 0;
    const msg = hasLogs
      ? `Slette "${ex.name}" og alle loggførte økter for denne øvelsen?`
      : `Slette "${ex.name}"?`;
    if (!confirm(msg)) return;
    state.exercises = state.exercises.filter((e) => e.id !== id);
    state.logs = state.logs.filter((l) => l.exerciseId !== id);
    saveState();
    renderExercises();
    toast("Øvelse slettet");
  }

  document.getElementById("add-exercise-btn").addEventListener("click", () => openExerciseModal());
  document.getElementById("add-exercise-btn-2").addEventListener("click", () => openExerciseModal());

  function handleSeedClick() {
    const added = seedStarterExercises();
    renderExercises();
    toast(added > 0 ? `La til ${added} standardøvelser` : "Alle standardøvelsene finnes allerede");
  }
  document.getElementById("seed-exercises-btn").addEventListener("click", handleSeedClick);
  document.getElementById("seed-exercises-btn-2").addEventListener("click", handleSeedClick);
  document.getElementById("close-exercise-modal").addEventListener("click", closeExerciseModal);
  document.getElementById("cancel-exercise").addEventListener("click", closeExerciseModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeExerciseModal(); });

  /* ---------- Logg økt ---------- */

  function renderLogView() {
    const sel = document.getElementById("log-exercise");
    const prev = sel.value;
    sel.innerHTML = "";
    if (state.exercises.length === 0) {
      sel.innerHTML = '<option value="">Legg til en øvelse først</option>';
      document.getElementById("log-recommendation").innerHTML = "";
      document.getElementById("log-sets").innerHTML = "";
      renderRecentLogs();
      return;
    }
    for (const ex of state.exercises) {
      const o = document.createElement("option");
      o.value = ex.id;
      o.textContent = ex.name;
      sel.appendChild(o);
    }
    if (prev && state.exercises.some((e) => e.id === prev)) sel.value = prev;

    const dateEl = document.getElementById("log-date");
    if (!dateEl.value) dateEl.value = todayISO();

    onLogExerciseChange();
    renderRecentLogs();
  }

  function onLogExerciseChange() {
    const exId = document.getElementById("log-exercise").value;
    const ex = state.exercises.find((e) => e.id === exId);
    if (!ex) return;

    const target = nextTarget(ex);
    const recEl = document.getElementById("log-recommendation");
    recEl.innerHTML =
      `<b>Anbefalt i dag:</b> ${ex.sets} sett × ${target.reps} reps` +
      (ex.category === "bodyweight" && !target.weight ? " (kroppsvekt)" : ` @ ${fmt(target.weight)} ${unit()}`) +
      `<br><span class="muted small">${target.note}</span>`;

    // Forhåndsfyll settene med anbefalt vekt/reps.
    buildSetRows(ex.sets, target.weight, target.reps);
  }

  function buildSetRows(count, weight, reps) {
    const container = document.getElementById("log-sets");
    container.innerHTML =
      `<div class="set-head"><span></span><span>Vekt (${unit()})</span><span>Reps</span><span></span></div>`;
    for (let i = 0; i < count; i++) addSetRow(weight, reps);
  }

  function addSetRow(weight, reps) {
    const container = document.getElementById("log-sets");
    const row = document.createElement("div");
    row.className = "set-row";
    const num = container.querySelectorAll(".set-row").length + 1;
    row.innerHTML = `
      <span class="set-num">${num}</span>
      <input type="number" class="set-weight" min="0" step="0.5" value="${weight != null ? weight : ""}" />
      <input type="number" class="set-reps" min="0" step="1" value="${reps != null ? reps : ""}" />
      <button type="button" class="remove-set" title="Fjern">✕</button>`;
    row.querySelector(".remove-set").addEventListener("click", () => {
      row.remove();
      renumberSets();
    });
    container.appendChild(row);
  }

  function renumberSets() {
    document.querySelectorAll("#log-sets .set-row .set-num").forEach((el, i) => {
      el.textContent = i + 1;
    });
  }

  document.getElementById("log-exercise").addEventListener("change", onLogExerciseChange);
  document.getElementById("add-set-btn").addEventListener("click", () => {
    const rows = document.querySelectorAll("#log-sets .set-row");
    const lastW = rows.length ? rows[rows.length - 1].querySelector(".set-weight").value : "";
    addSetRow(lastW, "");
  });

  document.getElementById("save-log-btn").addEventListener("click", () => {
    const exId = document.getElementById("log-exercise").value;
    const ex = state.exercises.find((e) => e.id === exId);
    if (!ex) { toast("Velg en øvelse først", true); return; }

    const sets = [];
    document.querySelectorAll("#log-sets .set-row").forEach((row) => {
      const weight = Number(row.querySelector(".set-weight").value);
      const reps = Number(row.querySelector(".set-reps").value);
      if (reps > 0) sets.push({ weight: isFinite(weight) ? weight : 0, reps });
    });
    if (sets.length === 0) { toast("Fyll inn minst ett sett med reps", true); return; }

    const date = document.getElementById("log-date").value || todayISO();
    state.logs.push({ id: uid(), date, exerciseId: exId, sets });
    saveState();
    toast("Økt lagret 💾");
    onLogExerciseChange();
    renderRecentLogs();
  });

  function renderRecentLogs() {
    const container = document.getElementById("recent-logs");
    const recent = state.logs.slice().sort(byDate).reverse().slice(0, 8);
    if (recent.length === 0) {
      container.innerHTML = '<p class="muted small">Ingen loggførte økter ennå.</p>';
      return;
    }
    container.innerHTML = "";
    for (const log of recent) {
      const ex = state.exercises.find((e) => e.id === log.exerciseId);
      const setsText = log.sets.map((s) => `${fmt(s.weight)}×${s.reps}`).join(", ");
      const est = best1RMOfLog(log);
      const div = document.createElement("div");
      div.className = "log-entry";
      div.innerHTML = `
        <div class="log-top">
          <span class="log-name">${ex ? escapeHtml(ex.name) : "Slettet øvelse"}</span>
          <span class="log-date">${formatDate(log.date)}</span>
        </div>
        <div class="log-sets">${setsText} ${unit()}</div>
        <div class="log-top">
          <span class="log-1rm">Est. 1RM: ${fmt(est)} ${unit()}</span>
          <button class="del-log" data-del-log="${log.id}">Slett</button>
        </div>`;
      container.appendChild(div);
    }
    container.querySelectorAll("[data-del-log]").forEach((b) =>
      b.addEventListener("click", () => {
        state.logs = state.logs.filter((l) => l.id !== b.dataset.delLog);
        saveState();
        renderRecentLogs();
        onLogExerciseChange();
        toast("Økt slettet");
      })
    );
  }

  /* ---------- Utvikling ---------- */

  function renderProgress() {
    const sel = document.getElementById("progress-exercise");
    const prev = sel.value;
    sel.innerHTML = "";
    const withLogs = state.exercises.filter((e) => logsForExercise(e.id).length > 0);

    if (withLogs.length === 0) {
      document.getElementById("progress-empty").hidden = false;
      document.getElementById("progress-content").hidden = true;
      return;
    }
    document.getElementById("progress-empty").hidden = true;
    document.getElementById("progress-content").hidden = false;

    for (const ex of withLogs) {
      const o = document.createElement("option");
      o.value = ex.id;
      o.textContent = ex.name;
      sel.appendChild(o);
    }
    if (prev && withLogs.some((e) => e.id === prev)) sel.value = prev;

    drawProgressFor(sel.value);
  }

  function drawProgressFor(exId) {
    const ex = state.exercises.find((e) => e.id === exId);
    if (!ex) return;
    const logs = logsForExercise(exId).sort(byDate);

    // Statistikk
    const points = logs.map((l) => ({ date: l.date, val: best1RMOfLog(l) }));
    const first = points[0].val;
    const latest = points[points.length - 1].val;
    const maxWeight = Math.max(...logs.flatMap((l) => l.sets.map((s) => Number(s.weight) || 0)));
    const change = first > 0 ? ((latest - first) / first) * 100 : 0;

    document.getElementById("progress-stats").innerHTML = `
      <div class="stat"><div class="stat-value">${fmt(latest)}</div><div class="stat-label">Est. 1RM nå (${unit()})</div></div>
      <div class="stat"><div class="stat-value">${fmt(maxWeight)}</div><div class="stat-label">Tyngste vekt (${unit()})</div></div>
      <div class="stat"><div class="stat-value">${change >= 0 ? "+" : ""}${change.toFixed(0)}%</div><div class="stat-label">Endring 1RM</div></div>
      <div class="stat"><div class="stat-value">${logs.length}</div><div class="stat-label">Antall økter</div></div>`;

    // Neste mål
    const target = nextTarget(ex);
    const targetWeightText = ex.category === "bodyweight" && !target.weight
      ? "Kroppsvekt" : `${fmt(target.weight)} ${unit()}`;
    document.getElementById("next-target").innerHTML = `
      <div class="target-box">
        <div class="target-main">${ex.sets} × ${target.reps} @ ${targetWeightText}</div>
      </div>
      <p class="target-desc">${target.note}</p>`;

    drawChart(points);
    renderHistory(logs);
  }

  function renderHistory(logs) {
    const container = document.getElementById("progress-history");
    container.innerHTML = "";
    for (const log of logs.slice().reverse()) {
      const setsText = log.sets.map((s) => `${fmt(s.weight)}×${s.reps}`).join(", ");
      const div = document.createElement("div");
      div.className = "log-entry";
      div.innerHTML = `
        <div class="log-top">
          <span class="log-date">${formatDate(log.date)}</span>
          <span class="log-1rm">Est. 1RM: ${fmt(best1RMOfLog(log))} ${unit()}</span>
        </div>
        <div class="log-sets">${setsText} ${unit()}</div>`;
      container.appendChild(div);
    }
  }

  document.getElementById("progress-exercise").addEventListener("change", (e) =>
    drawProgressFor(e.target.value)
  );

  // Enkel linjegraf på canvas (ingen eksterne biblioteker).
  function drawChart(points) {
    const canvas = document.getElementById("progress-chart");
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const pad = { l: 44, r: 16, t: 16, b: 36 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;

    const vals = points.map((p) => p.val);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= 5; max += 5; }
    const range = max - min || 1;
    const padMin = min - range * 0.1;
    const padMax = max + range * 0.1;

    const xFor = (i) => pad.l + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
    const yFor = (v) => pad.t + plotH - ((v - padMin) / (padMax - padMin)) * plotH;

    // Rutenett + y-akse-etiketter
    ctx.strokeStyle = "#334155";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px sans-serif";
    ctx.lineWidth = 1;
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = padMin + (i / ticks) * (padMax - padMin);
      const y = yFor(v);
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(W - pad.r, y);
      ctx.stroke();
      ctx.fillText(fmt(v), 6, y + 4);
    }

    // Linje
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xFor(i), y = yFor(p.val);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fyll under linje
    ctx.lineTo(xFor(points.length - 1), pad.t + plotH);
    ctx.lineTo(xFor(0), pad.t + plotH);
    ctx.closePath();
    ctx.fillStyle = "rgba(56,189,248,0.12)";
    ctx.fill();

    // Punkter + x-etiketter (første, midt, siste)
    ctx.fillStyle = "#38bdf8";
    points.forEach((p, i) => {
      const x = xFor(i), y = yFor(p.val);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "center";
    const labelIdx = points.length <= 1 ? [0] : [0, Math.floor((points.length - 1) / 2), points.length - 1];
    [...new Set(labelIdx)].forEach((i) => {
      ctx.fillText(formatDate(points[i].date, true), xFor(i), H - 12);
    });
    ctx.textAlign = "left";
  }

  /* ---------- Innstillinger ---------- */

  function renderSettings() {
    if (!state.profile) return;
    document.getElementById("set-bodyweight").value = state.profile.bodyweight;
    document.getElementById("set-unit").value = state.profile.unit;
    document.getElementById("set-level").value = state.profile.level;
    document.getElementById("set-goal").value = state.profile.goal;
  }

  document.getElementById("save-settings-btn").addEventListener("click", () => {
    state.profile.bodyweight = Number(document.getElementById("set-bodyweight").value);
    state.profile.unit = document.getElementById("set-unit").value;
    state.profile.level = document.getElementById("set-level").value;
    state.profile.goal = document.getElementById("set-goal").value;
    saveState();
    updateUnitLabels();
    toast("Profil lagret");
  });

  document.getElementById("export-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "styrkeprogresjon-data.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("import-btn").addEventListener("click", () =>
    document.getElementById("import-file").click()
  );
  document.getElementById("import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        state = Object.assign(defaultState(), data);
        saveState();
        updateUnitLabels();
        toast("Data importert");
        showView(state.profile ? "exercises" : "onboarding");
      } catch (err) {
        toast("Kunne ikke lese filen", true);
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    if (!confirm("Slette ALL data og starte på nytt? Dette kan ikke angres.")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    updateUnitLabels();
    showView("onboarding");
    toast("Alt nullstilt");
  });

  /* ---------- Hjelpefunksjoner ---------- */

  function updateUnitLabels() {
    const u = unit();
    document.querySelectorAll(".unit-suffix").forEach((el) => (el.textContent = u));
    const obSuffix = document.getElementById("ob-unit-suffix");
    if (obSuffix) obSuffix.textContent = u;
  }

  function fmt(n) {
    const num = Number(n) || 0;
    return Number.isInteger(num) ? String(num) : num.toFixed(1);
  }

  function clampInt(v, min, max, fallback) {
    let n = parseInt(v, 10);
    if (!isFinite(n)) n = fallback;
    return Math.min(max, Math.max(min, n));
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function pad2(n) { return String(n).padStart(2, "0"); }

  function formatDate(iso, short) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    const months = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
    if (short) return `${d.getDate()}. ${months[d.getMonth()]}`;
    return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  let toastTimer;
  function toast(msg, isError) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast" + (isError ? " error" : "");
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2600);
  }

  /* ---------- Oppstart ---------- */

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => showView(t.dataset.view))
  );

  updateUnitLabels();
  if (state.profile) {
    showView("exercises");
  } else {
    showView("onboarding");
  }
})();
