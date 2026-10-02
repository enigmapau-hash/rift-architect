# Draft Pool Audit

## Current view

`Draft Pool.xlsx` remains the only editable source of champion data.

## What the audit checks

- No duplicated champion identity logic in the UI.
- No obsolete spreadsheet columns driving the current app.
- No missing fields for role, identity, function, tempo, strengths or weaknesses.
- No hidden dependency on legacy JSON files.
- No data paths that bypass the normalization layer.

## Current recommendation

Keep the spreadsheet lean, canonical and easy to edit. Any extra semantic layer should live in the knowledge files or the engine, not in duplicated columns.
