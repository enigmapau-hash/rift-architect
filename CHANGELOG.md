# Changelog

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

## v111 · Patch 0.62.21 / Visual Finish 2
### Changed
- Added a final visual finesse layer for the analysis report and picker with tighter alignment, consistent chip icons, better heights, cleaner spacing and smoother microinteractions.
- Added `analysis-visual-finesse.css` and loaded it after the existing polish layers.
- Bumped the visible build version to `v111` and rotated the application cache to `rift-architect-v189`.
- Aligned the entry page and service worker with the new generation.

### Notes