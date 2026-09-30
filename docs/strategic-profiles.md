# Strategic Profiles

## Objective

Translate the current composition into a small set of strategic profiles that the Draft Assistant can use without depending on the enemy team.

## Design rules

- The Excel remains the source of truth.
- The document does not add raw gameplay data.
- The engine should stay simple, readable, and deterministic.
- The UI must show only the result that helps the user decide faster.
- The IA explains the result; it does not replace the motor.
- The system must not turn into a full statistics platform.

## Pipeline

`Champion` → `derived capabilities` → `Strategic Profiles` → `Needs` → `StrategicPlan` → `IA explanation`

The key idea is that the engine first detects what the composition can do, then translates that into what the composition needs, and finally exposes that in a compact explanation.

## Internal concepts

### Derived capabilities
These are not meant to be shown directly as a large technical block. They are internal signals used by the motor.

Examples:
- Engage
- Peel
- Frontline
- Burst
- DPS
- Poke
- Disengage
- Waveclear
- Objective Control
- Vision Control
- Siege
- Pick
- Dive
- Scaling
- Splitpush
- Anti-Dive
- Zone Control
- Reset Power
- Tempo

### Strategic profiles
These are the actionable roles the composition needs to cover.

Proposed catalog:
- Primary Engage
- Secondary Engage
- Frontline
- Peel
- Backline Protection
- Primary Carry
- Secondary Carry
- Pick Creator
- Objective Controller
- Vision Controller
- Zone Controller
- Siege Enabler
- Dive Enabler
- Anti-Dive
- Scaling Anchor
- Early Tempo
- Late Game Anchor
- Splitpush Threat

## Output contract

The engine should return a compact object like this:

```ts
StrategicAnalysis {
  identity,
  tempo,
  winCondition,
  detectedNeeds[],
  recommendedProfiles[],
  compatibleChampions[],
  confidence,
  explanation
}
```

## How the engine should reason

1. Read the composition.
2. Derive the main capabilities from the selected champions.
3. Convert those capabilities into a limited set of strategic profiles.
4. Detect the missing profiles and priorities.
5. Map those needs to compatible champions.
6. Return a short explanation that is easy to read in seconds.

## Priority rule

The engine should prefer the simplest valid answer.

If two profiles solve the same need, the motor should pick the one that better fits the current composition identity and the clearest explanation.

## UI rule

The UI should not show all the internal machinery.
It should show only:

- what the composition is,
- how it wins,
- what it lacks,
- what profile solves the gap,
- why that recommendation makes sense.

## Example

Composition: `Ornn / Vi / Orianna / Kai'Sa / Rakan`

Possible reading:
- Identity: Front to Back
- Main needs: Frontline, Primary Engage, Peel
- Recommended profiles: Frontline, Secondary Engage, Backline Protection
- Best explanation: the comp already has damage and initiation, so the main value is protecting Kai'Sa and making fights easy to start and hard to escape.

## Relation with the existing engine

This layer sits on top of the current analysis and coach logic.

It should reuse the current knowledge layer and the `StrategicPlan` output rather than duplicating it.

The IA should receive the compact result and turn it into plain language.
