# Analysis Engine

## Objective

Turn the selected composition into a short, weighted and readable analysis that can be understood in seconds.

## Current layer model

### Knowledge
- `Draft Pool.xlsx` remains the source of truth.
- Knowledge Layer v3 provides explicit rules for identity, matchups, macro, vision, tempo, objectives, victory and defeat.
- The engine should not invent data that does not exist in the workbook or the normalized knowledge files.

### Inference
- `analysisEngine` builds the base analysis.
- `strategicEngine` reasons about dependencies, redundancy, conflicts, contingencies and adaptation.
- `storyEngine` turns the result into a compact narrative.
- `banEngine` and `lastPickEngine` add the practical draft helpers.

### Communication
- The main story is shown first.
- Supporting evidence stays available as secondary detail.
- The visible surface must stay compact and readable.

## Output contract

The engine returns a single compact analysis object with the current emphasis on:

- primary identity;
- secondary identities;
- strengths;
- weaknesses;
- tempo;
- coherence;
- win condition;
- game plan;
- coach guidance;
- narrative;
- needs;
- picks;
- bans;
- evidence and confidence.

## Rule set

- Do not use external meta.
- Do not use win rates.
- Do not invent missing data.
- Keep the output short, weighted and consistent.
- Prefer reasoning over description.

## Current focus

The current engine work is about improving reasoning depth, not expanding the number of screens.
