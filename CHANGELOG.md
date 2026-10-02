# Changelog

## v105 · Patch 0.62.15 / Analysis Boot Cache Fix 1
### Changed
- Bumped the app boot chain to `v105` so the browser stops reusing the stale `analysis-failsafe` and `renderer-report` modules.
- Pointed the entry page and the boot loader to the new cache-busted module chain.
- Updated the visible build version to keep Pages tracking clear.

### Notes
- This patch is a cache-busting fix for the analysis boot path.

## v104 · Patch 0.62.14 / Renderer Export Fix 1
### Changed
- Exported the report renderer functions so the analysis boot chain can load without a named-export syntax error.
- Bumped the site bootstrap, app bootstrap, analysis chain, and service worker cache to the new generation.
- Refreshed the visible build version to keep Pages tracking clear after the fix.

### Notes
- This patch fixes the boot error and forces a clean reload path.

## v103 · Patch 0.62.13 / Analysis Report Layout 1
### Changed
- Added the new analysis report layout and aligned the composition view with the cleaner report presentation.
- Introduced `analysis-report.css` as the report-specific polish layer.
- Bumped the visible build version to keep Pages tracking clear.

### Notes
- This patch is focused on the new analysis layout.

## v102 · Patch 0.62.12 / Build Reset + Picker Polish 1
### Changed
- Resets the saved draft when the Pages build version changes so each new deploy starts from a clean analysis.
- Keeps the selected composition and the analysis in sync with the current build metadata.
- Tightens the picker layout and avatar rendering for a more consistent visual result.
- Bumped the visible build version and the service worker cache to the new generation.

### Notes
- This patch is focused on fresh starts per deployment and cleaner selection UI.

## v101 · Patch 0.62.11 / Data Flow Clarification 1
### Changed
- Recalculated the documentation to make the real data flow explicit: `Draft Pool.xlsx` is the editable source and the analysis engine reads it directly.
- Clarified that there is no JSON intermediary layer for synchronizing the app data.
- Bumped the visible build version to keep Pages tracking clear.

### Notes
- This update is documentation-first and does not change the analysis flow.

## v100 · Patch 0.62.10 / RC1 Integrity Hardening 2