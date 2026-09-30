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
- `validator.js`
- `index.js`

## Validation

The knowledge layer is validated at boot.

The validator checks for:

- duplicate keys;
- invalid categories;
- unknown identities in conflicts;
- malformed dependency rules;
- malformed win-condition rules;
- missing fallback conditions;
- malformed pattern rules.
