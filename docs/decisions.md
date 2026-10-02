# Decisions

## Core product decisions

- The app analyzes the user’s own composition first.
- The visible story should feel like a coach, not like a raw label dump.
- The analysis layer should stay compact and weighted.
- The knowledge base should live outside the render logic.
- Strategic reasoning should happen in the engine, not in the UI.
- New screens should not be added unless they create clear value.

## Architecture decisions

- Keep one primary render path.
- Use Knowledge Layer v3 for explicit strategic rules.
- Use strategic reasoning for dependencies, redundancy, conflicts and contingencies.
- Reuse the same visible comparison surface for comparison and last-pick guidance.
- Keep the boot chain explicit and versioned when stability changes.

## Documentation decisions

- README, ROADMAP and the state documents must reflect the actual app state.
- When the app changes materially, the docs change with it.
- The repo should be understandable after a restart without reconstructing the whole history from chat.
