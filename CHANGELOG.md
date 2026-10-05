# Changelog

## v131 · Patch 0.64.1 / Analysis Calibration 2
### Changed
- Re-aligned the analysis contract so the report continues to prioritize a single core theme across Executive Summary, Identity, Plan and strategic reading.
- Kept the contract-level `clamp()` helper local to `report-contract.js` so the dashboard can build the analysis without a runtime `ReferenceError`.
- Rotated the visible build to `v131` and the application cache to `rift-architect-v208`.

### Notes
- This patch keeps the current calibration on the analysis narrative while preserving the stable render path.

## v121 · Patch 0.62.31 / RC2 Stabilization 1
### Changed
- Locked the analysis render loop so the dashboard only reacts to real composition slot mutations.
- Added snapshot-key reuse and last-render guards to avoid rebuilding the analysis story for identical drafts.
- Rotated the visible build to `v121` and the application cache to `rift-architect-v199`.

### Notes
- This patch closes the flicker / repeated render issue in the RC2 dashboard.

## v120 · Patch 0.62.30 / RC2 Guard 1
### Changed
- Filtered the composition observer so it only reacts to real draft-slot mutations instead of dashboard reflows.
- Added render snapshot reuse so identical compositions do not rebuild the analysis story.
- Rotated the visible build to `v120` and the application cache to `rift-architect-v198`.

### Notes
- This patch targets the render loop / flicker issue in the RC2 dashboard.

## v118 · Patch 0.62.28 / RC2 Contract Fix 2
### Changed
- Removed the duplicate `cleanText` declaration from the analysis contract so the renderer can boot without a syntax error.
- Bumped the entrypoint chain to `v118` so the fixed report contract and renderer reload cleanly.
- Rotated the visible build to `v118` and the application cache to `rift-architect-v196`.

### Notes
- This patch closes the parser error introduced while tightening the RC2 contract layer.

## v117 · Patch 0.62.27 / RC2 Contract Fix 1
### Changed
- Fixed the analysis contract so `scoreBadge` is defined before the renderer consumes it.
- Bumped the entrypoint chain to `v117` so the updated report contract and renderer reload cleanly.
- Rotated the visible build to `v117` and the application cache to `rift-architect-v195`.

### Notes
- This patch closes the contract bug that was throwing a `ReferenceError` when selecting champions.

## v116 · Patch 0.62.26 / RC2 Data Contract 1
### Changed
- Added a structured analysis contract so the renderer consumes a single normalized layer instead of reading engine outputs directly.
- Added `report-contract.js` and routed the report wrapper through the RC2 dashboard renderer.
- Documented the contract in `docs/ANALYSIS_CONTRACT.md`.
- Rotated the visible build to `v116` and the application cache to `rift-architect-v194`.

### Notes
- This patch closes the data-contract step of RC2 and keeps the renderer focused on the dashboard layer only.

## v115 · Patch 0.62.25 / RC2 Structured Analysis 1
### Changed
- Rebuilt the executive analysis as a structured dashboard where each motor is represented in its own card.
- Added `renderer-dashboard.js` and routed the report wrapper through it.
- Reworked the dashboard so the engine outputs are easier to scan: Executive Summary, Identidad, Plan, Knowledge Layer, Fortalezas, Debilidades, Bans, Dependencias, Señales, Riesgos and Último pick.
- Rotated the visible build to `v115` and the application cache to `rift-architect-v193`.

### Notes
- This patch starts the RC2 report UI rewrite: inventory of outputs, card mapping per module and a cleaner dashboard presentation.

## v114 · Patch 0.62.24 / RC2 Report UI Rewrite 1
### Changed
- Rebuilt the executive report renderer as a compact dashboard-style layout.
- Replaced the long stacked report with balanced cards for identity, plan, strengths, weaknesses, bans and strategic reading.
- Added `analysis-dashboard.css` to control the new grid, cards, chips, metrics and responsive behavior.
- Rotated the visible build to `v114` and the application cache to `rift-architect-v192`.

### Notes
- This patch removes the tall empty panel feeling and moves the report presentation to a cleaner dashboard layout.
