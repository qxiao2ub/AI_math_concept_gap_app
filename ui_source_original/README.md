# MathGap — Diagnosis Workspace

A compact workspace for exploring an existing math concept-gap research model. Enter the profile of an incorrect answer, run the real Python model, compare ranked candidates, inspect prerequisite relationships, and print a review brief.

This is a separate frontend from the older student practice app. The inference engine and saved synthetic model come from the existing capstone project.

The current **Mathematical instrument studio** design supersedes both Precision Workbench and the subsequent navy/cobalt/lilac rebuild, which Minglang rejected. The v4 direction was selected from built-in ImageGen concepts under Minglang’s delegated creative direction. It uses horizontal navigation, a cold-chalk surface, graphite typography, a vermilion accent, precise rules, and compact controls. Geist Variable and Geist Mono Variable are self-hosted through Fontsource. Original ImageGen sculpture artwork anchors the diagnosis screen; Gamma artwork appears in the About panel. These images establish the visual identity; the mathematical figures remain native, interactive components driven by authored mathematical relationships. See `docs/rebuild-v4/DIRECTION.md` and `docs/rebuild-v4/ASSETS.md` for the design and asset provenance.

## Start locally

Requirements: Python 3.11, Node.js 22.12 or newer, and npm. The installed Python dependencies must include **scikit-learn 1.8.0**, matching the saved artifact. Run the following commands from the original `Capstone` directory or the extracted `MathGap-Diagnosis-Workspace` directory.

One-time setup on macOS or Linux:

```bash
python3.11 -m venv .venv311
.venv311/bin/python -m pip install -r requirements.txt
npm --prefix diagnosis-web ci
```

Start both servers:

```bash
python3 scripts/run_diagnosis_workspace.py
```

