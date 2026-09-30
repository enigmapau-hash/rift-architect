# Changelog

## Unreleased

### Added
- Composition Report v1 as the main visible analysis surface.
- Composition Score with grade and executive summary.
- Hero report layout for identity, win condition, tempo and coherence.
- Card-based rendering for strengths, risks, metrics, plan, coach, advisor and explainability.
- Composition report stylesheet for the executive layout.
- Shared display helpers to keep the report readable and avoid raw object dumps.
- Composition Optimizer for ranked internal swaps and improvement suggestions.
- Composition Visual stylesheet for the simplified visual layout.
- Composition View with AI summary, champion lineup, metrics, timeline and visual explainability.
- AI brief cards that explain the composition in simple language based on the Excel data.

### Changed
- The main screen now centers on the composition view and the optimizer instead of auxiliary meta panels.
- The identity block is now the primary visual focus.
- Service worker cache bumped to v56 for the new visual composition view assets.
- README and roadmap were aligned with the product scope: analyze one composition, not compare against a rival team.
- The app now presents a clearer visual summary of your own composition and a ranked list of internal swaps.
- The view now stays visual-first; document-style export actions were removed.
- The AI now plays a visible role by turning motor output into simple language and questions the user can ask.

### Notes
- The dashboard is intended to answer the key draft questions about your own composition in a few seconds.
- The optimizer is for internal swaps and composition improvement, not rival-vs-rival comparison.
