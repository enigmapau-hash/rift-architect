# Changelog

## v68 · Patch 0.46.1 / Guarded Boot Startup
### Added
- A guarded bootloader that loads the app modules in sequence.
- A visible startup overlay when a module fails to load.
- Filters for external `contentscript.js` noise so browser extensions do not masquerade as app failures.

### Changed
- The page now boots through a single entrypoint instead of multiple isolated module tags.
- Startup failures are surfaced in the UI instead of leaving the app silent.

### Notes
- The underlying analysis logic is unchanged.
- This patch is about making real startup failures easier to see and debug on GitHub Pages.

## v67 · Patch 0.46.0 / Render Simplification
### Changed
- The analysis story now uses a single simplified visible path.
- The render path has been consolidated to reduce interference between experimental modules.
- The beta continues as a normal web app while the UI stabilizes.
- The top-right Update button stays hidden.

### Notes
- The analysis still comes from the same motor; the visible surface is simpler and more predictable.

## v66 · Patch 0.45.2 / Analysis Failsafe Renderer
### Added
- A failsafe analysis renderer that keeps the main story visible even if the render bridge misses a change event.

### Changed
- The main screen render is now backed by a direct failsafe path.
- The beta continues as a normal web app while the UI stabilizes.
- The top-right Update button stays hidden.

### Notes
- The visible analysis still comes from the same motor; the new path only makes the render more resilient.

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