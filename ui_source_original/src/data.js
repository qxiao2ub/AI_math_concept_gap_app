export const defaults = {
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
export const scenarios = [
  {
    id: "percentages",
    name: "Percentages",
    description: "Connect parts of a whole to parts per hundred.",
    inputs: { ...defaults },
  },
  {
    id: "algebra",
    name: "Quadratic equations",
    description: "Trace an algebra problem back to its foundations.",
    inputs: {
      ...defaults,
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
    inputs: {
      ...defaults,
      grade_level: 7,
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
export const fields = [
  {
    key: "grade_level",
    label: "Student grade",
    min: 5,
    max: 11,
    step: 1,
    group: "problem",
  },
  {
    key: "difficulty",
    label: "Problem difficulty",
    min: 0.5,
    max: 4.5,
    step: 0.1,
    group: "problem",
  },
  {
    key: "answer_time_sec",
    label: "Answer time (seconds)",
    min: 10,
    max: 240,
    step: 1,
    group: "problem",
  },
  {
    key: "pre_answer_confidence",
    label: "Pre-answer confidence",
    min: 0.01,
    max: 0.99,
    step: 0.01,
    group: "problem",
  },
  {
    key: "hist_required_acc_mean",
    label: "Prior accuracy · required concepts",
    min: -1,
    max: 1,
    step: 0.05,
    group: "history",
  },
  {
    key: "hist_primary_acc_mean",
    label: "Prior accuracy · primary concepts",
    min: -1,
    max: 1,
    step: 0.05,
    group: "history",
  },
  {
    key: "hist_total_attempts_on_required",
    label: "Prior attempts · required concepts",
    min: 0,
    max: 200,
    step: 1,
    group: "history",
  },
  {
    key: "hist_total_attempts_on_primary",
    label: "Prior attempts · primary concepts",
    min: 0,
    max: 200,
    step: 1,
    group: "history",
  },
  {
    key: "study_hours_per_week",
    label: "Study hours per week",
    min: 0.5,
    max: 12,
    step: 0.5,
    group: "research",
  },
  {
    key: "attendance_rate",
    label: "Attendance rate",
    min: 0.5,
    max: 1,
    step: 0.01,
    group: "research",
  },
  {
    key: "confidence_trait",
    label: "Confidence trait",
    min: 0.05,
    max: 0.99,
    step: 0.01,
    group: "research",
  },
  {
    key: "carelessness",
    label: "Carelessness proxy",
    min: 0,
    max: 0.4,
    step: 0.01,
    group: "research",
  },
];
export const score = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(n);
export const accuracy = (n) =>
  n === -1 ? "Unknown" : n < 0 ? `${n} (research placeholder)` : score(n);
export async function requestJSON(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = body?.detail;
      throw new Error(
        Array.isArray(detail)
          ? detail
              .map((x) => `${x.loc.slice(1).join(" ")}: ${x.msg}`)
              .join("; ")
          : typeof detail === "string"
            ? detail
            : "The diagnosis service is unavailable. Please try again.",
      );
    }
    if (!body)
      throw new Error(
        "The service returned an unreadable response. Please try again.",
      );
    return body;
  } catch (e) {
    if (e.name === "AbortError")
      throw new Error(
        "The diagnosis took too long. Your inputs are still here. Please retry.",
      );
    if (e instanceof TypeError)
      throw new Error(
        "Could not connect to the diagnosis service. Your inputs are still here. Please retry.",
      );
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
