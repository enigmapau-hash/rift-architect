# Testing

Rift Architect now includes a small validation layer for the Core Engine and the Knowledge Layer.

## What it does

- Loads canonical composition fixtures from `tests/compositions/`.
- Includes edge-case fixtures for empty and single-champion drafts.
- Runs `analyzeComposition()` against each fixture.
- Compares the result with the expected identity, tempo, win condition, coherence, synergies and dependencies.
- Checks explainability coverage.
- Checks coach guidance coverage.
- Checks strategic advisor coverage.
- Checks knowledge-pattern coverage.
- Checks dependency coverage.
- Tracks basic validation timing.
- Reads the boot-time knowledge report exposed by `knowledge/validator.js`.

## Files

- `tests/index.html`
- `tests/engineValidation.js`
- `tests/compositions/*.json`

## How to use it

Open `tests/index.html` in the browser to see the current validation report.

The goal is not to replace the engine. The goal is to catch regressions before they reach the main UI.
