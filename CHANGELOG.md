# Changelog

## v65 · Patch 0.45.1 / Analysis Render Bridge
### Added
- A render bridge that forces the main analysis story to repaint when the composition changes.
- A small safety layer so the core story stays in sync with the selected champions.

### Changed
- The main story render is now explicitly re-triggered after composition updates.
- The visible flow stays focused on the core composition story.
- The top-right Update button stays hidden.

### Notes
- The analysis still comes from the same motor; this patch only tightens the render path.

## v64 · Beta 0.45 / Main Screen Complete
### Added
- A completed main screen with Executive Summary, Identity, Strengths, Weaknesses, Plan, and Synergies/Risks.
- A single visible story flow that brings the core composition read back to the center.

### Changed
- Hito 2 is now closed.
- The visible flow stays focused on the own-composition analysis.
- The beta continues as a normal web app while the UI stabilizes.
- The top-right Update button stays hidden.

### Notes
- The analysis still comes from the same motor; the screen is now the intended main product surface.
