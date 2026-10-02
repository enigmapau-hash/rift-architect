# Analysis Contract

This document defines the data contract consumed by the executive dashboard renderer.

The renderer should only read the normalized contract object produced from the analysis story. It must not pull data directly from lower-level engines.

## Composition Profile
Source: `buildCompositionProfile`

Available fields:
- `slots`
- `selectedChampions`
- `count`
- `complete`
- `roles`
- `missingRoles`
- `names`
- `identities`
- `functions`
- `tempos`
- `tags`
- `primaryChampion`

## Strategic Engine
Source: `buildStrategicReasoning`

Available fields:
- `focus`
- `headline`
- `summary`
- `claims`
- `dependencies`
- `cascades`
- `redundancies`
- `powerSpikes`
- `conflicts`
- `risks`
- `robustness`
- `flexibility`
- `contingencies`
- `adaptations`
- `profiles`
- `anchors`
- `windows`
- `dominantWindow`
- `signals`
- `profile`
- `metrics`
- `execution`
- `robustnessSummary`
- `flexibilitySummary`
- `contingency`
- `adaptation`

## Knowledge Layer
Source: `buildKnowledgeV3Context`

Available fields:
- `primaryStyle`
- `rivalStyle`
- `matchup`
- `style`
- `macro`
- `vision`
- `tempo`
- `objectives`
- `victory`
- `defeat`
- `mistake`
- `lead`
- `summary`
- `rules`
- `claims`
- `tags`
- `signals`

## Ban Engine
Source: `buildBanRecommendations`

Available fields:
- `title`
- `summary`
- `focus`
- `profile`
- `bans`
- `tags`
- `signals`

## Last Pick Engine
Source: `buildLastPickRecommendations`

Available fields:
- `title`
- `summary`
- `focus`
- `targetRole`
- `targetRoleLabel`
- `profile`
- `strategicProfile`
- `recommendations`
- `bestPick`
- `alternatives`
- `tags`

## Contract output consumed by the renderer
The contract object also includes these normalized fields for the dashboard:

- `mode`
- `title`
- `summaryText`
- `confidence`
- `scoreBadge`
- `grade`
- `tags`
- `primaryIdentity`
- `identityCopy`
- `secondaryIdentities`
- `strengths`
- `weaknesses`
- `synergies`
- `risks`
- `phases`
- `tempo`
- `dominance`
- `contextual`
- `strategic`
- `knowledge`
- `bans`
- `banFocus`
- `banSummary`
- `bestPick`
- `alternatives`
- `needs`
- `identityTokens`
- `summaryTokens`
- `heroMetrics`
- `strategicTokens`
- `knowledgeTokens`
- `dependencyClaims`
- `riskClaims`
- `signalTokens`
- `sourceMap`
- `sections`

## Renderer rule
The dashboard renderer should consume only this contract and should not ask the lower-level engines for additional data during render.