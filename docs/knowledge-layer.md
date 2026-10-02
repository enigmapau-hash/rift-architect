# Knowledge Layer

The knowledge layer stores strategic rules outside the core engine code.

## What lives here now

- Identity relations.
- Synergies.
- Patterns.
- Strategic dependencies.
- Conflicts.
- Win conditions.
- Knowledge Layer v3 playbooks.

## Why it exists

- The Draft Pool stays focused on champion data.
- Strategic rules can evolve without editing the engine logic.
- The app can explain decisions from a clear knowledge base.
- The test bank can validate pattern, dependency and profile coverage.

## Knowledge Layer v3

The current v3 layer adds explicit rules for:

- identities;
- matchups between styles;
- macro rules;
- objective priorities;
- vision patterns;
- tempo windows;
- common mistakes;
- victory and defeat conditions.

## Validation

The knowledge layer is validated at boot through `knowledge/validator.js`.

The validator checks for:

- duplicate keys;
- invalid categories;
- unknown identities in conflicts;
- malformed dependency rules;
- malformed pattern rules;
- malformed win-condition rules;
- missing fallback conditions.

## Current files

- `knowledge/identity-relations.js`
- `knowledge/synergies.js`
- `knowledge/patterns.js`
- `knowledge/dependencies.js`
- `knowledge/conflicts.js`
- `knowledge/win-conditions.js`
- `knowledge/knowledge-v3.js`
- `knowledge/knowledge-v3-context.js`
- `knowledge/validator.js`
- `knowledge/index.js`
