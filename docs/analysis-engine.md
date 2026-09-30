# Analysis Engine v3.5

## Objective

Turn the selected composition into a short, weighted and readable analysis that can be understood in seconds.

## Layer model

### Knowledge
- `Draft Pool.xlsx` remains the source of truth.
- The knowledge layer provides normalized strategic rules.
- The engine never invents data that does not exist in the workbook or its derived rules.

### Inference
- `analysisEngine` groups the selected composition.
- `coachEngine` builds the `StrategicPlan`.
- `needEngine` extracts the real needs of the composition.
- `strategicProfiles` maps those needs to reusable profile families.
- `explainabilityEngine` explains why each conclusion exists.
- `narrativeEngine` turns the result into a short executive story.

### Communication
- The Draft Assistant shows the story first.
- The detailed blocks stay available as supporting evidence.
- The UI must stay compact and easy to read.

## Input

The engine works with the canonical `Champion` object defined in `docs/data-contract.md`:

- `id`
- `displayName`
- `role`
- `icon`
- `identity`
- `function`
- `tempo`
- `strengths[]`
- `weaknesses[]`
- `attributes` when available

## Output contract

The engine returns a single compact `Analysis` object:

```ts
Analysis {
  primaryIdentity,
  secondaryIdentities[],
  strengths[],
  weaknesses[],
  tempo,
  tempoDetail?,
  synergies[],
  dependencies,
  coherence,
  winCondition,
  gamePlan[],
  coach,
  confidence,
  dominance,
  summaryText,
  explanation,
  draftAssistant,
  narrative
}
```

## Information budget

The analysis shown in the main UI must stay within this budget:

- 1 primary identity.
- Up to 2 secondary identities.
- Up to 4 strengths.
- Up to 3 weaknesses.
- 1 tempo statement.
- Up to 3 short plan actions.
- Up to 3 synergies.
- Up to 4 dependencies.
- 1 coherence statement.
- 1 win condition.
- 1 confidence indicator.
- 1 compact explainability block.
- 1 compact coach block.
- 1 narrative block.

## Rules

- Do not use external meta.
- Do not use win rates.
- Do not analyze the enemy team.
- Do not recommend champions in this layer.
- Do not invent missing data.
- Keep the output short, weighted and consistent.

## Engine behavior

1. Group the selected champions.
2. Weight the most relevant identities, strengths, weaknesses and tempo.
3. Resolve dominant or hybrid compositions.
4. Detect useful synergies between champions and the composition as a whole.
5. Evaluate whether the composition is coherent or internally conflicted.
6. Derive strategic dependencies and a single win condition.
7. Build a short plan of action.
8. Build a compact explainability block with the evidence behind the decision.
9. Build a compact coach block with priorities, power spikes and phase guidance.
10. Build a narrative block with the concise story of the composition.
11. Return tokens the UI can render directly.

## Main UI output

The screen should show only:

- Identity.
- Secondary identities.
- Synergies.
- Dependencies.
- Coherence.
- Win condition.
- Plan.
- Why this result exists.
- Coach guidance.
- Narrative.
- Needs.
- Picks.
- Bans.

## Quality rule

If data is missing in the Excel, it must be fixed at source or during normalization. The UI must never mix categories or expand the text with unnecessary detail.
