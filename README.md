# Rift Architect

PWA para construir y analizar composiciones de League of Legends.

## Flujo del proyecto

- `Draft Pool.xlsx` es la fuente de verdad.
- Un GitHub Action convierte el Excel a JSON en cada push a `main`.
- La PWA consume `data/index.json` y los ficheros de rol generados.
- GitHub Pages se publica automáticamente desde el workflow.

## Estado actual

- Selector visual por roles.
- Composición editable con selección rápida.
- Perfil de campeón con atributos derivados o explícitos.
- Motor de análisis basado en métricas numéricas.
- Vista responsive para móvil, tablet y PC.

## Hoja opcional de atributos

Si añades una hoja `09_Attributes` o `Attributes`, el generador la detecta y mezcla esos valores en cada campeón.

Plantilla exacta:

- [`docs/attributes-template.md`](./docs/attributes-template.md)

Columnas recomendadas:

- `Champion`
- `Engage`
- `Disengage`
- `Frontline`
- `Peel`
- `Pick`
- `Poke`
- `Burst`
- `DPS`
- `Scaling`
- `Mobility`
- `Waveclear`
- `Siege`
- `Splitpush`
- `Objective Control`
- `Vision`
- `Confidence`

## Estructura de datos

- `data/index.json`
- `data/top.json`
- `data/jungle.json`
- `data/mid.json`
- `data/bot.json`
- `data/support.json`
- `data/attributes.json`

## Scripts

```bash
npm install
npm run generate:data
```

## Arquitectura

La base técnica y la hoja de ruta están en `docs/architecture.md`.