Open [MathGap at 127.0.0.1:4174](http://127.0.0.1:4174). The [API documentation](http://127.0.0.1:8001/docs) is available while the launcher runs. Press **Ctrl+C** in the launcher terminal to stop the processes it created.

The launcher first checks the active Python interpreter, then `.venv311/bin/python`. It requires compatible dependencies and a loadable artifact. Both servers bind to `127.0.0.1`; the frontend forwards `/api` requests to port `8001`. It refuses occupied ports instead of terminating an existing process or quietly choosing a different port. Dependency checks can be run with `python3 scripts/run_diagnosis_workspace.py --check`; both ports must be free for that check to pass.

If a service is unavailable, the UI keeps the prior completed result and displays a retryable error. It never substitutes canned predictions.

### Start each server separately

From the project root, in one terminal:

```bash
.venv311/bin/python -m uvicorn api:app --host 127.0.0.1 --port 8001
```

In another terminal, from the same root:

```bash
npm --prefix diagnosis-web run dev -- --host 127.0.0.1 --port 4174 --strictPort
```

## What to try

1. The workspace opens on **Diagnosis** with a labeled synthetic percentages example, run through the actual model. Successful reruns return here.
2. Compare the suggested review with all seven candidate scores. Try the figure's controls when available: for example, change a fraction and see its decimal and percentage equivalents update.
3. Open **Edit inputs** to select another scenario or change any input from the Streamlit form.
4. Select a ranked candidate or **Explore connections** to inspect it on the **Concept map**. Highlighting follows existing prerequisite relationships into the selected concept and onward to the problem concepts. It does not add inferred edges. The **List** view gives every direct prerequisite in text and is the default on small screens.
5. In the selected concept's inspector, open **Try a quick check**, then **Reveal answer** for the authored explanation.
6. Select **Try a worked example** or **Review brief** for the actual inputs, predictions, prerequisites, and review material. Use **Print / Save as PDF** or **Download JSON** to keep a copy.

For **Print / Save as PDF**, open the workspace in a regular browser such as Chrome. Codex's embedded browser does not support printing. The v4 percentages brief was generated as a two-page A4 PDF in Chrome, and both pages were visually inspected. The worked answer and all inputs are preserved, with the model-output section kept together on page 2. See `docs/rebuild-v4/review-brief.pdf` and `design-qa.md` for evidence and verification scope.

The three example scenarios use ordinary request values; they do not bypass inference. A review recommendation can be outside the current problem's prerequisite subgraph. For example, the bundled model can suggest decimals for the volume scenario. Such a candidate stays visible in the ranking and inspector without an invented graph connection.

## What the model means

- **Model:** `RandomForestClassifier`, trained on synthetic incorrect-answer attempts to predict one top missing concept.
- **Bundled dataset summary:** 18,000 simulated attempts; 12,746 incorrect attempts supplied to the training/validation procedure. A 20% split is held out for validation. The displayed `training_rows` count is the full incorrect-attempt pool before that split, not the size of the final fitting subset.
- **Synthetic validation accuracy:** approximately 70.8%. This measures the synthetic held-out split; it does not establish accuracy for real students.
- **Model scores:** full-precision classifier probabilities are returned by the API and preserved in JSON. The UI displays rounded percentages. These uncalibrated scores describe alternative top-gap labels, not independent confirmed gaps or measured mastery. The seven displayed scores are not renormalized.
- **Suggested review:** the existing simulated review policy chooses among the ranked candidates. It may choose a different concept from rank one.
- **Concept map:** direct mathematical prerequisites from the engine's `PREREQS` dictionary. Path highlighting uses those same relationships. It is not an explanation of the model's feature attribution.
- **Review content and figures:** short authored examples and mathematical figures covering all 14 supported concepts. Supported full-size figures provide controls for fractions, ratios, probability, arithmetic, linear equations, exponents, geometry, and data interpretation. Compact inspector and print figures use fixed authored examples. These illustrations are not student measurements, dynamically generated lessons, or adaptive instruction; manipulating them does not change the diagnosis inputs or rerun inference.

`systems_of_equations` exists in the research prerequisite dictionary but is absent from the model's 14 supported concepts. It cannot be selected or returned as a supported prediction label.

Inputs and results stay in browser memory until the page closes or reloads, unless the user exports them. Inputs are sent to the local API for inference; this app does not store them in a database. Additional inputs such as study time, attendance, confidence trait, and the carelessness proxy are research assumptions. They are not app-generated judgments about a student.

The workspace has no accounts, payments, handwriting recognition, adaptive question generation, persisted mastery records, or LLM dependency.

## API contract

### `GET /api/v1/concepts`

Returns `concepts` and `model_note`. Each concept contains `id`, `label`, `description`, `prerequisites`, `key_ideas`, `review_prompt`, `review_answer`, and `example_latex`.

### `POST /api/v1/diagnose`

Accepts the complete feature input set below. `primary_concepts` is required. Other omitted fields use the original Streamlit defaults. Unknown fields, duplicate or unsupported concepts, nonfinite numbers, and out-of-range values return HTTP 422.

| Field | Accepted values | Default |
| --- | --- | --- |
| `grade_level` | Integer 5–11 | 8 |
| `grade_band` | `elementary`, `middle`, `high` | `middle` |
| `primary_concepts` | 1–14 unique supported concept IDs | Required |
| `difficulty` | 0.5–4.5 | 2.4 |
| `study_hours_per_week` | 0.5–12 | 4.5 |
| `attendance_rate` | 0.5–1 | 0.9 |
| `confidence_trait` | 0.05–0.99 | 0.55 |
| `carelessness` | 0–0.4 | 0.12 |
| `hist_required_acc_mean` | −1–1 | 0.3 |
| `hist_primary_acc_mean` | −1–1 | 0.35 |
| `hist_total_attempts_on_required` | Integer 0–200 | 5 |
| `hist_total_attempts_on_primary` | Integer 0–200 | 3 |
| `answer_time_sec` | 10–240 | 85 |
| `pre_answer_confidence` | 0.01–0.99 | 0.45 |

Accuracy values from 0 to 1 are proportions; `-1` is the training data's unknown-history marker. Other negative values are preserved for compatibility with the research form and labeled as placeholders.

The response contains:

```text
inputs                         Normalized complete request
required_concepts              Selected concepts plus all prerequisites
ranked_concepts                Seven {concept, label, probability} entries
recommended_review             Review concept ID, or null
recommended_review_label       Review label, or null
model_note                     Interpretation and synthetic-data context
model_metadata                 model_type, training_rows,
                               validation_accuracy, incorrect_rate
```

Missing, corrupt, or incompatible model artifacts return HTTP 503 with a safe error message. Field validation errors return `detail: [{type, loc, msg}]`. The existing `/api/diagnose` student adapter remains available with its prior request/response contract. `/api/health` reports that the API process is reachable; it is not an inference or model-quality test.

## Verify and build

From the project root:

```bash
.venv311/bin/python -m unittest discover -s tests -p 'test_research_api.py' -v
.venv311/bin/python tests/test_api.py
.venv311/bin/python tests/smoke_test.py
npm --prefix diagnosis-web test
npm --prefix diagnosis-web run build
npm --prefix diagnosis-web run test:sites
```

The research API tests cover parity with direct engine calls, all three representative input scenarios, full-precision scores, candidates outside the prerequisite map, all 14 concepts, request boundaries, invalid requests, artifact failures, and the legacy endpoint contract.

The frontend suite contains **30 passing tests: 9 workspace tests and 21 figure tests**, verified during the v4 rebuild. Workspace checks cover diagnosis-first navigation, complete input requests, retry and pending-request behavior, preserved drafts, candidate selection, review navigation, and full-precision export of the last successful result after a failed rerun. Figure checks cover mathematical values and interactive controls. `test:sites` checks static hosting packaging; it does not validate a deployed Python service.

V4 screenshots, the inspected two-page A4 PDF, and design records are stored under `diagnosis-web/docs/rebuild-v4/`. Browser checks covered 1440 × 900, 795 × 900, 390 × 844, and 320 × 740 viewports without horizontal overflow; actual-model presets, the complete prerequisite map, mobile selection, figure controls, and reduced-motion behavior were checked. The final Chrome console contained no warnings or errors. Read `diagnosis-web/design-qa.md` for the full scope and limits. V3 evidence and files directly under `docs/` remain historical. The API and model were unchanged in v4; no new backend test run is claimed for this visual rebuild.

To inspect the production frontend build locally, keep the Python API running on port `8001` and run:

```bash
npm --prefix diagnosis-web run preview -- --host 127.0.0.1 --port 4174 --strictPort
```

### Deployment boundary

`npm run build` creates `diagnosis-web/dist/client/` plus a small static-hosting worker. The bundled worker and Sites configuration serve frontend assets only. **They cannot execute the Python/scikit-learn backend.** A functional deployment must also run the Python API and route the frontend's same-origin `/api/*` requests to it through a reverse proxy. The development and local preview configurations already provide that proxy.

Publishing only the static worker will result in an unavailable diagnosis service. There is no cloud API URL or deployment credential embedded in this source package.

## Source handoff

```text
MathGap-Diagnosis-Workspace/
├── README.md                         This workspace guide
├── LICENSE                           Existing project license
├── MANIFEST.json                     ZIP file hashes and contents
├── api.py                            Legacy and full research endpoints
├── requirements.txt                  Python dependencies
├── artifacts/model_bundle.joblib     Existing trained synthetic model
├── src/
│   ├── diagnosis_engine.py           Existing simulation and inference logic
│   └── concept_content.py            Authored concept and review content
├── tests/                            Model and API checks
├── scripts/
│   ├── run_diagnosis_workspace.py     Local two-server launcher
│   ├── package_diagnosis_workspace.py Source-only handoff packager
│   └── build_artifacts.py            Optional synthetic-data/model rebuild
└── diagnosis-web/
    ├── src/                          React components, data, and styles
    ├── docs/                         QA evidence, design direction, asset provenance
    ├── public/art/                   Production ImageGen and Gamma artwork
    ├── AI-ASSISTANCE.md               Contribution and assistance record
    ├── package.json
    ├── package-lock.json
    ├── vite.config.mjs
    ├── worker/                       Static-hosting adapter
    └── tests/                        Interface, figure, and static packaging tests
```

After final QA, create the handoff ZIP with:

```bash
python3 scripts/package_diagnosis_workspace.py --list
python3 scripts/package_diagnosis_workspace.py
```

The output is `releases/MathGap-Diagnosis-Workspace.zip`, with one `MathGap-Diagnosis-Workspace/` root directory. The script uses an explicit allowlist and excludes virtual environments, `node_modules`, generated builds, cached research videos, old student UI files, patent material, private notes, datasets unnecessary for inference, v4 concept renderings, pre-rebuild backups, and duplicate generated-image originals. The two production artworks in `diagnosis-web/public/art/` and the self-contained documentation in `docs/rebuild-v4/` are included. Historical design references and QA evidence, if included, retain their historical status; the current interface is implemented in `diagnosis-web/src/`. The archive contains a file-hash manifest; the script prints the ZIP checksum.

`scripts/build_artifacts.py` is provided for reproducibility, but running it replaces the saved model and creates synthetic CSV datasets. Normal startup uses the included artifact and does not retrain anything.

## Libraries and credits

Frontend: [React](https://react.dev/), [Vite](https://vite.dev/), [React Flow](https://reactflow.dev/), [Dagre](https://github.com/dagrejs/dagre), [KaTeX](https://katex.org/), [Recharts](https://recharts.org/), and [Phosphor icons](https://phosphoricons.com/). Exact installed versions are pinned in `package-lock.json`.

Typography: Geist Variable and Geist Mono Variable, bundled through [Fontsource](https://fontsource.org/) using `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`. The build serves these font files locally.

Artwork: the built-in ImageGen tool created `connection-study.jpg`; the [Gamma](https://gamma.app/) connector created `loop-study.jpg`. Both are original generated editorial artwork. Exact prompts, source details, dimensions, and SHA-256 hashes are recorded in `docs/rebuild-v4/ASSETS.md`. They are not plots, model explanations, or student measurements.

Backend: [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/), and the existing [scikit-learn](https://scikit-learn.org/) model with NumPy, pandas, and joblib.

The existing MIT copyright notice for Minglang and Qingyang Xiao is preserved. See `diagnosis-web/AI-ASSISTANCE.md` for the implementation's assistance and provenance record.
