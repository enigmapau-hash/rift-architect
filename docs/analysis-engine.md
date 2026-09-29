# Analysis Engine v3

## Objective

Turn the selected composition into a short, weighted and readable analysis that can be understood in seconds.

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
  gamePlan[],
  confidence,
  dominance,
  summaryText
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
- 1 confidence indicator.

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
4. Order the resulting strengths, weaknesses and plan by impact.
5. Return tokens the UI can render directly.
6. Leave the explanation layer for the future IA.

## Implementation structure

The current core engine is split into small modules:

- `js/engine/identityEngine.js`
- `js/engine/strengthEngine.js`
- `js/engine/weaknessEngine.js`
- `js/engine/tempoEngine.js`
- `js/engine/planEngine.js`
- `js/engine/analysisEngine.js`

## Main UI output

The screen should show only:

- Identity
- Secondary identities
- Makes well
- Lacks
- Tempo
- Plan
- Confidence

## Quality rule

If data is missing in the Excel, it must be fixed at source or during normalization. The UI must never mix categories or expand the text with unnecessary detail.
