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

## Qué debe hacer

El motor no debe inventar ni reinterpretar datos.

Solo debe:

- agrupar identidades,
- resumir fortalezas,
- resumir carencias,
- mostrar un plan de juego corto,
- devolver un resultado limpio para que la IA lo explique después.

## Qué no debe hacer

- No usar meta externo.
- No usar winrates.
- No analizar al rival.
- No recomendar campeones en esta fase.
- No inventar datos si faltan campos.

## Salida esperada

La interfaz debe mostrar, como mínimo:

- Identidad principal
- Identidades secundarias
- Fortalezas
- Carencias
- Plan de juego

## Criterio de calidad

Si un dato no existe en el Excel, debe detectarse en origen. La interfaz no debe mezclar categorías ni mostrar datos inconsistentes.
