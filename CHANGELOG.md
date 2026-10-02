# Changelog

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

## v113 · Patch 0.62.23 / Report Layout 2
### Changed
- Reworked the executive report into a tighter dashboard-style layout with clearer card spacing and less dead space.
- Tightened report heights, spacing, and section rhythm so the analysis reads as a compact executive overview instead of a tall empty panel.
- Updated `analysis-visual-finesse.css` to keep the report cards aligned, balanced and responsive across desktop and mobile.
- Rotated the visible build to `v113` and the application cache to `rift-architect-v191`.

### Notes
- This patch focuses on the report presentation layer: compact dashboard layout, no blank voids, and cleaner reading flow.

## v112 · Patch 0.62.22 / Accessibility 1
### Changed
- Added the `analysis-a11y.css` layer to improve focus visibility, contrast, keyboard affordance and forced-color support across the report and picker.
- Introduced an accessibility-enhanced composition controller to restore focus, trap keyboard navigation inside the picker and improve ARIA labels.
- Loaded the accessibility build through `site-bootstrap.js?v=112` and `app-v2.js?v=112`.
- Rotated the application cache to `rift-architect-v190`.

### Notes
- This patch focuses on keyboard focus, contrast, keyboard navigation and missing ARIA hooks.
