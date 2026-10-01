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

- The main Story now uses six fixed summary cards instead of modals or accordions.
- Each card compresses the analysis into short lines, icons, chips and text bars.
- The layout is responsive across mobile, tablet and desktop without changing the hierarchy.
- The view stays short, compact, and easy to scan.
- The communication layer should not replace the motor; it only translate it.

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

## Next milestone

Keep the communication layer even simpler without reducing the value of the inference layer.
