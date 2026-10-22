# MathGap v4 — Mathematical instrument studio

## Decision and scope

Minglang rejected both the initial Precision Workbench and the subsequent navy/cobalt/lilac interface. The latest request authorizes a full visual rebuild using installed creative plugins and the built-in image generator. The durable preference remains “a beautifully made tool—compact, crisp, tactile.”

Three ImageGen concepts were explored: Mathematical instrument studio, Precision field notebook, and Printed mathematical atlas. Codex selected **Mathematical instrument studio** under the user’s delegated creative direction. This is an implementation decision, not a claim that the user separately approved this image or every detail.

Workspace visual reference: `design-prep/rebuild-v4/concepts/01-instrument-studio.png`. Concept imagery is deliberately excluded from the distributable source package. Exact concept prompts are preserved in `diagnosis-web/docs/rebuild-v4/IMAGE-PROMPTS.md`; the production frontend and its artwork remain self-contained.

## Visual language

| Element | Direction |
| --- | --- |
| Surface | Flat cold chalk `#F7F8F6`, with clear section rules and open space |
| Main type | Graphite `#202422`; Geist Variable, served locally |
| Labels and readouts | Geist Mono Variable, served locally; tabular numerical alignment |
| Accent | Vermilion `#E94C35`; darker `#BC3524` for small accent text and focus treatments |
| Secondary color | Restrained neutral and sage tones for mathematical context |
| Navigation | Horizontal top navigation with a clear active underline; no sidebar |
| Controls | Compact, crisp buttons, visible focus, clear pressed state, restrained corners |
| Layout | Large diagnosis title, paired editorial sculpture, then interactive mathematics, ranked candidates, and actual problem inputs |
| Motion | Short interface feedback and reduced-motion support; artwork is static |

The identity should come from proportion, typography, meaningful mathematical interaction, and a small amount of original material-rich artwork. Avoid reintroducing the rejected purple/lilac dashboard palette, repeated rounded-card framing, decorative blur/glow, or generic marketing claims.

## Artwork and native mathematics

`public/art/connection-study.jpg`, generated with the built-in ImageGen tool, anchors the diagnosis screen. It combines a vermilion ribbon, frosted glass, and brushed aluminum. `public/art/loop-study.jpg`, generated with Gamma, supports the About panel. Full prompts and exact production-file provenance are preserved in `docs/rebuild-v4/ASSETS.md`.

These are conceptual sculptures, not diagrams or data. The concept figure, equations, values, graph, ranking, controls, and all text remain real interface components. Mathematical figures use the existing plotting/diagram libraries and correct authored relationships; never substitute a generated raster for a scientific chart or interactive control.

## Product behavior to preserve

- Open on Diagnosis and run actual Python inference for the selected profile.
- Keep the suggested first review distinct from the highest-ranked candidate; the review policy may select a different concept.
- Preserve all 14 input features, their accepted ranges, server validation, retry behavior, and failed-rerun drafts.
- Show seven unrenormalized candidate probabilities; preserve full precision in JSON export. Scores are not measured mastery or independent confirmed gaps.
- Derive graph connections and highlighting only from the existing prerequisite relationships. Keep out-of-graph recommendations visible without inventing edges.
- Preserve figure controls, authored quick checks, review material, keyboard navigation, mobile access, and reduced-motion support.
- Preserve the existing `web/` student app and the synthetic model artifact. Do not change or retrain the model as part of a visual rebuild.
- Keep the static-hosting adapter intact; a functional deployment still needs the Python API.

## Verification and handoff

Thirty frontend tests passed during the v4 rebuild: nine workspace tests and twenty-one figure tests. Four static-hosting tests and the production build passed. Browser checks covered 1440 × 900, 795 × 900, 390 × 844, and 320 × 740 without horizontal overflow; all 14 graph nodes and 21 edges fit without clipping. Actual-model presets, mobile selection, quarter controls, and reduced-motion behavior were checked. Both pages of the final Chrome-generated A4 review PDF were visually inspected. `diagnosis-web/design-qa.md` records the scope, evidence, corrections, and limits. The unchanged API/backend tests were not rerun for v4.

V2/v3 screenshots and PDFs are historical. Do not reuse their reported page count or test observations as claims about v4.

The source handoff includes the two production images and self-contained v4 documentation. It excludes v4 concept renderings, pre-rebuild backups, and duplicate generated-image originals. Create the ZIP only after final validation.
