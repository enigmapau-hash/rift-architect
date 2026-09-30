# Changelog

## Unreleased

### Added
- Composition View as the main visible analysis surface.
- Composition Score with grade and executive summary.
- Hero layout for identity, win condition, tempo and coherence.
- Card-based rendering for strengths, risks, metrics, plan, coach, advisor and explainability.
- Shared display helpers to keep the view readable and avoid raw object dumps.
- Composition Optimizer for ranked internal swaps and improvement suggestions.
- Composition Visual stylesheet for the simplified visual layout.
- Visual AI stylesheet for the question-and-answer area.
- Visual composition view with AI summary, champion lineup, metrics, timeline and explainability tree.
- AI brief cards that explain the composition in simple language based on the Excel data.
- Clickable Rift questions with direct answers based on the motor and the Excel.

### Changed
- The main screen now centers on the visual composition view and the optimizer instead of auxiliary meta panels.
- The identity block is now the primary visual focus.
- Service worker cache bumped to v57 for the new visual AI view assets.
- README and roadmap were aligned with the product scope: analyze one composition, not compare against a rival team.
- The app now presents a clearer visual summary of your own composition and a ranked list of internal swaps.
- The view now stays visual-first; document-style export actions were removed.
- The AI now plays a visible role by turning motor output into simple language and clickable questions the user can ask.

### Notes
- The dashboard is intended to answer the key draft questions about your own composition in a few seconds.
- The optimizer is for internal swaps and composition improvement, not rival-vs-rival comparison.