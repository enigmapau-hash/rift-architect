# Changelog

## Unreleased

### Added
- Product vision for Rift Architect.
- Analysis Engine v2 contract.
- Core Engine v0.5 planning.
- Modular core engine files for identity, strength, weakness, tempo and plan analysis.
- Tempo-aware analysis panel for the main screen.
- Empty `data/index.json` manifest to avoid 404s on GitHub Pages.
- SVG favicon link to avoid browser favicon 404s.
- Weighted identity resolution for the Core Engine v3 pass.
- Prioritized strengths and weaknesses with impact-based ordering.
- Derived tempo summaries with confidence.
- Structured game-plan generation with compact priorities.
- Synergy, coherence and win-condition engines for the Core Engine v3.1 pass.
- Knowledge layer files for identities, synergies, conflicts and win conditions.
- Knowledge-layer validation with boot-time auditing and traceable reports.

### Changed
- Documentation aligned with the compact analysis budget.
- Roadmap updated to reflect the Core Engine hito.
- Service worker cache updated for the modular engine files.
- Modal interaction simplified to native controls.
- The legacy summary/recommendation panel was consolidated into the analysis panel v2.
- The picker core was simplified to a single render flow for composition and modal state.
- The analysis engine now returns a weighted v3.1 contract with synergy, coherence and win-condition metadata.
- The analysis panel now renders the weighted v3.1 output.
- The analysis panel now surfaces knowledge-layer synergies, coherence and win condition outputs.
- Knowledge-layer validation now runs at boot and exposes a report for debugging.
- Service worker cache bumped to v37 after the knowledge validation update.

### Notes
- The main screen must stay compact and understandable in seconds.
- The analysis motor summarizes; the future IA explains.
