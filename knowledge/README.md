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

That layer feeds the contextual narrative and makes the analysis less dependent on the raw Excel labels.

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
