# Knowledge Layer

This folder contains the strategic rules used by the engine.

It is intentionally separate from the champion data exported from the Excel file.

## Files

- `identity-relations.js`
- `synergies.js`
- `patterns.js`
- `dependencies.js`
- `conflicts.js`
- `win-conditions.js`
- `strategy-profiles.js`
- `ban-profiles.js`
- `validator.js`
- `index.js`

## Knowledge Layer v2

`strategy-profiles.js` adds explicit playbooks for identities and patterns:

- what a plan tends to beat;
- what usually beats it;
- what it needs;
- what it should avoid;
- its timings;
- its macro focus;
- its objectives;
- its common mistakes.

`ban-profiles.js` adds intelligent ban packages:

- the 5 champions that most disrupt each plan;
- the reason each ban hurts the composition;
- the pressure type each ban addresses.

That layer feeds the contextual narrative, the strategic engine and the ban recommendations without duplicating the logic in the UI.

## Validation

The knowledge layer is validated at boot.

The validator checks for:

- duplicate keys;
- invalid categories;
- unknown identities in conflicts;
- malformed dependency rules;
- malformed win-condition rules;
- missing fallback conditions;
- malformed pattern rules;
- malformed strategic profiles.
