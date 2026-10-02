# Testing

Rift Architect includes an automated validation layer for the core engine and the knowledge layer.

## What it covers now

- Canonical composition fixtures.
- Edge cases for empty and partial drafts.
- Core analysis output.
- Identity, tempo, win condition, coherence, synergies and dependencies.
- Strategic reasoning coverage.
- Ban recommendations.
- Last-pick recommendations.
- Comparison engine coverage.
- Narrative engine coverage.
- Knowledge layer validation at boot.
- Human draft calibration fixtures for real-world references.

## Test entry points

- `tests/analysis.test.js`
- `tests/identity.test.js`
- `tests/champion-selection.test.js`
- `tests/dataset-normalization.test.js`
- `tests/strategic-engine.test.js`
- `tests/ban-engine.test.js`
- `tests/last-pick-engine.test.js`
- `tests/comparison-engine.test.js`
- `tests/contextual-story.test.js`
- `tests/real-draft-validation.test.js`
- `tests/knowledge-layer.test.js`
- `tests/story.test.js`

## Goal

The goal is not to replace the engine. The goal is to catch regressions before they reach the main UI.
