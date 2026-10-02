# Changelog

## v107 · Patch 0.62.17 / Visual Polish 1
### Changed
- Added a new `analysis-polish.css` layer to unify card spacing, padding, typography rhythm and responsive behavior across the analysis view.
- Tightened the picker modal layout, avatar sizing, champion rows and list spacing for a more consistent selection experience.
- Bumped the visible build version to `v107` and rotated the application cache to `rift-architect-v185`.
- Aligned the entry page, site bootstrap, app bootstrap, analysis boot chain, and service worker asset list to the new generation.

### Notes
- This patch focuses on visual consistency and responsive polish, not new analysis functionality.

## v106 · Patch 0.62.16 / Analysis Cache Roll 1
### Changed
- Bumped the visible build version to `v106` and rotated the application cache to `rift-architect-v184`.
- Aligned the entry page, site bootstrap, app bootstrap, analysis boot chain, and service worker asset list to the new generation.
- Kept the analysis report layout in place while forcing a clean reload path for the browser cache.

### Notes
- This patch is a cache-roll update to remove stale module copies from the presentation layer.

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
