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
- Responsive composition selector.
- Modal champion picker.
- Compact composition cards.
- Analysis shell prepared for the next sprint.

### Data
- `data/index.json` contains metadata and the list of generated files.
- `data/top.json`
- `data/jungle.json`
- `data/mid.json`
- `data/bot.json`
- `data/support.json`
- `data/attributes.json`

### Logic
- `scripts/excel-to-json.mjs` converts the workbook into JSON.
- `js/analyzer.js` computes the current composition metrics.
- `js/app-v2.js` renders the UI state.
- `js/v2_patch.js` keeps the v2 UI aligned with the current data model.

## Analysis design direction

The next sprint defines a compact engine with these outputs:

- Identity principal.
- Identidades secundarias.
- Fortalezas.
- Carencias.
- Plan de juego.

## Next milestones

- Finalize the analysis engine spec.
- Convert the current analysis shell into the new compact blocks.
- Add IA as a later layer that explains the composition instead of replacing the Excel data.
