# Rift Architect

PWA para analizar **mi propia composición** de League of Legends a partir de `Draft Pool.xlsx`.

## Lo que muestra la app

- Selector de campeones por rol.
- Resumen ejecutivo corto.
- Identidad de la composición.
- Fortalezas y debilidades visuales.
- Plan de partida por fases.
- Sinergias clave y riesgos.

## Fuente de verdad

- `Draft Pool.xlsx` es la única fuente editable.
- Un GitHub Action convierte el Excel a JSON en cada push a `main`.
- La PWA consume `data/index.json` y los ficheros generados en `data/`.
- GitHub Pages publica la versión visible del proyecto.

## Estado actual

- La pantalla principal vuelve a estar centrada en la composición y su lectura rápida.
- La Story muestra tarjetas fijas, compactas y visuales.
- El motor interno sigue alimentando la lectura con identidad, plan, fortalezas, debilidades y riesgos.
- La interfaz prioriza claridad por encima de paneles experimentales.

## GitHub Pages

- `https://enigmapau-hash.github.io/rift-architect/`

## Flujo de trabajo

1. Implementar el cambio.
2. Probarlo en la UI principal.
3. Corregir regresiones.
4. Actualizar README, ROADMAP y `docs/PROJECT_STATE.md`.

## Roadmap

Ver [`ROADMAP.md`](./ROADMAP.md) para la hoja de ruta.