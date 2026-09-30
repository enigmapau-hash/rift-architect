# Need Engine

## Objective

Translate the current composition into a small set of clear needs that the Draft Assistant can use without depending on the enemy team.

## Design rules

- The Excel remains the source of truth.
- The engine does not add raw gameplay data.
- It should stay simple, readable, and deterministic.
- The UI must show only the result that helps the user decide faster.
- The IA explains the result; it does not replace the motor.
- The system must not turn into a full statistics platform.

## Pipeline

`Champion` → `analysis` → `Need Engine` → `Strategic Profiles` → `StrategicPlan` → `IA explanation`

The key idea is that the engine first detects what the composition needs, then translates those needs into compact profile families, and finally exposes that in a short explanation.

## Internal concepts

### Need categories
These are the high-signal needs the motor can detect and prioritize.

Examples:
- Frontline
- Engage
- Damage
- Scaling
- Objective Control
- Control
- Teamfight
- Poke
- Mobility
- Pick
- Splitpush

### Strategic profiles
These are the reusable profile families the assistant can match to those needs.

Proposed catalog:
- Iniciador fiable
- Ancla de daño
- Control de objetivos
- Core de teamfight
- Asedio / poke
- Pieza de tempo
- Cazador de ventanas
- Presión lateral

## Output contract

The engine should return a compact object like this:

```ts
NeedAnalysis {
  summary,
  compositionNeeds[],
  strategicProfiles[],
  priorities[],
  pickRecommendations[],
  banRecommendations[]
}
```

## How the engine should reason

1. Read the composition.
2. Derive the main needs from the selected champions and the `StrategicPlan`.
3. Prioritize the missing needs.
4. Map those needs to compatible profile families.
5. Convert profiles into simple pick and ban guidance.
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
- Main needs: Frontline, Engage, Peel
- Recommended profiles: Iniciador fiable, Presión lateral no, Ancla de daño sí
- Best explanation: the comp already has damage and initiation, so the main value is protecting Kai'Sa and making fights easy to start and hard to escape.

## Relation with the existing engine

This layer sits on top of the current analysis and coach logic.

It should reuse the current knowledge layer and the `StrategicPlan` output rather than duplicating it.

The IA should receive the compact result and turn it into plain language.
