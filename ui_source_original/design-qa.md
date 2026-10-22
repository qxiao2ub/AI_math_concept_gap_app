# MathGap v4 verification

Date: September 16, 2026. Application: `diagnosis-web`, running locally at `http://127.0.0.1:4174/` with the Python API on port 8001.

## Current design and evidence

The current design is **Mathematical instrument studio**. The user rejected the previous navy/cobalt/lilac interface and authorized a rebuild using creative plugins and the built-in image generator. The selected ImageGen concept informed horizontal navigation, self-hosted Geist and Geist Mono, chalk/graphite/vermilion, precise rules, and a more open composition. See `docs/rebuild-v4/DIRECTION.md`.

The diagnosis hero uses built-in ImageGen artwork; About uses a supporting Gamma sculpture. Exact production prompts, dimensions, source details, and file hashes are in `docs/rebuild-v4/ASSETS.md`. These images are conceptual artwork. Text, controls, mathematical figures, predictions, and graph relationships remain native UI backed by the existing authored content and real inference.

| Evidence in `docs/rebuild-v4/` | What it records |
| --- | --- |
| `diagnosis-desktop.png` | Current desktop diagnosis, artwork, and mathematical workspace |
| `diagnosis-phone.png` | Phone diagnosis layout |
| `map-desktop.png` | Desktop prerequisite map and inspector |
| `all-concepts.png` | Complete graph with 14 supported concepts and 21 existing edges |
| `map-phone-selection.png` | Phone selection and inspector position after the mobile layout fix |
| `quadratic-tablet.png` | Quadratic-equations scenario at tablet width |
| `brief-desktop.png` | Current review-brief surface |
| `review-brief.pdf` | Final two-page A4 review export, with both pages visually inspected |

Evidence under `docs/rebuild-v3/`, plus earlier screenshots and PDFs directly under `docs/`, is historical. The previous v3 QA report is retained at `docs/rebuild-v3/QA.md`; its observations and test runs do not establish v4 behavior.

## Browser checks and corrections

### Responsive layout

- Checked 1440 × 900, 795 × 900, 390 × 844, and 320 × 740 CSS viewports. No horizontal overflow was found in the checked layouts.
- A mobile list/inspector overlap was discovered during review. The map main area was changed to use automatic height on mobile, then the selection flow was checked again.
- Selecting a concept on mobile focuses its heading and settles the inspector below the sticky header.

### Real data and mathematical interaction

- Ran the percentages, quadratic-equations, and volume presets through the actual Python model.
- Confirmed that the suggested review can differ from the highest-ranked prediction and that the outside-prerequisite-map explanation remains visible when applicable. No graph relationships were invented to join an unrelated recommendation.
- Inspected the complete graph: 14 supported concept nodes and 21 existing prerequisite edges fit, with zero clipped nodes or routed edges in the complete-map check.
- Changed the quarter control to two selected quarters and observed `2/4 = 0.5 = 50%` update in the live figure.
- The generated sculpture artwork is separate from these controls and values; it does not substitute for mathematical content.

### Motion and console

- Emulated reduced motion and verified a transition duration of `0.00001s` (`1e-05s`). The media override was reset afterward.
- The final Chrome console check returned no warnings or errors.

### Printed review brief

- Generated the final review brief as a two-page A4 PDF in Chrome.
- Visually inspected both pages.
- Confirmed the worked answer and all 14 diagnosis inputs are preserved. The model-output section remains together on page 2.
- The exported evidence is `docs/rebuild-v4/review-brief.pdf`. This page count applies to the checked example and A4 settings; longer selections or different printer settings can paginate differently.
- Codex’s embedded browser does not provide native printing; the print check used Chrome.

## Automated verification

| Check | V4 result |
| --- | --- |
| Frontend suite | 30 passed: 9 workspace tests and 21 figure tests |
| Static-hosting suite | 4 passed |
| Production build | Passed |
| Backend/API tests | Not rerun in v4; backend code and saved model unchanged |

Workspace tests cover initial real request construction, failed-request retry, candidate navigation, preserved drafts, input validation, pending-request behavior, answer reset, and full-precision JSON export of the last successful result after a failed rerun. Figure tests cover authored mathematical values and control behavior.

Vite reported a nonblocking large-bundle advisory for the chart, graph, and math dependencies, at approximately 355 kB gzip for JavaScript. This is a build advisory, not a failed check. Static-hosting checks validate frontend packaging; a functional deployment still needs the Python/scikit-learn API.

## Scope and remaining limits

No blocking UI or data-contract issue remains in the checked flows. The complete prerequisite graph is dense; zoom and the text list remain available. This review does not constitute real-device Safari testing or a full screen-reader audit.

No cloud deployment was performed. The unchanged model was trained on synthetic data and has not been validated with real students. Visual polish and passing interface tests do not establish educational effectiveness or calibrated mastery measurement.
