# Changelog

## v112 · Patch 0.62.22 / Accessibility 1
### Changed
- Added the `analysis-a11y.css` layer to improve focus visibility, contrast, keyboard affordance and forced-color support across the report and picker.
- Introduced an accessibility-enhanced composition controller to restore focus, trap keyboard navigation inside the picker and improve ARIA labels.
- Loaded the accessibility build through `site-bootstrap.js?v=112` and `app-v2.js?v=112`.
- Rotated the application cache to `rift-architect-v190`.

### Notes
- This patch focuses on keyboard focus, contrast, keyboard navigation and missing ARIA hooks.

## v111 · Patch 0.62.21 / Visual Finish 2
### Changed
- Added a final visual finesse layer for the analysis report and picker with tighter alignment, consistent chip icons, better heights, cleaner spacing and smoother microinteractions.
- Added `analysis-visual-finesse.css` and loaded it after the existing polish layers.
- Bumped the visible build version to `v111` and rotated the application cache to `rift-architect-v189`.
- Aligned the entry page and service worker with the new generation.

### Notes
- This patch focuses on the final visual polish pass: alignment, spacing, icon consistency, subtle motion and cleaner presentation.

## v110 · Patch 0.62.20 / QA Functional 1
### Changed
- Rotated the public build to `v110` and the application cache to `rift-architect-v188`.
- Aligned the boot chain, analysis chain and service worker to the new generation.
- Expanded the executive report QA with fixture-wide order and placeholder checks.
- Kept the report focused on identity, plan, strengths, weaknesses, bans and strategy.

### Notes
- This patch strengthens functional QA for the report view and keeps the documentation in sync with the new build.

## v109 · Patch 0.62.19 / Executive Report 1
### Changed
- Reworked the analysis report into a clearer executive layout with a strict reading order and less visual noise.
- Shortened repeated copy, tightened section hierarchy, and added stronger visual priorities for identity, plan, strengths, weaknesses, bans and strategy.
- Added `analysis-report-polish.css` to unify spacing, labels, section steps, chips and responsive behavior in the report.
- Bumped the visible build version to `v109` and rotated the application cache to `rift-architect-v187`.

### Notes
- This patch focuses on the executive report presentation: clearer hierarchy, less duplication and better scanability.

## v108 · Patch 0.62.18 / QA Audit 1
### Changed
- Aligned the analysis boot chain, the app bootstrap and the service worker to `v108`.
- Unified the cache-busted imports across the analysis, knowledge and data-loading layers.
- Removed stale visual/bootstrap leftovers from the tree.
- Added QA coverage for report rendering across the full fixture set.

### Notes