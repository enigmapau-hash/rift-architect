# Data Contract

## Canonical champion shape

The app works from a normalized champion object with the following core fields:

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

## Draft shape

The selected draft is represented as a list of champion slots in role order:

- top
- jungle
- mid
- botline
- support

Each slot keeps the champion identity plus the normalized fields needed for analysis.

## Analysis shape

The visible analysis contract stays centered on:

- primary identity
- secondary identities
- strengths
- weaknesses
- tempo
- coherence
- win condition
- strategic plan
- needs
- picks
- bans
- confidence
- evidence

## Rule

Any new field should be added only if it is useful across the engine, the story layer and the UI.
