# Changelog

## v57 · Beta 0.38 / Recommendation Hub
### Added
- A recommendation hub inside the explainability surface.
- Structured recommendations with priority, confidence, evidence and metrics.
- A unified context for actions, reasons and supporting signals.

### Changed
- The Explainability Panel now groups recommendations by impact and confidence.
- The beta continues as a normal web app while the UI stabilizes.
- The top-right Update button stays hidden.

### Notes
- The analysis still comes from the same motor; only the action layer became more structured.

## v56 · Beta 0.37 / Recommendation Engine 2.0
### Added
- Structured recommendations with priority, confidence, reasons, evidence and metrics.
- A reusable recommendation engine shared by draft-related UI surfaces.
- A new cache version for the normal web-app beta flow.

### Changed
- The Draft Assistant now exposes recommendations as objects instead of loose advice.
- The beta continues as a normal web app while the UI stabilizes.
- The top-right Update button stays hidden.

### Notes
- The analysis still comes from the same motor; only the recommendation layer became more explicit.

## v55 · Beta 0.36 / Unified Analysis Model
### Added
- A unified analysis model that normalizes identity, tempo, victory, draft and explainability into one shared object.
- A single contract for Story, Coach, Draft Assistant and Explainability to read from.
- A new cache version for the normal web-app beta flow.

### Changed
- The motor output is now easier to reuse across surfaces without recalculating the same structures.
- The beta continues as a normal web app while the UI stabilizes.
- The top-right Update button stays hidden.

### Notes
- The analysis still comes from the same motor; only the data model became more unified.

## v54 · Beta 0.35 / Explainability Panel
### Added
- An explainability panel that surfaces evidence, weights and confidence for the engine.
- A contextual explorer with sections for identity, tempo, victory, draft and risks.
- A new visual layer to review the motor without leaving the main composition view.

### Changed
- The Story remains compact, but the reasoning is now easier to inspect in one place.
- The beta continues as a normal web app while the UI stabilizes.