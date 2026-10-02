# Engine test bank

This folder contains canonical composition fixtures used to validate the Core Engine.

## Structure

- `compositions/` — reference drafts, edge cases, and their expected outcomes.
- `human-draft-guides.js` — human-aligned calibration notes for the canonical drafts.
- `engineValidation.js` — validation runner.
- `real-draft-validation.test.js` — Node test that compares the engine against the human guide bank.
- `index.html` — simple browser report.

## Coverage

The report now checks pattern coverage, dependency coverage, coach coverage, explainability coverage, and basic timing in addition to the core analysis checks.
The human draft guide bank records where the engine should prefer human wording, even when there are valid alternate phrasings.

## Goal

The purpose of these fixtures is to detect regressions when the engine changes, not to replace the main UI or the Draft Pool.