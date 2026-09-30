# Narrative Engine

## Objective

Convert the current composition into a short story the user can read in seconds.

## Design rules

- The motor keeps deciding.
- The narrative layer only explains.
- No new gameplay data is added.
- The result must be shorter than the raw analysis.
- The UI should lead with the story, then reveal details only if needed.

## Story flow

`Winning plan` → `What it needs` → `What it lacks` → `Best fix` → `What to avoid`

## Output contract

```ts
Narrative {
  title,
  summary,
  winLine,
  needLine,
  solutionLine,
  warningLine,
  focus
}
```

## Example

- `title`: Tu composición quiere ganar por Front to Back.
- `summary`: Ahora mismo necesita frontline y peel para ejecutar bien su plan.
- `solutionLine`: La mejor forma de resolverlo es buscar un perfil de frontline resistente.
- `warningLine`: Ten cuidado con el splitpush y el poke que alarga el mapa.

## UI rule

Show only the story first. The detailed needs, profiles, picks and bans remain available below as supporting evidence.
