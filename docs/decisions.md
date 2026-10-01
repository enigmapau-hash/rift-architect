# Rift Architect Decisions

## D-001 — Own composition only
We analyze the player's own composition, not the enemy draft.

## D-002 — Excel as source of truth
`Draft Pool.xlsx` stays as the editable source. Everything else is derived from it.

## D-003 — Fixed cards over modals
The Story surface uses six fixed summary cards instead of accordions or modals.

Why:
- less interaction friction,
- shorter scroll,
- fewer state bugs,
- clearer hierarchy.

## D-004 — Compact communication layer
The UI should summarize the motor, not duplicate it.

Why:
- keep the screen readable at a glance,
- preserve the depth of the motor,
- show short lines, chips and text bars instead of long paragraphs.

## D-005 — Sync from saved draft
The Story rerenders from the saved draft in `localStorage` so the analysis follows the selected champions without manual refresh.

## D-006 — Responsive first
Every visible change must work across mobile, tablet and desktop with the same hierarchy and no horizontal scrolling.

Why:
- keep the product usable everywhere,
- avoid desktop-only layouts,
- preserve the same analysis contract on every device.

## D-007 — Compact signals over long paragraphs
When the motor returns dense text, the communication layer should compress it into shorter labels, bars and chips before it reaches the user.

Why:
- reduce repeated text,
- show the important signal first,
- keep each card scannable in a few seconds.

## D-008 — Visual signal cards
Signal cards should use chips and meters for the most important values, instead of another block of prose.

Why:
- faster scanning,
- better hierarchy,
- less vertical noise on every screen.

## D-009 — Desktop breathing room
On desktop, signal cards should relax their compacting a bit so text is not forced into narrow columns.

Why:
- improve readability on larger screens,
- keep the same analysis meaning,
- use the available width instead of fighting it.
