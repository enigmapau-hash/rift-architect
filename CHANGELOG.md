# Changelog

## v100 · Patch 0.62.10 / RC1 Integrity Hardening 2
### Changed
- Fixed the stale import chain that could block boot when `composition-profile.js` was served from cache.
- Bumped the bootstrap, app, analysis, knowledge and service worker cache chain to v100.
- Kept the RC1 refresh and reload flow aligned with the current selected composition.

### Notes
- This patch is a cache-busting and boot-stability follow-up to the RC1 integrity pass.

## v99 · Patch 0.62.9 / RC1 Integrity Hardening 1
### Changed
- Preserved the selected composition across workbook refreshes using normalized champion matching and saved keys.
- Invalidated analysis and composition caches on forced workbook reloads.
- Bumped the page bootstrap, analysis chain, knowledge chain, and service worker cache to v99.
- Aligned the app, site bootstrap, and service worker to the same cache generation.

### Notes
- This patch closes the first RC1 integrity pass and keeps refreshes and reloads consistent.

## v98 · Patch 0.62.8 / Stability Audit 2
### Changed
- Aligned the boot chain, analysis chain, and knowledge chain to v98.
- Fixed the service worker precache so it no longer references removed or stale assets.
- Preserved the selected composition across refresh and dataset reloads.
- Kept the workbook parser tolerant to reordered or translated headers.

### Notes
- This patch closes the stability audit pass and removes the last stale cache chain from the app.

## v97 · Patch 0.62.7 / Refresh Preservation 1
### Changed
- Preserved the current draft when refreshing the workbook instead of clearing it first.
- Re-hydrated the selection from the pre-refresh snapshot after data reload.
- Bumped the page bootstrap and module cache to v97.

### Notes
- This patch keeps the 5-champion composition intact during workbook reloads.

## v96 · Patch 0.62.6 / Stability Hardening 1
### Changed
- Restored saved draft selections after reload and refresh.
- Made workbook parsing tolerant to reordered and translated headers.
- Added stability test coverage for reload restoration and header fallback parsing.
- Bumped the boot chain and knowledge imports to v96.

### Notes
- This patch is about reload stability, dataset resilience, and cache freshness.

## v95 · Patch 0.62.5 / Performance Cleanup 1
### Changed
- Removed the redundant `composition-ia.js` wrapper from the boot path.
- Added memoization for composition profiles and full analysis snapshots.
- Removed the duplicate direct rerender from story sync.
- Bumped the boot chain and knowledge imports to v95.

### Notes
- This patch is about loading and recomputation, not new user-visible features.

## v94 · Patch 0.62.4 / Knowledge V3 Cache Refresh 2
### Changed
- Closed the knowledge-layer loading chain so the app stops mixing old and new exports.
- Unified the Knowledge Layer v3 context path.
- Bumped the boot chain to v94.

### Notes
- This patch is about stability and continuity, not new features.

## v93 · Patch 0.62.3 / Knowledge V3 Cache Refresh
### Changed
- Re-pointed the boot chain to the Knowledge Layer v3 context module.
- Kept the strategic reasoning and story engine on the new knowledge flow.

## v92 · Patch 0.62.2 / Knowledge V3 Cache Refresh
### Changed
- Re-routed the analysis story and analysis engine to the Knowledge Layer v3 context.
- Refreshed the service worker cache and bootstrap versions.

## v91 · Patch 0.62.1 / Knowledge Layer V3 Fix
### Changed
- Moved the Knowledge Layer v3 context export into the canonical path.
- Repaired the first round of V3 import/export mismatches.

## v90 · Patch 0.62.0 / Knowledge Layer v3
### Added
- Knowledge Layer v3 with explicit identity, macro, vision, tempo, objective, victory and defeat rules.
- Story engine and analysis engine integration with the new knowledge context.

## v89 · Patch 0.61.5 / Strategic Reasoning Depth
### Added
- Deeper causal reasoning for dependencies, redundancy, conflicts, contingencies and adaptation.

## v88 · Patch 0.61.0 / Lean CSS Load
### Changed
- Removed old CSS inclusion from the boot path.
- Reduced the initial style payload.

## v87 · Patch 0.60.2 / Strategic Depth Refresh
### Changed
- Refreshed the strategic engine loading chain and cache names.

## v86 · Patch 0.60.1 / Strategic Engine Cleanup
### Changed
- Removed the syntax break in the strategic engine and restored startup.

## Earlier history

The initial beta history remains in the repository for reference. The current top priority is stability, documentation and small defect fixes instead of adding new surface area.
