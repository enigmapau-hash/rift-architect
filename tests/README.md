# Engine test bank

This folder contains canonical composition fixtures used to validate the Core Engine.

## Structure

- `compositions/` — reference drafts, edge cases, and their expected outcomes.
- `engineValidation.js` — validation runner.
- `index.html` — simple browser report.

## Coverage

The report now checks pattern coverage, dependency coverage, and basic timing in addition to the core analysis checks.

## Goal

The purpose of these fixtures is to detect regressions when the engine changes, not to replace the main UI or the Draft Pool.
