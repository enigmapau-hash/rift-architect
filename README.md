# Rift Architect

PWA para construir y analizar composiciones de League of Legends.

## Flujo del proyecto

- `Draft Pool.xlsx` es la fuente de verdad.
- Un GitHub Action convierte el Excel a JSON en cada push a `main`.
- La PWA consume `data/index.json` y los ficheros de rol generados.
- GitHub Pages se publica automáticamente desde el workflow.

## Estructura de datos

- `data/index.json`
- `data/top.json`
- `data/jungle.json`
- `data/mid.json`
- `data/bot.json`
- `data/support.json`

## Scripts

```bash
npm install
npm run generate:data
```

## Arquitectura

La base técnica y la hoja de ruta están en `docs/architecture.md`.
