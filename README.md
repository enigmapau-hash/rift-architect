# Rift Architect

PWA para analizar **mi propia composición** de League of Legends a partir de `Draft Pool.xlsx`.

## Qué hace la app

- Selector de campeones por rol.
- Resumen ejecutivo.
- Identidad de la composición.
- Fortalezas y debilidades.
- Plan de partida por fases.
- Sinergias y riesgos.

## Fuente de verdad

- `Draft Pool.xlsx` es la única fuente editable.
- La app lee el Excel directamente en tiempo de ejecución.
- No hay una capa generada de JSON en `data/`.

## Estado actual

- La app ya está centrada en una única ruta de render.
- La selección, la persistencia y el análisis funcionan sobre la composición propia.
- La UI prioriza lectura rápida y bloques compactos.

## GitHub Pages

- `https://enigmapau-hash.github.io/rift-architect/`

## Regla de trabajo

No se abre un bloque nuevo hasta cerrar el anterior.

## Roadmap

Ver [`ROADMAP.md`](./ROADMAP.md) para la hoja de ruta completa.
