import { SHORT_DESCRIPTIONS } from "./conceptPresentation.js";
import React, { useEffect, useRef, useState } from "react";
import {
  ChartBarIcon,
  GraphIcon,
  FileTextIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  XIcon,
  ArrowClockwiseIcon,
  DownloadSimpleIcon,
  PrinterIcon,
  InfoIcon,
  CheckIcon,
  CircleNotchIcon,
  CaretDownIcon,
  IntersectIcon,
  SlidersHorizontalIcon,
  CubeIcon,
  FunctionIcon,
  PercentIcon,
  CaretRightIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  FlaskIcon,
} from "@phosphor-icons/react";
import katex from "katex";
import "katex/dist/katex.min.css";
import ConceptMap from "./ConceptMap.jsx";
import ConceptFigure from "./ConceptFigure.jsx";
import {
  defaults,
  scenarios,
  fields,
  score,
  accuracy,
  requestJSON,
} from "./data.js";

const modelNote = "Model trained on synthetic data";
const nav = [
  { id: "diagnosis", label: "Diagnosis", Icon: ChartBarIcon },
  { id: "map", label: "Concept map", Icon: GraphIcon },
  { id: "brief", label: "Review brief", Icon: FileTextIcon },
];
function MathText({ value, block = false }) {
  return (
    <span
      className="math-typeset"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(value || "", {
          throwOnError: false,
          displayMode: block,
          strict: "ignore",
        }),
      }}
    />
  );
}
function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) {
      d.showModal();
      d.scrollTop = 0;
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby={`modal-${title.replaceAll(" ", "-")}`}
    >
      <div className="modal-head">
        <div>
          <h2 id={`modal-${title.replaceAll(" ", "-")}`}>{title}</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={`Close ${title}`}
        >
          <XIcon size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function InputSummary({ inputs, concepts, expanded = false }) {
  const labels = Object.fromEntries(concepts.map((c) => [c.id, c.label]));
  return (
    <dl className={`input-summary ${expanded ? "expanded-summary" : ""}`}>
      <div>
        <dt>Problem concepts</dt>
        <dd>{inputs.primary_concepts.map((c) => labels[c] || c).join(", ")}</dd>
      </div>
      <div>
        <dt>Problem grade band</dt>
        <dd>{inputs.grade_band}</dd>
      </div>
      {fields.map((f) => (
        <div key={f.key}>
          <dt>{f.label}</dt>
          <dd>
            {f.key.includes("_acc_") ? accuracy(inputs[f.key]) : inputs[f.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function EditInputs({
  open,
  onClose,
  initial,
  concepts,
  onRun,
  busy,
  requestError,
}) {
  const [draft, setDraft] = useState(initial);
  const [scenario, setScenario] = useState("Custom inputs");
  const [error, setError] = useState("");
  const firstConcept = useRef(null);
  useEffect(() => {
    if (open) {
      setDraft({ ...initial, primary_concepts: [...initial.primary_concepts] });
      setScenario("Custom inputs");
      setError("");
    }
  }, [open, initial]);
  function set(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
    setScenario("Custom inputs");
  }
  function submit(e) {
    e.preventDefault();
    if (!draft.primary_concepts.length) {
      setError("Select at least one problem concept.");
      firstConcept.current?.focus();
      return;
    }
    setError("");
    onRun(draft, scenario);
  }
  return (
    <Modal open={open} onClose={onClose} title="Diagnosis inputs" wide>
      <form onSubmit={submit}>
        <div className="modal-body">
          <fieldset className="input-fields" disabled={busy}>
            <p className="form-intro">
              Describe an incorrect answer and the learning history behind it.
            </p>
            <label className="preset-label">
              Start with a synthetic example
              <select
                value={scenarios.find((s) => s.name === scenario)?.id || ""}
                onChange={(e) => {
                  const s = scenarios.find((s) => s.id === e.target.value);
                  if (s) {
                    setDraft({ ...s.inputs });
                    setScenario(s.name);
                    setError("");
                  }
                }}
              >
                <option value="">Custom inputs</option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend>Problem</legend>
              <div className="form-grid">
                {fields
                  .filter((f) => f.group === "problem")
                  .map((f) => (
                    <NumberField
                      key={f.key}
                      field={f}
                      value={draft[f.key]}
                      onChange={(v) => set(f.key, v)}
                    />
                  ))}
                <label>
                  Problem grade band
                  <select
                    value={draft.grade_band}
                    onChange={(e) => set("grade_band", e.target.value)}
                  >
                    <option value="elementary">Elementary</option>
                    <option value="middle">Middle</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>
              <div className="field-caption" id="concept-help">
                Primary concepts tested by the problem
              </div>
              <div
                className="concept-picker"
                role="group"
                aria-labelledby="concept-help"
              >
                {concepts.map((c, i) => (
                  <label className="concept-choice" key={c.id}>
                    <input
                      ref={i === 0 ? firstConcept : undefined}
                      type="checkbox"
                      checked={draft.primary_concepts.includes(c.id)}
                      onChange={(e) =>
                        set(
                          "primary_concepts",
                          e.target.checked
                            ? [...draft.primary_concepts, c.id]
                            : draft.primary_concepts.filter((x) => x !== c.id),
                        )
                      }
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
            </fieldset>
            <fieldset>
              <legend>Prior performance</legend>
              <p className="field-hint">
                Accuracy uses 0–1 (0.3 = 30%). Enter −1 when unknown. Other
                negative values are research placeholders.
              </p>
              <div className="form-grid">
                {fields
                  .filter((f) => f.group === "history")
                  .map((f) => (
                    <NumberField
                      key={f.key}
                      field={f}
                      value={draft[f.key]}
                      onChange={(v) => set(f.key, v)}
                    />
                  ))}
              </div>
            </fieldset>
            <details className="research-details">
              <summary>
                Additional research inputs{" "}
                <span>Applied defaults included</span>
                <CaretDownIcon size={16} />
              </summary>
              <p className="field-hint">
                These are assumptions used by the synthetic model, not
                assessments of a student's character. Adjust only to explore
                model behavior.
              </p>
              <div className="form-grid">
                {fields
                  .filter((f) => f.group === "research")
                  .map((f) => (
                    <NumberField
                      key={f.key}
                      field={f}
                      value={draft[f.key]}
                      onChange={(v) => set(f.key, v)}
                    />
                  ))}
              </div>
            </details>
          </fieldset>
          {requestError && (
            <p className="form-request-error" role="alert">
              {requestError} Your draft is preserved. Run diagnosis to retry.
            </p>
          )}
        </div>
        <div className="modal-actions">
          <span>All values stay in this session.</span>
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy} type="submit">
            {busy ? <CircleNotchIcon className="spin" /> : <ArrowRightIcon />}
            Run diagnosis
          </button>
        </div>
      </form>
    </Modal>
  );
}
function NumberField({ field: f, value, onChange }) {
  return (
    <label>
      {f.label}
      <input
        type="number"
        required
        min={f.min}
        max={f.max}
        step={f.step}
        value={value}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
      />
      <span className="range-hint">
        {f.min}–{f.max}
      </span>
    </label>
  );
}
function Figure({ concept, compact = false, interactive = true }) {
  return <ConceptFigure key={concept.id} concept={concept} compact={compact} interactive={interactive} />;
}
function Inspector({ concept, concepts, result, onSelect, containerRef }) {
  const [showAll, setShowAll] = useState(false);
  if (!concept) return null;
  const suggested = concept.id === result.recommended_review;
  return (
    <aside className="inspector" ref={containerRef} aria-label="Selected concept details">
      <section className="inspector-intro">
        <span className={`badge ${suggested ? "review-badge" : "selection-badge"}`}>
          {suggested ? <CheckIcon size={13} weight="bold" /> : <GraphIcon size={13} />}
          {suggested ? "Suggested review" : "Selected concept"}
        </span>
        <h2 tabIndex={-1}>{concept.label}</h2>
        <p>{concept.description}</p>
      </section>
      <section className="inspector-figure">
        <Figure concept={concept} compact />
      </section>
      <section>
        <h3>What to understand</h3>
        <ul className="key-ideas">
          {concept.key_ideas.map(x => <li key={x}>{x}</li>)}
        </ul>
        <details className="inspector-exercise">
          <summary>Try a quick check <ArrowUpRightIcon size={14} /></summary>
          <p>{concept.review_prompt}</p>
          <details><summary>Reveal answer</summary><p>{concept.review_answer}</p></details>
        </details>
        {!result.required_concepts.includes(concept.id) && (
          <p className="outside-note">This candidate is outside the problem's prerequisite map.</p>
        )}
      </section>
      <section>
        <div className="section-heading"><h3>Other possibilities</h3><span>Model ranking</span></div>
        <ol className="ranking-list">
          {result.ranked_concepts.slice(0, showAll ? 7 : 3).map((c, i) => (
            <li key={c.concept}>
              <button onClick={() => onSelect(c.concept)} aria-pressed={concept.id === c.concept} className={concept.id === c.concept ? "active" : ""}>
                <span className="rank-number">{i + 1}</span>
                <span><strong>{c.label}</strong><small>{SHORT_DESCRIPTIONS[c.concept] || concepts.find(x => x.id === c.concept)?.description}</small></span>
                {showAll && <span className="ranking-score">{score(c.probability)}</span>}
              </button>
            </li>
          ))}
        </ol>
        <button className="text-button small" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show fewer candidates" : "See all scores"}<CaretDownIcon size={14} style={{ transform: showAll ? "rotate(180deg)" : undefined }} />
        </button>
        {showAll && <p className="micro-note">Alternative top-gap predictions, not separate confirmed gaps. Scores are uncalibrated.</p>}
      </section>
    </aside>
  );
}
const scenarioIcons = { percentages: PercentIcon, algebra: FunctionIcon, geometry: CubeIcon };
function Diagnosis({ result, concepts, onEdit, onMap, onScenario, onBrief, busy, name }) {
  const recommended = concepts.find(c => c.id === result.recommended_review);
  const primary = result.inputs.primary_concepts.length > 2
    ? `${result.inputs.primary_concepts.length} selected problem concepts`
    : result.inputs.primary_concepts.map(id => concepts.find(c => c.id === id)?.label || id).join(" + ");
  const top = result.ranked_concepts[0];
  const isPrerequisite = recommended && result.required_concepts.includes(recommended.id) && !result.inputs.primary_concepts.includes(recommended.id);
  const outsideMap = recommended && !result.required_concepts.includes(recommended.id);
  const recommendationContext = top?.concept === recommended?.id
    ? "The model’s highest-ranked concept for this profile."
    : `${isPrerequisite ? `${recommended.label} is a prerequisite for this problem. ` : outsideMap ? "This suggestion is outside the problem’s prerequisites. " : "This is the suggested first review. "}The model’s top prediction is ${top?.label}.`;
  return (
    <div className="page-scroll diagnosis-page">
      <div className="studio-index"><span>01 / DIAGNOSIS</span><span>{name === "Custom inputs" ? "Custom profile" : "Synthetic example"}<i />Grade {result.inputs.grade_level}</span></div>
      <section className="recommendation" aria-label="Suggested next review">
        <div className="recommendation-copy">
          <h1 className={recommended?.label.length > 18 ? "long-concept" : ""}><span>Start with</span> {recommended?.label || "a review"}<em>.</em></h1>
          <p className="hero-description">{recommended?.description || "Explore the ranked candidates below."}</p>
          <div className="recommendation-actions">
            <button className="button primary" onClick={() => onMap(recommended?.id)}>Explore connections<ArrowRightIcon size={18} /></button>
            <button className="text-button" onClick={onBrief}>Try a worked example<ArrowUpRightIcon size={16} /></button>
          </div>
          <div className="hero-context"><span className="context-tick" /><span>Reviewing <strong>{primary}</strong></span></div>
        </div>
        <figure className="studio-art">
          <img src="/art/connection-study.jpg" alt="A vermilion ribbon connects through frosted glass and brushed aluminum." width="1536" height="1024" fetchPriority="high" />
          <figcaption><span>STUDY 01</span><span>Ideas build on ideas.</span></figcaption>
        </figure>
      </section>
      <section className="concept-bench" aria-label="Explore the suggested concept">
        <div className="bench-figure"><span className="eyebrow">Make it tangible</span>{recommended && <Figure concept={recommended} />}</div>
        <div className="bench-context"><span className="eyebrow">Why this starting point?</span><p>{recommendationContext}</p><button className="text-button" onClick={() => onMap(recommended?.id)}><BookOpenIcon size={17} />See how the ideas connect<ArrowRightIcon size={16} /></button><span className="bench-note">Illustrative example · not a student performance measure</span></div>
      </section>
      <div className="diagnosis-columns">
        <section className="diagnosis-main">
          <div className="section-heading"><h2>Model candidates</h2><span>{result.ranked_concepts.length} possibilities</span></div>
          <p className="section-description">Alternative predictions for one missing concept.</p>
          <ol className="results-list" aria-label="Model candidates">
            {result.ranked_concepts.map((c, i) => (
              <li key={c.concept}>
                <button className={`result-row ${c.concept === result.recommended_review ? "is-recommended" : ""}`} onClick={() => onMap(c.concept)} aria-label={`Explore ${c.label}, model score ${score(c.probability)}`}>
                  <span className="result-index">{String(i + 1).padStart(2, "0")}</span>
                  <span className="result-copy"><strong>{c.label}</strong><small>{SHORT_DESCRIPTIONS[c.concept] || concepts.find(x => x.id === c.concept)?.description}</small></span>
                  <span className="score-track" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, c.probability * 100))}%` }} /></span>
                  <span className="result-score" aria-label={`Model score ${score(c.probability)}`}>{score(c.probability)}</span>
                  <CaretRightIcon className="result-arrow" size={14} />
                </button>
              </li>
            ))}
          </ol>
          <p className="micro-note">Scores are uncalibrated model probabilities, not measured mastery.{top?.concept !== recommended?.id ? " The review policy can suggest a different starting point from the highest score." : ""}</p>
          <details className="summary-details"><summary><span><SlidersHorizontalIcon size={17} />Inputs behind this result</span><CaretDownIcon size={16} /></summary><InputSummary inputs={result.inputs} concepts={concepts} /><button className="button small-button" disabled={busy} onClick={onEdit}>Adjust this profile</button></details>
        </section>
        <aside className="examples">
          <div className="section-heading"><h2>Current problem</h2><span>{name === "Custom inputs" ? "Custom" : "Example"}</span></div>
          <dl className="profile-readout"><div><dt>Concept</dt><dd>{primary}</dd></div><div><dt>Grade</dt><dd>{result.inputs.grade_level}</dd></div><div><dt>Difficulty</dt><dd>{result.inputs.difficulty}<span> / 4.5</span></dd></div><div><dt>Answer time</dt><dd>{result.inputs.answer_time_sec} sec</dd></div><div><dt>Prior accuracy</dt><dd>{accuracy(result.inputs.hist_required_acc_mean)}</dd></div></dl>
          <h3 className="examples-title">Try another profile</h3>
          <div className="scenario-list">
            {scenarios.map(s => {
              const Icon = scenarioIcons[s.id];
              const active = name === s.name;
              return <button disabled={busy} className={`scenario-button ${active ? "is-current" : ""}`} key={s.id} onClick={() => onScenario(s)}>
                <span className={`scenario-icon scenario-${s.id}`}><Icon size={23} weight="regular" /></span>
                <span className="scenario-copy"><strong>{s.name}</strong><small>{s.description}</small></span>
                {active ? <CheckIcon size={16} /> : <ArrowUpRightIcon size={17} />}
              </button>;
            })}
          </div>
          <div className="method-note"><FlaskIcon size={20} /><div><strong>Built for exploration</strong><p>These profiles are simulated. Every example runs through the real model, which has not been validated with real students.</p></div></div>
        </aside>
      </div>
    </div>
  );
}
function ReviewBrief({ result, concepts, name, onMap, onJSON, created }) {
  const recommended = concepts.find((c) => c.id === result.recommended_review);
  const lookup = Object.fromEntries(concepts.map((c) => [c.id, c]));
  return (
    <div className="page-scroll brief-page">
      <div className="page-heading no-print">
        <div>
          <h1>Review brief</h1>
          <p>A practical starting point for a review session.</p>
        </div>
        <button className="button" onClick={onMap}>
          <ArrowLeftIcon />
          Back to map
        </button>
      </div>
      <article className="brief-paper">
        <header className="brief-header">
          <span className="wordmark">MathGap</span>
          <span>
            Review brief
            <br />
            <time dateTime={created}>
              {new Date(created).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </span>
        </header>
        <div className="brief-title">
          <span className="eyebrow">
            {name === "Custom inputs"
              ? "Custom problem profile"
              : "Synthetic example"}
          </span>
          <h2>
            {result.inputs.primary_concepts
              .map((c) => lookup[c]?.label || c)
              .join(" + ")}
          </h2>
          <p>
            Grade {result.inputs.grade_level} · Difficulty{" "}
            {result.inputs.difficulty} · Answer time{" "}
            {result.inputs.answer_time_sec} seconds
          </p>
        </div>
        <section className="brief-recommendation">
          <div>
            <span className="badge review-badge">Suggested review</span>
            <h3>{recommended?.label}</h3>
            <p>{recommended?.description}</p>
          </div>
          {recommended && <Figure concept={recommended} compact interactive={false} />}
        </section>
        <section>
          <h3>Start here</h3>
          <ul className="key-ideas">
            {recommended?.key_ideas.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <div className="review-exercise">
            <strong>Try together</strong>
            <p>{recommended?.review_prompt}</p>
            <details>
              <summary>Show worked answer</summary>
              <p>{recommended?.review_answer}</p>
            </details>
            <p className="print-answer">Answer: {recommended?.review_answer}</p>
          </div>
        </section>
        <section>
          <h3>How the skills connect</h3>
          <p className="muted">
            Each line names a concept and the direct skills it builds on.
          </p>
          <ul className="brief-prereqs">
            {result.required_concepts.map((id) => (
              <li key={id}>
                <strong>{lookup[id]?.label || id}</strong>
                <span>
                  {lookup[id]?.prerequisites.length
                    ? lookup[id].prerequisites
                        .map((p) => lookup[p]?.label || p)
                        .join(" · ")
                    : "Foundation concept"}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="brief-model-output">
          <h3>Model output</h3>
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Model score</th>
              </tr>
            </thead>
            <tbody>
              {result.ranked_concepts.map((c) => (
                <tr key={c.concept}>
                  <td>
                    {c.label}
                    {c.concept === result.recommended_review
                      ? " · Suggested review"
                      : ""}
                  </td>
                  <td>{score(c.probability)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="micro-note">
            These are alternative predictions for a single top gap. Scores are
            uncalibrated. The review recommendation comes from the prototype's
            simulated review policy.
          </p>
        </section>
        <section className="brief-inputs">
          <h3>Inputs used</h3>
          <InputSummary inputs={result.inputs} concepts={concepts} expanded />
        </section>
        <footer className="brief-footer">
          Research prototype trained on synthetic data. This brief suggests
          review topics; it does not establish mastery or an educational
          placement.
        </footer>
      </article>
      <div className="brief-bottom no-print">
        <button className="button" onClick={onJSON}>
          <DownloadSimpleIcon />
          Download JSON
        </button>
        <button className="button primary" onClick={() => window.print()}>
          <PrinterIcon />
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
export function App() {
  const [concepts, setConcepts] = useState([]),
    [result, setResult] = useState(null),
    [page, setPage] = useState("diagnosis");
  const [selected, setSelected] = useState("fractions"),
    [name, setName] = useState("Percentages"),
    [created, setCreated] = useState("");
  const [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [edit, setEdit] = useState(false),
    [method, setMethod] = useState(false),
    [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState({
    inputs: defaults,
    name: "Percentages",
  });
  const inspectorRef = useRef(null);
  const inflight = useRef(false);
  const headingRef = useRef(null);
  const initialized = useRef(false);
  async function run(
    inputs,
    scenarioName,
    { close = true, loadConcepts = false } = {},
  ) {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(true);
    setError("");
    setAttempt({ inputs, name: scenarioName });
    try {
      const [output, metadata] = await Promise.all([
        requestJSON("/api/v1/diagnose", {
          method: "POST",
          body: JSON.stringify(inputs),
        }),
        loadConcepts || !concepts.length
          ? requestJSON("/api/v1/concepts")
          : Promise.resolve(null),
      ]);
      if (metadata) setConcepts(metadata.concepts);
      setResult(output);
      setName(scenarioName);
      setSelected(
        output.recommended_review ||
          output.ranked_concepts[0]?.concept ||
          inputs.primary_concepts[0],
      );
      setCreated(new Date().toISOString());
      setPage("diagnosis");
      setTimeout(focusWorkspace, 0);
      if (close) setEdit(false);
      setNotice("Diagnosis complete. Concept map and review brief are ready.");
    } catch (e) {
      setError(e.message);
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      run(defaults, "Percentages", { loadConcepts: true });
    }
  }, []);
  function selectConcept(id) {
    setSelected(id);
    setNotice(
      `${concepts.find((c) => c.id === id)?.label || id} selected. Concept details updated.`,
    );
    if (window.matchMedia("(max-width: 950px)").matches)
      requestAnimationFrame(() => {
        inspectorRef.current
          ?.querySelector("h2")
          ?.focus({ preventScroll: true });
        inspectorRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        });
      });
  }
  function focusWorkspace() {
    headingRef.current?.focus({ preventScroll: true });
    if (headingRef.current) headingRef.current.scrollTop = 0;
    if (window.matchMedia("(max-width: 699px)").matches) window.scrollTo({ top: 0 });
  }
  function navigate(p) {
    setPage(p);
    setTimeout(focusWorkspace, 0);
  }
  function downloadJSON() {
    const blob = new Blob(
      [
        JSON.stringify(
          { schema_version: 1, created_at: created, scenario: name, ...result },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mathgap-diagnosis-${new Date(created).toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Diagnosis JSON downloaded.");
  }
  const activeConcept = concepts.find((c) => c.id === selected);
  const title =
    result?.inputs.primary_concepts
      .map((id) => concepts.find((c) => c.id === id)?.label || id)
      .join(" + ") || "Percentages";
  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to content
      </a>
      <div className="app-shell">
        <header className="app-header">
          <a className="brand" href="#" onClick={e => { e.preventDefault(); navigate("diagnosis"); }}><span className="brand-symbol" aria-hidden="true"><span /><span /></span>MathGap</a>
          <nav aria-label="Workspace">
            {nav.map(({ id, label, Icon }) => <button key={id} className={`nav-item ${page === id ? "selected" : ""}`} aria-current={page === id ? "page" : undefined} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span></button>)}
          </nav>
          <div className="header-actions">
            <button className="button" disabled={!concepts.length || busy} onClick={() => { setError(""); setEdit(true); }}><SlidersHorizontalIcon size={16} /><span>Edit inputs</span></button>
            <button className="button export-button" disabled={!result || busy} onClick={() => page === "brief" ? window.print() : navigate("brief")}>
              {page === "brief" ? <PrinterIcon size={16} /> : <DownloadSimpleIcon size={16} />}<span>{page === "brief" ? "Print brief" : "Export brief"}</span>
            </button>
          </div>
        </header>
        <main
          id="workspace"
          className={`workspace ${page === "map" ? "workspace-map" : ""}`}
          ref={headingRef}
          tabIndex={-1}
        >
          {error && (
            <div className="error-banner" role="alert">
              <div>
                <strong>Diagnosis unavailable</strong>
                <p>{error}</p>
                {result && (
                  <small>The previous result is still shown below.</small>
                )}
              </div>
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  run(attempt.inputs, attempt.name, {
                    loadConcepts: !concepts.length,
                  })
                }
              >
                <ArrowClockwiseIcon />
                Retry
              </button>
            </div>
          )}
          {!result ? (
            <div className="initial-state">
              <GraphIcon size={42} weight="light" />
              <h1>
                {busy
                  ? "Preparing your workspace"
                  : "Connect to the diagnosis service"}
              </h1>
              <p>
                {busy
                  ? "Running the percentages example through the model."
                  : "Your example is ready to run when the service is available."}
              </p>
              {busy && <CircleNotchIcon className="spin" size={22} />}
            </div>
          ) : (
            <>
              {busy && (
                <div className="pending-bar" role="status">
                  <CircleNotchIcon className="spin" />
                  Running diagnosis…
                </div>
              )}
              {page === "map" && (
                <div className="map-layout" key="map">
                  <section className="map-main">
                    <ConceptMap
                      concepts={concepts}
                      requiredConcepts={result.required_concepts}
                      primaryConcepts={result.inputs.primary_concepts}
                      selectedId={selected}
                      recommendedId={result.recommended_review}
                      onSelect={selectConcept}
                    />
                  </section>
                  <Inspector
                    key={activeConcept?.id}
                    concept={activeConcept}
                    concepts={concepts}
                    result={result}
                    onSelect={selectConcept}
                    containerRef={inspectorRef}
                  />
                </div>
              )}
              {page === "diagnosis" && (
                <Diagnosis
                  result={result}
                  concepts={concepts}
                  onEdit={() => {
                    setError("");
                    setEdit(true);
                  }}
                  name={name}
                  onBrief={() => navigate("brief")}
                  onMap={(id) => { if (id) setSelected(id); navigate("map"); }}
                  onScenario={(s) => run(s.inputs, s.name)}
                  busy={busy}
                />
              )}
              {page === "brief" && (
                <ReviewBrief
                  result={result}
                  concepts={concepts}
                  name={name}
                  created={created}
                  onMap={() => navigate("map")}
                  onJSON={downloadJSON}
                />
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span className="footer-mark"><IntersectIcon size={15} />Ideas build on ideas.</span>
          <span className="footer-divider" />
          <button onClick={() => setMethod(true)}>
            {modelNote}
            <InfoIcon size={13} />
          </button>
          <span className="footer-status">
            {busy ? "Running model…" : result ? "Local research workspace" : ""}
          </span>
        </footer>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {notice}
      </div>
      <EditInputs
        open={edit}
        onClose={() => setEdit(false)}
        initial={result?.inputs || defaults}
        concepts={concepts}
        busy={busy}
        requestError={error}
        onRun={run}
      />
      <Modal
        open={method}
        onClose={() => setMethod(false)}
        title="About this model"
      >
        <div className="modal-body methodology">
          <figure className="method-art"><img src="/art/loop-study.jpg" alt="An open red ring supported by precision metal pieces and a translucent plane." width="2752" height="1536" loading="lazy" /><figcaption>STUDY 02 / THE MISSING CONNECTION</figcaption></figure>
          <p>
            MathGap explores which mathematical concept might need review after
            an incorrect answer.
          </p>
          <ol>
            <li>
              A Random Forest predicts one top missing concept from a problem
              profile and learning history.
            </li>
            <li>
              The ranking shows alternative labels, with uncalibrated model
              scores.
            </li>
            <li>
              A simulated review policy selects a concept to review from those
              candidates.
            </li>
          </ol>
          <h3>What the map shows</h3>
          <p>
            Arrows point from a prerequisite to a concept that builds on it.
            They describe mathematical dependencies, not why the model produced
            its prediction.
          </p>
          <h3>Synthetic research model</h3>
          <p>
            The model was trained and evaluated on simulated data. Its scores
            and validation accuracy do not establish performance with real
            students.
          </p>
          {result && (
            <dl className="input-summary">
              <div>
                <dt>Model</dt>
                <dd>{result.model_metadata.model_type}</dd>
              </div>
              <div>
                <dt>Synthetic model rows (before split)</dt>
                <dd>{result.model_metadata.training_rows.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Synthetic validation accuracy</dt>
                <dd>{score(result.model_metadata.validation_accuracy)}</dd>
              </div>
              <div>
                <dt>Supported concepts</dt>
                <dd>{concepts.length}</dd>
              </div>
            </dl>
          )}
          <p className="micro-note">
            No account is required. Inputs are sent to the local diagnosis
            service and are not saved by this app. Download a brief to keep a
            copy.
          </p>
        </div>
        <div className="modal-actions">
          <button className="button primary" onClick={() => setMethod(false)}>
            Got it
          </button>
        </div>
      </Modal>
    </>
  );
}
