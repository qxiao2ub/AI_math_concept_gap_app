(() => {
  "use strict";

  const root = document.getElementById("root");

  const DEFAULTS = {
    grade_level: 8,
    grade_band: "middle",
    study_hours_per_week: 4.5,
    attendance_rate: 0.9,
    confidence_trait: 0.55,
    carelessness: 0.12,
    difficulty: 2.4,
    primary_concepts: ["percentages"],
    hist_required_acc_mean: 0.3,
    hist_primary_acc_mean: 0.35,
    hist_total_attempts_on_required: 5,
    hist_total_attempts_on_primary: 3,
    answer_time_sec: 85,
    pre_answer_confidence: 0.45,
  };

  const SCENARIOS = [
    {
      id: "percentages",
      name: "Percentages",
      description: "Connect parts of a whole to parts per hundred.",
      icon: "%",
      inputs: { ...DEFAULTS },
    },
    {
      id: "algebra",
      name: "Quadratic equations",
      description: "Trace an algebra problem back to its foundations.",
      icon: "x²",
      inputs: {
        ...DEFAULTS,
        grade_level: 10,
        grade_band: "high",
        difficulty: 3.6,
        primary_concepts: ["quadratic_equations"],
        answer_time_sec: 135,
        hist_required_acc_mean: 0.45,
        hist_primary_acc_mean: 0.25,
        hist_total_attempts_on_required: 14,
        hist_total_attempts_on_primary: 6,
      },
    },
    {
      id: "geometry",
      name: "Volume",
      description: "Explore the skills behind three-dimensional measurement.",
      icon: "▣",
      inputs: {
        ...DEFAULTS,
        grade_level: 7,
        grade_band: "middle",
        difficulty: 2.6,
        primary_concepts: ["geometry_volume"],
        answer_time_sec: 95,
        hist_required_acc_mean: 0.4,
        hist_primary_acc_mean: 0.3,
        hist_total_attempts_on_required: 8,
        hist_total_attempts_on_primary: 4,
      },
    },
  ];

  const FIELDS = [
    ["grade_level", "Student grade", 5, 11, 1, "problem"],
    ["difficulty", "Problem difficulty", 0.5, 4.5, 0.1, "problem"],
    ["answer_time_sec", "Answer time (seconds)", 10, 240, 1, "problem"],
    ["pre_answer_confidence", "Pre-answer confidence", 0.01, 0.99, 0.01, "problem"],
    ["hist_required_acc_mean", "Prior accuracy · required concepts", -1, 1, 0.05, "history"],
    ["hist_primary_acc_mean", "Prior accuracy · primary concepts", -1, 1, 0.05, "history"],
    ["hist_total_attempts_on_required", "Prior attempts · required concepts", 0, 200, 1, "history"],
    ["hist_total_attempts_on_primary", "Prior attempts · primary concepts", 0, 200, 1, "history"],
    ["study_hours_per_week", "Study hours per week", 0.5, 12, 0.5, "research"],
    ["attendance_rate", "Attendance rate", 0.5, 1, 0.01, "research"],
    ["confidence_trait", "Confidence trait", 0.05, 0.99, 0.01, "research"],
    ["carelessness", "Carelessness proxy", 0, 0.4, 0.01, "research"],
  ].map(([key, label, min, max, step, group]) => ({ key, label, min, max, step, group }));

  const SHORT = {
    integer_arithmetic: "Whole numbers and operations",
    fractions: "Parts of a whole and equivalents",
    decimals: "Place value and operations",
    ratios_proportions: "Comparing quantities",
    percentages: "Parts per hundred",
    algebraic_simplification: "Expressions and like terms",
    linear_equations: "Finding an unknown value",
    exponents: "Powers and repeated products",
    polynomials: "Expressions with several terms",
    quadratic_equations: "Equations with squared terms",
    geometry_area: "Measuring flat shapes",
    geometry_volume: "Measuring solid shapes",
    probability_basics: "The chance of an outcome",
    data_interpretation: "Reading charts and data",
  };

  const state = {
    args: null,
    concepts: [],
    result: null,
    error: "",
    busy: true,
    page: "diagnosis",
    selected: null,
    scenarioName: "Percentages",
    pendingScenarioName: null,
    createdAt: new Date().toISOString(),
    lastResponseId: null,
    inputOpen: false,
    aboutOpen: false,
    draft: null,
    draftScenario: "Custom inputs",
    formError: "",
    fractionParts: 1,
    pendingTimer: null,
  };

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const score = (value) => new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
  const accuracy = (value) => Number(value) === -1
    ? "Unknown"
    : Number(value) < 0
      ? `${value} (research placeholder)`
      : score(value);

  function svgIcon(name, size = 18) {
    const paths = {
      chart: '<path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/>',
      graph: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="19" r="2"/><path d="m6.5 10.5 4-4m3 0 4 4m0 3-4 4m-3 0-4-4"/>',
      file: '<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/>',
      users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6"/><circle cx="17" cy="9" r="2"/><path d="M15 15c3.5-.5 6 1.5 6 5"/>',
      sliders: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="11" cy="18" r="2"/>',
      download: '<path d="M12 3v12m0 0 5-5m-5 5-5-5M4 19h16"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
      arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
      back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      print: '<path d="M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
      book: '<path d="M3 5c4-1 7 0 9 2v14c-2-2-5-3-9-2zM21 5c-4-1-7 0-9 2v14c2-2 5-3 9-2z"/>',
      flask: '<path d="M9 3h6M10 3v6l-5 9c-.8 1.5.1 3 1.8 3h10.4c1.7 0 2.6-1.5 1.8-3l-5-9V3M8 15h8"/>',
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
  }

  function postToStreamlit(type, payload = {}) {
    if (window.parent === window) return;
    window.parent.postMessage({ isStreamlitMessage: true, type, ...payload }, "*");
  }

  function setFrameHeight() {
    const available = Number(window.screen?.availHeight || 900);
    const height = Math.max(650, Math.min(980, available - 34));
    postToStreamlit("streamlit:setFrameHeight", { height });
  }

  function setComponentValue(value) {
    postToStreamlit("streamlit:setComponentValue", { value });
  }

  function handleRender(args) {
    const incoming = args || {};
    const responseChanged = incoming.response_id !== state.lastResponseId;
    state.args = incoming;
    state.concepts = Array.isArray(incoming.concepts) ? incoming.concepts : state.concepts;
    state.error = incoming.error || "";

    if (incoming.result) {
      state.result = incoming.result;
      const validSelected = state.concepts.some((concept) => concept.id === state.selected);
      if (!validSelected || responseChanged) {
        state.selected = incoming.result.recommended_review
          || incoming.result.ranked_concepts?.[0]?.concept
          || incoming.result.inputs?.primary_concepts?.[0]
          || state.concepts[0]?.id;
      }
    }

    if (responseChanged) {
      state.lastResponseId = incoming.response_id;
      state.createdAt = incoming.created_at || state.createdAt;
      if (state.pendingScenarioName && !incoming.error) {
        state.scenarioName = state.pendingScenarioName;
        state.page = "diagnosis";
      }
      state.pendingScenarioName = null;
      state.busy = false;
      state.inputOpen = false;
      if (state.pendingTimer) {
        clearTimeout(state.pendingTimer);
        state.pendingTimer = null;
      }
    } else if (incoming.result || incoming.error) {
      state.busy = false;
    }

    renderApp();
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || message.type !== "streamlit:render") return;
    handleRender(message.args || {});
  });

  window.addEventListener("resize", setFrameHeight);
  postToStreamlit("streamlit:componentReady", { apiVersion: 1 });
  setFrameHeight();

  function conceptById(id) {
    return state.concepts.find((concept) => concept.id === id);
  }

  function currentRecommended() {
    return conceptById(state.result?.recommended_review)
      || conceptById(state.result?.ranked_concepts?.[0]?.concept)
      || state.concepts[0];
  }

  function inputSummary(inputs, expanded = false) {
    if (!inputs) return "";
    const labels = Object.fromEntries(state.concepts.map((concept) => [concept.id, concept.label]));
    const rows = [
      ["Problem concepts", (inputs.primary_concepts || []).map((id) => labels[id] || id).join(", ")],
      ["Problem grade band", inputs.grade_band],
      ...FIELDS.map((field) => [
        field.label,
        field.key.includes("_acc_") ? accuracy(inputs[field.key]) : inputs[field.key],
      ]),
    ];
    const visible = expanded ? rows : rows.slice(0, 8);
    return `<dl class="input-summary">${visible.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>`;
  }

  function formulaFor(id) {
    const formulas = {
      integer_arithmetic: "−3 + 2 × 4 = 5",
      fractions: "1/2 + 1/4 = 3/4",
      decimals: "0.60 + 0.25 = 0.85",
      ratios_proportions: "2/3 = 4/6",
      percentages: "25% × 80 = 20",
      algebraic_simplification: "3x + 2x − 4 = 5x − 4",
      linear_equations: "2x + 3 = 11  →  x = 4",
      exponents: "2³ = 2 × 2 × 2 = 8",
      polynomials: "(x + 2)(x + 3) = x² + 5x + 6",
      quadratic_equations: "x² − 5x + 6 = 0",
      geometry_area: "A = length × width",
      geometry_volume: "V = length × width × height",
      probability_basics: "P(red) = favorable / total = 3/8",
      data_interpretation: "Compare scale, center, and change",
    };
    return formulas[id] || "Ideas build on ideas.";
  }

  function renderConceptFigure(concept, compact = false) {
    if (!concept) return "";
    const id = concept.id;
    const caption = compact ? "Illustrative example" : "Make it tangible";

    if (["fractions", "decimals", "ratios_proportions", "percentages"].includes(id)) {
      const denominator = 4;
      const numerator = Math.max(1, Math.min(4, state.fractionParts));
      const decimal = numerator / denominator;
      const percent = Math.round(decimal * 100);
      return `<div class="concept-figure">
        <span class="eyebrow">${caption}</span>
        <div class="fraction-layout">
          <div class="fraction-wheel" style="--fraction-angle:${decimal * 360}deg"><strong>${numerator}/${denominator}</strong></div>
          <div>
            <div class="equivalents">
              <div class="equivalent"><strong>${decimal.toFixed(2)}</strong><span>as a decimal</span></div>
              <div class="equivalent"><strong>${percent}%</strong><span>as a percentage</span></div>
            </div>
            ${compact ? "" : `<div class="segment-controls" aria-label="Try a different fraction">${[1,2,3,4].map((n) => `<button type="button" data-fraction="${n}" class="${n === numerator ? "active" : ""}">${n}/4</button>`).join("")}</div>`}
          </div>
        </div>
        <div class="figure-caption">${numerator}/4 = ${decimal.toFixed(2)} = ${percent}%</div>
      </div>`;
    }

    if (id === "integer_arithmetic") {
      return `<div class="concept-figure"><span class="eyebrow">${caption}</span><div class="figure-equation">${formulaFor(id)}</div><div class="number-line"><div class="number-marker" style="--marker-left:70%">● 5</div><div class="number-ticks">${[-5,-3,-1,1,3,5,7].map((n) => `<span data-label="${n}"></span>`).join("")}</div></div><div class="figure-caption">Multiply first, then move eight units right from −3.</div></div>`;
    }

    if (["algebraic_simplification", "linear_equations", "exponents", "polynomials"].includes(id)) {
      return `<div class="concept-figure"><span class="eyebrow">${caption}</span><div class="figure-equation">${esc(formulaFor(id))}</div><div class="balance"><div class="balance-pan">same operation</div><div class="balance-post"></div><div class="balance-pan">both sides</div></div><div class="figure-caption">Keep equivalent expressions balanced while simplifying.</div></div>`;
    }

    if (id === "quadratic_equations") {
      return `<div class="concept-figure"><span class="eyebrow">${caption}</span><div class="figure-equation">${esc(formulaFor(id))}</div><svg class="curve-figure" viewBox="0 0 520 180" role="img" aria-label="A quadratic curve crossing the horizontal axis twice"><line x1="0" y1="130" x2="520" y2="130"/><line x1="260" y1="0" x2="260" y2="180"/><path d="M40 20 C150 190 340 190 480 18"/></svg><div class="figure-caption">The roots are where the parabola crosses the horizontal axis.</div></div>`;
    }

    if (["geometry_area", "geometry_volume"].includes(id)) {
      return `<div class="concept-figure"><span class="eyebrow">${caption}</span><div class="shape-row"><div class="shape-card"><div class="shape ${id === "geometry_volume" ? "cube" : ""}"></div><strong>${esc(formulaFor(id))}</strong></div><div><div class="figure-equation">${id === "geometry_volume" ? "3 × 4 × 5 = 60 units³" : "6 × 4 = 24 units²"}</div><div class="figure-sub">Label every dimension before calculating.</div></div></div></div>`;
    }

    if (["probability_basics", "data_interpretation"].includes(id)) {
      const heights = id === "probability_basics" ? [35, 55, 80, 45] : [42, 68, 52, 88];
      return `<div class="concept-figure"><span class="eyebrow">${caption}</span><div class="figure-equation">${esc(formulaFor(id))}</div><div class="mini-chart">${heights.map((height, index) => `<div class="mini-bar ${index === 2 ? "highlight" : ""}" style="--bar-h:${height}%"><span>${String.fromCharCode(65 + index)}</span></div>`).join("")}</div><div class="figure-caption">Read the labels and scale before comparing values.</div></div>`;
    }

    return `<div class="concept-figure"><span class="eyebrow">${caption}</span><div class="figure-equation">${esc(formulaFor(id))}</div><div class="figure-caption">${esc(concept.description)}</div></div>`;
  }

  function renderHeader() {
    const nav = [
      ["diagnosis", "Diagnosis", "chart"],
      ["map", "Concept map", "graph"],
      ["brief", "Review brief", "file"],
      ["credits", "Credits", "users"],
    ];
    return `<header class="app-header">
      <div class="brand-lockup">
        <a class="brand" href="#" data-page="diagnosis" aria-label="MathGap diagnosis home"><span class="brand-symbol" aria-hidden="true"><span></span><span></span></span>MathGap</a>
        <span class="brand-credits">Minglang Li · Dr. Qingyang Xiao</span>
      </div>
      <nav aria-label="Workspace">${nav.map(([id, label, icon]) => `<button type="button" class="nav-item ${state.page === id ? "selected" : ""}" data-page="${id}" ${state.page === id ? 'aria-current="page"' : ""}>${svgIcon(icon)}<span>${label}</span></button>`).join("")}</nav>
      <div class="header-actions">
        <button type="button" class="button" data-action="edit" aria-label="Edit inputs" title="Edit inputs" ${!state.result || state.busy ? "disabled" : ""}>${svgIcon("sliders", 16)}<span>Edit inputs</span></button>
        <button type="button" class="button export-button" data-action="export" aria-label="${state.page === "brief" ? "Print brief" : "Export brief"}" title="${state.page === "brief" ? "Print brief" : "Export brief"}" ${!state.result || state.busy ? "disabled" : ""}>${svgIcon(state.page === "brief" ? "print" : "download", 16)}<span>${state.page === "brief" ? "Print brief" : "Export brief"}</span></button>
      </div>
    </header>`;
  }

  function renderStatus() {
    const error = state.error
      ? `<div class="error-banner" role="alert"><div><strong>Diagnosis unavailable</strong><p>${esc(state.error)}</p>${state.result ? "<small>The previous successful result is still shown.</small>" : ""}</div><button type="button" class="button small" data-action="retry" ${state.busy ? "disabled" : ""}>Retry</button></div>`
      : "";
    const pending = state.busy
      ? `<div class="pending-bar" role="status"><span class="spinner" aria-hidden="true"></span>Running diagnosis through the saved model…</div>`
      : "";
    return error + pending;
  }

  function renderDiagnosis() {
    const result = state.result;
    const recommended = currentRecommended();
    const top = conceptById(result.ranked_concepts?.[0]?.concept);
    const primary = (result.inputs.primary_concepts || []).map((id) => conceptById(id)?.label || id).join(" + ");
    return `<div class="page-scroll diagnosis-page">
      <div class="studio-index"><span>01 / DIAGNOSIS</span><span>${state.scenarioName === "Custom inputs" ? "Custom profile" : "Synthetic example"}<i></i>Grade ${esc(result.inputs.grade_level)}</span></div>
      <section class="recommendation">
        <div class="recommendation-copy">
          <span class="eyebrow">Suggested starting point</span>
          <h1><span>Start with</span><span>${esc(recommended?.label || "a foundation")}<em>.</em></span></h1>
          <p class="hero-description">${esc(recommended?.description || "Explore the concept connections behind this problem.")}</p>
          <div class="recommendation-actions">
            <button type="button" class="button primary" data-page="map">Explore connections ${svgIcon("arrow", 17)}</button>
            <button type="button" class="text-button" data-action="brief">Try a worked example ${svgIcon("arrow", 15)}</button>
          </div>
          <div class="hero-context"><span class="context-tick"></span>Reviewing <strong>${esc(result.recommended_review_label || recommended?.label || "model recommendation")}</strong></div>
        </div>
        <figure class="studio-art"><img src="art/connection-study.jpg" alt="A vermilion ribbon passes through frosted glass and brushed metal, representing connected mathematical ideas." width="1536" height="1024"/><figcaption><span>STUDY 01</span><span>Ideas build on ideas.</span></figcaption></figure>
      </section>
      <section class="concept-bench">
        <div class="bench-figure">${renderConceptFigure(recommended, false)}</div>
        <div class="bench-context"><span class="eyebrow">Why this starting point?</span><p>${esc(recommended?.label)} ${result.required_concepts.includes(recommended?.id) ? "is part of the prerequisite chain for this problem." : "was selected from the model's leading candidates by the prototype review policy."} The model’s top prediction is ${esc(top?.label || "shown below")}.</p><button type="button" class="text-button" data-page="map">See how the ideas connect ${svgIcon("arrow", 15)}</button><span class="bench-note">Illustrative example · not a student performance measure</span></div>
      </section>
      <div class="diagnosis-columns">
        <section>
          <div class="section-heading"><h2>Model candidates</h2><span>${result.ranked_concepts.length} possibilities</span></div>
          <p class="section-description">Alternative predictions for one missing concept.</p>
          <ol class="results-list">${result.ranked_concepts.map((candidate, index) => `<li><button type="button" class="result-row ${candidate.concept === result.recommended_review ? "recommended" : ""}" data-concept="${esc(candidate.concept)}" data-go-map="true"><span class="result-index">${String(index + 1).padStart(2, "0")}</span><span class="result-copy"><strong>${esc(candidate.label)}</strong><small>${esc(SHORT[candidate.concept] || conceptById(candidate.concept)?.description || "Candidate concept")}</small></span><span class="score-track" aria-hidden="true"><span style="width:${Math.max(0, Math.min(100, candidate.probability * 100))}%"></span></span><span class="result-score">${score(candidate.probability)}</span><span class="result-arrow">›</span></button></li>`).join("")}</ol>
          <p class="micro-note">Scores are uncalibrated model probabilities, not measured mastery. The review policy can choose a different starting point from the highest score.</p>
          <details class="summary-details"><summary><span>${svgIcon("sliders", 16)} Inputs behind this result</span><span>⌄</span></summary>${inputSummary(result.inputs)}<button type="button" class="button small" data-action="edit">Adjust this profile</button></details>
        </section>
        <aside class="examples">
          <div class="section-heading"><h2>Current problem</h2><span>${state.scenarioName === "Custom inputs" ? "Custom" : "Example"}</span></div>
          <dl class="profile-readout"><div><dt>Concept</dt><dd>${esc(primary)}</dd></div><div><dt>Grade</dt><dd>${esc(result.inputs.grade_level)}</dd></div><div><dt>Difficulty</dt><dd>${esc(result.inputs.difficulty)} / 4.5</dd></div><div><dt>Answer time</dt><dd>${esc(result.inputs.answer_time_sec)} sec</dd></div><div><dt>Prior accuracy</dt><dd>${esc(accuracy(result.inputs.hist_required_acc_mean))}</dd></div></dl>
          <h3 class="examples-title">Try another profile</h3>
          <div class="scenario-list">${SCENARIOS.map((scenario) => `<button type="button" class="scenario-button ${state.scenarioName === scenario.name ? "current" : ""}" data-scenario="${scenario.id}" ${state.busy ? "disabled" : ""}><span class="scenario-icon">${esc(scenario.icon)}</span><span class="scenario-copy"><strong>${esc(scenario.name)}</strong><small>${esc(scenario.description)}</small></span><span>${state.scenarioName === scenario.name ? "✓" : "↗"}</span></button>`).join("")}</div>
          <div class="method-note">${svgIcon("flask", 20)}<div><strong>Built for exploration</strong><p>These profiles are simulated. Every example runs through the saved model, which has not been validated with real students.</p></div></div>
        </aside>
      </div>
    </div>`;
  }

  function computeMapLayout(ids) {
    const idSet = new Set(ids);
    const memo = new Map();
    const levelOf = (id, stack = new Set()) => {
      if (memo.has(id)) return memo.get(id);
      if (stack.has(id)) return 0;
      const concept = conceptById(id);
      const prereqs = (concept?.prerequisites || []).filter((prereq) => idSet.has(prereq));
      const level = prereqs.length ? 1 + Math.max(...prereqs.map((prereq) => levelOf(prereq, new Set([...stack, id])))) : 0;
      memo.set(id, level);
      return level;
    };
    const groups = new Map();
    ids.forEach((id) => {
      const level = levelOf(id);
      if (!groups.has(level)) groups.set(level, []);
      groups.get(level).push(id);
    });
    const maxLevel = Math.max(0, ...groups.keys());
    const width = Math.max(920, 250 + maxLevel * 230);
    const height = 560;
    const positions = {};
    [...groups.entries()].sort((a, b) => a[0] - b[0]).forEach(([level, group]) => {
      group.sort();
      const gap = height / (group.length + 1);
      group.forEach((id, index) => {
        positions[id] = { x: 55 + level * 225, y: gap * (index + 1) - 37 };
      });
    });
    return { positions, width, height };
  }

  function labelLines(label, limit = 20) {
    const words = String(label).split(" ");
    const lines = [""];
    words.forEach((word) => {
      const current = lines[lines.length - 1];
      if ((current + " " + word).trim().length <= limit || lines.length >= 2) {
        lines[lines.length - 1] = (current + " " + word).trim();
      } else {
        lines.push(word);
      }
    });
    return lines.slice(0, 2);
  }

  function renderMap() {
    const result = state.result;
    const visible = [...new Set([
      ...(result.required_concepts || []),
      ...(result.inputs.primary_concepts || []),
      result.recommended_review,
      ...result.ranked_concepts.slice(0, 3).map((candidate) => candidate.concept),
    ].filter(Boolean))];
    const { positions, width, height } = computeMapLayout(visible);
    const nodeW = 182;
    const nodeH = 74;
    const edges = [];
    visible.forEach((id) => {
      const concept = conceptById(id);
      (concept?.prerequisites || []).filter((prereq) => visible.includes(prereq)).forEach((prereq) => {
        const a = positions[prereq];
        const b = positions[id];
        if (!a || !b) return;
        const x1 = a.x + nodeW;
        const y1 = a.y + nodeH / 2;
        const x2 = b.x;
        const y2 = b.y + nodeH / 2;
        const control = Math.max(35, (x2 - x1) * .48);
        edges.push(`<path class="map-edge" marker-end="url(#arrowhead)" d="M ${x1} ${y1} C ${x1 + control} ${y1}, ${x2 - control} ${y2}, ${x2} ${y2}"/>`);
      });
    });
    const nodes = visible.map((id, index) => {
      const concept = conceptById(id);
      const pos = positions[id];
      const lines = labelLines(concept?.label || id);
      const classes = [
        "map-node",
        state.selected === id ? "selected" : "",
        result.recommended_review === id ? "recommended" : "",
        result.inputs.primary_concepts.includes(id) ? "primary" : "",
      ].filter(Boolean).join(" ");
      return `<g class="${classes}" data-concept="${esc(id)}" transform="translate(${pos.x},${pos.y})" role="button" tabindex="0" aria-label="Select ${esc(concept?.label || id)}"><rect width="${nodeW}" height="${nodeH}"></rect><text class="node-index" x="12" y="22">${String(index + 1).padStart(2, "0")}</text><text class="node-title" x="47" y="25">${lines.map((line, lineIndex) => `<tspan x="47" dy="${lineIndex === 0 ? 0 : 16}">${esc(line)}</tspan>`).join("")}</text><text class="node-sub" x="47" y="61">${esc((SHORT[id] || "Concept").slice(0, 29))}</text></g>`;
    }).join("");
    const selected = conceptById(state.selected) || currentRecommended();
    const selectedRank = result.ranked_concepts.findIndex((candidate) => candidate.concept === selected?.id);
    return `<div class="map-page">
      <section class="map-main">
        <div class="map-heading"><div><h1>How the ideas connect</h1><p>Arrows point from a prerequisite to a concept that builds on it.</p></div><div class="map-legend"><span class="legend-chip"><span class="legend-dot recommended"></span>Suggested review</span><span class="legend-chip"><span class="legend-dot primary"></span>Problem topic</span></div></div>
        <div class="concept-map-wrap"><svg class="concept-map-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Concept prerequisite map"><defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8ba093"></path></marker></defs>${edges.join("")}${nodes}<text x="${width - 20}" y="${height - 16}" text-anchor="end" class="map-badge">Build on an earlier skill →</text></svg></div>
      </section>
      <aside class="inspector">
        <section><div>${selected?.id === result.recommended_review ? '<span class="badge review">Suggested review</span>' : result.inputs.primary_concepts.includes(selected?.id) ? '<span class="badge primary">Problem topic</span>' : '<span class="badge">Selected concept</span>'}</div><h2 tabindex="-1">${esc(selected?.label || "Concept")}</h2><p>${esc(selected?.description || "Select a concept to inspect it.")}</p></section>
        <section>${renderConceptFigure(selected, true)}</section>
        <section><h3>What to understand</h3><ul class="key-ideas">${(selected?.key_ideas || []).map((idea) => `<li>${esc(idea)}</li>`).join("")}</ul></section>
        <section><h3>Try a quick check</h3><div class="quick-check"><p>${esc(selected?.review_prompt || "Review this concept with a worked example.")}</p><details><summary>Reveal answer</summary><p>${esc(selected?.review_answer || "")}</p></details></div></section>
        <section><div class="section-heading"><h3>Other possibilities</h3><span>Model ranking</span></div><ol class="rank-list">${result.ranked_concepts.map((candidate, index) => `<li><button type="button" class="${candidate.concept === selected?.id ? "active" : ""}" data-concept="${esc(candidate.concept)}"><span>${index + 1}</span><span><strong>${esc(candidate.label)}</strong><small>${esc(SHORT[candidate.concept] || "Candidate concept")}</small></span><span class="score">${score(candidate.probability)}</span></button></li>`).join("")}</ol>${selectedRank < 0 ? '<p class="micro-note">This prerequisite is outside the seven model candidates but is part of the mathematical dependency map.</p>' : ""}</section>
      </aside>
    </div>`;
  }

  function renderBrief() {
    const result = state.result;
    const recommended = currentRecommended();
    const lookup = Object.fromEntries(state.concepts.map((concept) => [concept.id, concept]));
    const date = new Date(state.createdAt || Date.now());
    const primary = result.inputs.primary_concepts.map((id) => lookup[id]?.label || id).join(" + ");
    return `<div class="page-scroll brief-page">
      <div class="page-heading no-print"><div><h1>Review brief</h1><p>A practical starting point for a review session.</p></div><button type="button" class="button" data-page="map">${svgIcon("back")} Back to map</button></div>
      <article class="brief-paper">
        <header class="brief-header"><span class="wordmark">MathGap<small>Author: Minglang Li · Mentor: Dr. Qingyang Xiao</small></span><span>Review brief<br><time datetime="${esc(state.createdAt)}">${esc(date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }))}</time></span></header>
        <div class="brief-title"><span class="eyebrow">${state.scenarioName === "Custom inputs" ? "Custom problem profile" : "Synthetic example"}</span><h2>${esc(primary)}</h2><p>Grade ${esc(result.inputs.grade_level)} · Difficulty ${esc(result.inputs.difficulty)} · Answer time ${esc(result.inputs.answer_time_sec)} seconds</p></div>
        <section class="brief-recommendation"><div><span class="badge review">Suggested review</span><h3>${esc(recommended?.label)}</h3><p>${esc(recommended?.description)}</p></div>${renderConceptFigure(recommended, true)}</section>
        <section><h3>Start here</h3><ul class="key-ideas">${(recommended?.key_ideas || []).map((idea) => `<li>${esc(idea)}</li>`).join("")}</ul><div class="review-exercise"><strong>Try together</strong><p>${esc(recommended?.review_prompt)}</p><details><summary>Show worked answer</summary><p>${esc(recommended?.review_answer)}</p></details></div></section>
        <section><h3>How the skills connect</h3><p class="section-description">Each line names a concept and the direct skills it builds on.</p><ul class="brief-prereqs">${result.required_concepts.map((id) => { const concept = lookup[id]; return `<li><strong>${esc(concept?.label || id)}</strong><span>${concept?.prerequisites?.length ? esc(concept.prerequisites.map((prereq) => lookup[prereq]?.label || prereq).join(" · ")) : "Foundation concept"}</span></li>`; }).join("")}</ul></section>
        <section><h3>Model output</h3><table><thead><tr><th>Candidate</th><th>Model score</th></tr></thead><tbody>${result.ranked_concepts.map((candidate) => `<tr><td>${esc(candidate.label)}${candidate.concept === result.recommended_review ? " · Suggested review" : ""}</td><td>${score(candidate.probability)}</td></tr>`).join("")}</tbody></table><p class="micro-note">These are alternative predictions for a single top gap. Scores are uncalibrated. The review recommendation comes from the prototype’s simulated review policy.</p></section>
        <section><h3>Inputs used</h3>${inputSummary(result.inputs, true)}</section>
        <footer class="brief-footer">Research prototype trained on synthetic data. This brief suggests review topics; it does not establish mastery or an educational placement. Project author: <strong>Minglang Li</strong>. Mentor: <strong>Dr. Qingyang Xiao</strong>.</footer>
      </article>
      <div class="brief-bottom no-print"><button type="button" class="button" data-action="download-json">${svgIcon("download")} Download JSON</button><button type="button" class="button primary" data-action="print">${svgIcon("print")} Print / Save as PDF</button></div>
    </div>`;
  }

  function renderCredits() {
    return `<div class="page-scroll credits-page">
      <section class="credits-hero"><div><span class="eyebrow">04 / PROJECT CREDITS</span><h1>Built by a student.<br><em>Guided by a mentor.</em></h1><p>MathGap turns the original AI math concept-gap notebook into a polished, GitHub-ready Streamlit application. The attached UI’s mathematical instrument-studio design has been adapted into a native Streamlit custom component while the saved Python model remains the source of every diagnosis.</p></div><figure class="credits-art"><img src="art/loop-study.jpg" alt="A red ring supported by precise metal pieces and a translucent plane, representing an incomplete connection ready to be closed." width="2752" height="1536"/></figure></section>
      <section class="credits-grid">
        <article class="credit-card"><span class="credit-role">Author / Student Developer</span><h2>Minglang Li</h2><p>Created the original AI-based math concept-gap project and student-facing research workflow.</p><ul><li>Student project authorship and concept development</li><li>Notebook-based data science and machine-learning workflow</li><li>Educational use-case design and application direction</li></ul></article>
        <article class="credit-card mentor"><span class="credit-role">Mentor / Project Advisor</span><h2>Dr. Qingyang Xiao</h2><p>Mentored the project’s AI application design, technical organization, deployment pathway, and responsible-use framing.</p><ul><li>AI/ML project mentorship and technical guidance</li><li>GitHub and Streamlit deployment architecture</li><li>Research communication and responsible-AI review</li></ul></article>
      </section>
      <section class="project-panel"><div><h2>Integrated application</h2><p>The deployment uses one Streamlit process. Python performs model validation and inference; a static browser component presents the attached UI design, sends validated inputs to Streamlit, and receives the model result on rerun. No separate FastAPI or Node server is required on Streamlit Community Cloud.</p><div class="safety-note"><strong>Responsible use:</strong> Use synthetic or approved non-sensitive data only. Do not enter identifiable student records or CUI, FOUO, ITAR, EAR, PII, or PHI.</div></div><div><h2>Technology</h2><ul class="stack-list"><li>Python 3.11</li><li>Streamlit</li><li>scikit-learn 1.8</li><li>Random Forest</li><li>joblib</li><li>HTML / CSS / JavaScript</li><li>Custom Component Protocol</li><li>GitHub</li></ul></div></section>
    </div>`;
  }

  function renderInitial() {
    return `<div class="initial-state"><div class="initial-card"><span class="spinner" aria-hidden="true"></span><h1>${state.error ? "Connect the research model" : "Preparing your workspace"}</h1><p>${state.error ? esc(state.error) : "Loading the concept library and running the percentages example through the saved model."}</p></div></div>`;
  }

  function numberField(field, value) {
    return `<label>${esc(field.label)}<span class="range-hint">${field.min} to ${field.max}</span><input type="number" name="${esc(field.key)}" min="${field.min}" max="${field.max}" step="${field.step}" value="${esc(value)}" required></label>`;
  }

  function renderInputDialog() {
    const draft = state.draft || clone(state.result?.inputs || DEFAULTS);
    const fieldGroup = (group) => FIELDS.filter((field) => field.group === group).map((field) => numberField(field, draft[field.key])).join("");
    return `<dialog id="input-dialog" class="modal wide"><div class="modal-head"><h2>Diagnosis inputs</h2><button type="button" class="icon-button" data-action="close-input" aria-label="Close diagnosis inputs">${svgIcon("close", 20)}</button></div><form id="diagnosis-form"><div class="modal-body"><p class="form-intro">Describe an incorrect answer and the learning history behind it.</p><label class="preset-label">Start with a synthetic example<select id="preset-select"><option value="">Custom inputs</option>${SCENARIOS.map((scenario) => `<option value="${scenario.id}" ${state.draftScenario === scenario.name ? "selected" : ""}>${esc(scenario.name)}</option>`).join("")}</select></label><fieldset><legend>Problem</legend><div class="form-grid">${fieldGroup("problem")}<label>Problem grade band<select name="grade_band"><option value="elementary" ${draft.grade_band === "elementary" ? "selected" : ""}>Elementary</option><option value="middle" ${draft.grade_band === "middle" ? "selected" : ""}>Middle</option><option value="high" ${draft.grade_band === "high" ? "selected" : ""}>High</option></select></label></div><div class="field-caption">Primary concepts tested by the problem</div><div class="concept-picker">${state.concepts.map((concept) => `<label class="concept-choice"><input type="checkbox" name="primary_concepts" value="${esc(concept.id)}" ${(draft.primary_concepts || []).includes(concept.id) ? "checked" : ""}><span>${esc(concept.label)}</span></label>`).join("")}</div>${state.formError ? `<p class="field-error" role="alert">${esc(state.formError)}</p>` : ""}</fieldset><fieldset><legend>Prior performance</legend><p class="form-hint">Accuracy uses 0–1 (0.3 = 30%). Enter −1 when unknown. Other negative values are research placeholders.</p><div class="form-grid">${fieldGroup("history")}</div></fieldset><details class="research-details"><summary>Additional research assumptions <span>Optional profile signals</span></summary><p class="form-hint">These values are synthetic research inputs, not app-generated judgments about a student.</p><div class="form-grid">${fieldGroup("research")}</div></details></div><div class="modal-actions"><span class="status">${state.formError ? esc(state.formError) : ""}</span><button type="button" class="button" data-action="close-input">Cancel</button><button type="submit" class="button primary" ${state.busy ? "disabled" : ""}>Run diagnosis ${svgIcon("arrow", 16)}</button></div></form></dialog>`;
  }

  function renderAboutDialog() {
    const metadata = state.result?.model_metadata;
    return `<dialog id="about-dialog" class="modal"><div class="modal-head"><h2>About this model</h2><button type="button" class="icon-button" data-action="close-about" aria-label="Close about this model">${svgIcon("close", 20)}</button></div><div class="modal-body methodology"><figure class="method-art"><img src="art/loop-study.jpg" alt="An open red ring supported by precision metal pieces and a translucent plane." width="2752" height="1536"><figcaption>STUDY 02 / THE MISSING CONNECTION</figcaption></figure><p>MathGap explores which mathematical concept might need review after an incorrect answer.</p><ol><li>A Random Forest predicts one top missing concept from a problem profile and learning history.</li><li>The ranking shows alternative labels with uncalibrated model scores.</li><li>A simulated review policy selects a concept to review from those candidates.</li></ol><h3>Synthetic research model</h3><p>The model was trained and evaluated on simulated data. Its scores and validation accuracy do not establish performance with real students.</p>${metadata ? `<dl class="input-summary"><div><dt>Model</dt><dd>${esc(metadata.model_type)}</dd></div><div><dt>Synthetic training rows</dt><dd>${Number(metadata.training_rows).toLocaleString()}</dd></div><div><dt>Validation top-1 accuracy</dt><dd>${score(metadata.validation_accuracy)}</dd></div><div><dt>Supported concepts</dt><dd>${state.concepts.length}</dd></div></dl>` : ""}<div class="credit-inline"><div><span>Author</span><strong>Minglang Li</strong></div><div><span>Mentor</span><strong>Dr. Qingyang Xiao</strong></div></div></div><div class="modal-actions"><button type="button" class="button primary" data-action="close-about">Got it</button></div></dialog>`;
  }

  function renderFooter() {
    return `<footer class="app-footer"><span class="footer-mark">◇ <span>Ideas build on ideas.</span></span><span class="footer-divider"></span><button type="button" data-action="about">Model trained on synthetic data ${svgIcon("info", 12)}</button><span class="footer-credits">Author: Minglang Li · Mentor: Dr. Qingyang Xiao</span></footer>`;
  }

  function renderApp() {
    const content = !state.result
      ? renderInitial()
      : state.page === "map"
        ? renderMap()
        : state.page === "brief"
          ? renderBrief()
          : state.page === "credits"
            ? renderCredits()
            : renderDiagnosis();

    root.innerHTML = `<div class="app-shell">${renderHeader()}<main id="workspace" class="workspace" tabindex="-1">${renderStatus()}${content}</main>${renderFooter()}</div>${renderInputDialog()}${renderAboutDialog()}<div class="sr-only" role="status" aria-live="polite">${state.busy ? "Running diagnosis" : state.error ? esc(state.error) : "Workspace ready"}</div>`;
    bindEvents();
    if (state.inputOpen) document.getElementById("input-dialog")?.showModal();
    if (state.aboutOpen) document.getElementById("about-dialog")?.showModal();
    requestAnimationFrame(setFrameHeight);
  }

  function navigate(page) {
    if (!["diagnosis", "map", "brief", "credits"].includes(page)) return;
    state.page = page;
    renderApp();
    document.getElementById("workspace")?.focus({ preventScroll: true });
  }

  function openInputs() {
    if (!state.result || state.busy) return;
    state.draft = clone(state.result.inputs);
    state.draftScenario = "Custom inputs";
    state.formError = "";
    state.inputOpen = true;
    renderApp();
  }

  function closeInputs() {
    state.inputOpen = false;
    state.formError = "";
    document.getElementById("input-dialog")?.close();
    renderApp();
  }

  function runDiagnosis(inputs, scenarioName) {
    if (state.busy) return;
    const requestId = `mathgap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    state.busy = true;
    state.error = "";
    state.pendingScenarioName = scenarioName || "Custom inputs";
    state.inputOpen = false;
    renderApp();
    setComponentValue({ action: "diagnose", request_id: requestId, inputs });
    state.pendingTimer = window.setTimeout(() => {
      if (!state.busy) return;
      state.busy = false;
      state.error = "The diagnosis took too long. Your previous result is still available; please retry.";
      renderApp();
    }, 30000);
  }

  function collectFormInputs(form) {
    const data = new FormData(form);
    const inputs = {};
    FIELDS.forEach((field) => {
      const raw = data.get(field.key);
      inputs[field.key] = ["grade_level", "hist_total_attempts_on_required", "hist_total_attempts_on_primary"].includes(field.key)
        ? Number.parseInt(raw, 10)
        : Number.parseFloat(raw);
    });
    inputs.grade_band = String(data.get("grade_band") || "middle");
    inputs.primary_concepts = data.getAll("primary_concepts").map(String);
    return inputs;
  }

  function downloadJSON() {
    if (!state.result) return;
    const payload = {
      schema_version: 1,
      created_at: state.createdAt,
      scenario: state.scenarioName,
      author: "Minglang Li",
      mentor: "Dr. Qingyang Xiao",
      ...state.result,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mathgap-diagnosis-${new Date(state.createdAt).toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function bindEvents() {
    root.querySelectorAll("[data-page]").forEach((element) => element.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(element.dataset.page);
    }));

    root.querySelectorAll('[data-action="edit"]').forEach((element) => element.addEventListener("click", openInputs));
    root.querySelectorAll('[data-action="brief"]').forEach((element) => element.addEventListener("click", () => navigate("brief")));
    root.querySelectorAll('[data-action="export"]').forEach((element) => element.addEventListener("click", () => state.page === "brief" ? window.print() : navigate("brief")));
    root.querySelectorAll('[data-action="print"]').forEach((element) => element.addEventListener("click", () => window.print()));
    root.querySelectorAll('[data-action="download-json"]').forEach((element) => element.addEventListener("click", downloadJSON));

    root.querySelectorAll("[data-concept]").forEach((element) => {
      const select = () => {
        state.selected = element.dataset.concept;
        if (element.dataset.goMap === "true") state.page = "map";
        renderApp();
      };
      element.addEventListener("click", select);
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select();
        }
      });
    });

    root.querySelectorAll("[data-scenario]").forEach((element) => element.addEventListener("click", () => {
      const scenario = SCENARIOS.find((item) => item.id === element.dataset.scenario);
      if (scenario) runDiagnosis(clone(scenario.inputs), scenario.name);
    }));

    root.querySelectorAll("[data-fraction]").forEach((element) => element.addEventListener("click", () => {
      state.fractionParts = Number(element.dataset.fraction);
      renderApp();
    }));

    root.querySelectorAll('[data-action="about"]').forEach((element) => element.addEventListener("click", () => {
      state.aboutOpen = true;
      renderApp();
    }));
    root.querySelectorAll('[data-action="close-about"]').forEach((element) => element.addEventListener("click", () => {
      state.aboutOpen = false;
      document.getElementById("about-dialog")?.close();
      renderApp();
    }));
    root.querySelectorAll('[data-action="close-input"]').forEach((element) => element.addEventListener("click", closeInputs));

    root.querySelectorAll('[data-action="retry"]').forEach((element) => element.addEventListener("click", () => {
      if (state.result) runDiagnosis(clone(state.result.inputs), state.scenarioName);
      else runDiagnosis(clone(DEFAULTS), "Percentages");
    }));

    const preset = document.getElementById("preset-select");
    preset?.addEventListener("change", () => {
      const scenario = SCENARIOS.find((item) => item.id === preset.value);
      state.draft = scenario ? clone(scenario.inputs) : clone(state.result?.inputs || DEFAULTS);
      state.draftScenario = scenario?.name || "Custom inputs";
      state.inputOpen = true;
      state.formError = "";
      renderApp();
    });

    const form = document.getElementById("diagnosis-form");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const inputs = collectFormInputs(form);
      if (!inputs.primary_concepts.length) {
        state.formError = "Select at least one primary concept.";
        state.draft = inputs;
        state.inputOpen = true;
        renderApp();
        return;
      }
      const invalid = Object.entries(inputs).some(([key, value]) => key !== "primary_concepts" && key !== "grade_band" && !Number.isFinite(value));
      if (invalid) {
        state.formError = "Complete every numeric input with a valid number.";
        state.draft = inputs;
        state.inputOpen = true;
        renderApp();
        return;
      }
      runDiagnosis(inputs, state.draftScenario || "Custom inputs");
    });

    const inputDialog = document.getElementById("input-dialog");
    inputDialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeInputs();
    });
    const aboutDialog = document.getElementById("about-dialog");
    aboutDialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      state.aboutOpen = false;
      renderApp();
    });
  }

  // A standalone preview is helpful when opening component/index.html directly.
  if (window.parent === window) {
    state.busy = false;
    state.error = "Open this component through `streamlit run app.py` to connect the Python model.";
    renderApp();
  } else {
    renderApp();
  }
})();
