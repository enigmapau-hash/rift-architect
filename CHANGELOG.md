# Changelog

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
- This patch is the QA audit pass: stability, report coverage and dead-code cleanup.

## v107 · Patch 0.62.17 / Visual Polish 1
### Changed
- Added a new `analysis-polish.css` layer to unify card spacing, padding, typography rhythm and responsive behavior across the analysis view.
- Tightened the picker modal layout, avatar sizing, champion rows and list spacing for a more consistent selection experience.
- Bumped the visible build version to `v107` and rotated the application cache to `rift-architect-v185`.
- Aligned the entry page, site bootstrap, app bootstrap, analysis boot chain, and service worker asset list to the new generation.

### Notes
- This patch focuses on visual consistency and responsive polish, not new analysis functionality.

## v106 · Patch 0.62.16 / Analysis Cache Roll 1