# Rift Architect Architecture

## Source of truth

- `Draft Pool.xlsx` is the only editable source of truth for champion data.
- The app consumes generated JSON in `data/`.
- GitHub Pages is built from the repository on every push to `main`.

## Build flow

1. Update the Excel.
2. Commit the Excel to `main`.
3. GitHub Actions runs `npm run generate:data`.
4. The generated JSON is included in the Pages artifact.
5. The PWA loads `data/index.json` first and then the role JSON files.

## Current application layers

### UI
- Mobile-first responsive layout.
- Role tabs.
- Champion selector cards.
- Composition panel.
- Analysis panel.

### Data
- `data/index.json` contains metadata and the list of generated files.
- `data/top.json`
- `data/jungle.json`
- `data/mid.json`
- `data/bot.json`
- `data/support.json`

### Logic
- `scripts/excel-to-json.mjs` converts the workbook into JSON.
- `js/analyzer.js` computes the current composition scores.
- `js/app.js` handles state, rendering, and selection.

## Next milestones

- Add numeric attributes per champion.
- Add synergy and counter matrices.
- Add draft recommendations.
- Replace text-only analysis with a weighted scoring engine.
