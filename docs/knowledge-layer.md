# Knowledge Layer

The knowledge layer stores strategic rules outside the core engine code.

## What lives here

- Identity relations
- Synergies
- Patterns
- Strategic dependencies
- Conflicts
- Win conditions

## Why it exists

- The Draft Pool stays focused on champion data.
- Strategic rules can evolve without editing the engine logic.
- The IA can explain decisions from a clear knowledge base.
- The test bank can validate pattern and dependency coverage.

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
- `knowledge/validator.js`
- `knowledge/index.js`
