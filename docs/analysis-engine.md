# Analysis Engine

## Objetivo

Definir una capa de análisis simple, estable y basada solo en la información del Excel.

## Entrada

El motor trabaja con el objeto canónico `Champion` definido en `docs/data-contract.md`:

- `id`
- `displayName`
- `role`
- `icon`
- `identity`
- `function`
- `tempo`
- `strengths[]`
- `weaknesses[]`
- `attributes` cuando existan

## Qué hace el motor v1

El motor no inventa ni interpreta más de la cuenta. Solo agrupa y resume.

Salida esperada:

- `primaryIdentity`
- `secondaryIdentities[]`
- `strengths[]`
- `weaknesses[]`
- `gamePlan[]`
- `summaryText`

## Reglas

- No usar meta externo.
- No usar winrates.
- No analizar al rival.
- No recomendar campeones en esta fase.
- No inventar datos si faltan campos.
- Mantener los mensajes cortos y claros.

## Criterio de calidad

Si un dato no existe en el Excel, debe detectarse en origen. La interfaz no debe mezclar categorías ni mostrar datos inconsistentes.

## Resultado esperado

La interfaz debe mostrar solo lo imprescindible:

- Identidad principal
- Identidades secundarias
- Hace bien
- Le falta
- Plan de juego
