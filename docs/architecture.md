# Rift Architect Architecture

## Three-layer model

Rift Architect is organized around three simple layers:

### Knowledge Layer
- `Draft Pool.xlsx` remains the source of truth.
- Knowledge files define identities, styles, matchups, macro, tempo, objectives, victory and defeat rules.
- Knowledge Layer v3 adds explicit playbook-style rules so the engine can reason without hardcoding everything in the UI.

### Inference Layer
- `js/analysis/analysis-engine.js` builds the full report.
- `js/analysis/strategic-engine.js` reasons about dependencies, redundancy, conflicts, contingencies and adaptation.
- `js/analysis/story-engine.js` turns the result into a compact coach-like summary.
- `js/analysis/ban-engine.js` and `js/analysis/last-pick-engine.js` add the practical draft helpers.
- `js/analysis/analysis-failsafe.js` keeps the visible story in sync with the selected composition.

### Communication Layer
- The main UI shows a compact story first.
- The comparison panel is reused for either A/B comparison or last-pick guidance.
- The interface stays short, readable and responsive.
- The communication layer summarizes the motor; it does not replace it.

## Current analysis contract

The current output stays centered on:

- identity;
- secondary identities;
- strengths and weaknesses;
- tempo;
- coherence;
- win condition;
- strategic plan;
- needs;
- narrative;
- picks;
- bans;
- confidence and evidence.

## Working rule

The architecture should evolve by strengthening the reasoning and the knowledge base, not by adding more surface area.
