# Rift Architect Architecture

## Three-layer model

Rift Architect is organized around three simple layers:

### Knowledge Layer
The source material and strategic rules.

- `Draft Pool.xlsx` remains the only editable source of truth.
- Generated JSON in `data/` mirrors the Excel content.
- Strategic rules live in the knowledge files and normalize the raw data.
- No gameplay data is invented outside the Excel or its derived rules.

### Inference Layer
The reasoning core.

- `js/engine/analysisEngine.js` turns the selected composition into an analysis object.
- `js/engine/coachEngine.js` builds the `StrategicPlan`.
- `js/engine/needEngine.js` turns the plan into clear needs.
- `js/engine/strategicProfiles.js` maps those needs to profile families.
- `js/engine/explainabilityEngine.js` explains why each conclusion exists.
- `js/engine/narrativeEngine.js` converts the analysis into a short executive story.

### Communication Layer
The surface the user reads.

- The main Story uses six fixed summary cards instead of modals or accordions.
- `js/story-compact.js` trims labels, metadata and bars after render so the cards stay compact.
- `js/story-signals.js` adds compact signal blocks after render to make the most important metrics visible at a glance.
- `js/explainability-panel.js` turns the explanation output into a contextual evidence explorer.
- The compacting logic is viewport-aware, so desktop keeps a little more breathing room than mobile.
- Each card compresses the analysis into short lines, icons, chips, text bars and signal cards.
- The layout is responsive across mobile, tablet and desktop without changing the hierarchy.
- The view stays short, compact, and easy to scan.
- The communication layer summarizes the motor; it does not replace it.

## Build flow

1. Update the Excel.
2. Commit the Excel to `main`.
3. GitHub Actions runs `npm run generate:data`.
4. The generated JSON is included in the Pages artifact.
5. The PWA loads `data/index.json` first and then the role JSON files.

## Current analysis contract

The current analysis should remain compact and centered on:

- Identity.
- Secondary identities.
- Strengths.
- Weaknesses.
- Tempo.
- Coherence.
- Win condition.
- StrategicPlan.
- Needs.
- Narrative.
- Picks.
- Bans.
- Signal cards.
- Evidence and confidence.

## Next milestone

Keep the communication layer even simpler without reducing the value of the inference layer.
