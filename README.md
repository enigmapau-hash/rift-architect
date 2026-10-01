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

- **Hito 1 cerrado**: una sola ruta de render, consola limpia y sin módulos experimentales visibles.
- La pantalla principal vuelve a estar centrada en la composición y su lectura rápida.
- La Story muestra tarjetas fijas, compactas y visuales.
- El resumen ejecutivo principal se mantiene en formato corto: identidad, fortalezas, debilidades y plan.
- La interfaz prioriza claridad por encima de paneles experimentales.

## GitHub Pages

- `https://enigmapau-hash.github.io/rift-architect/`

## Hoja de ruta

1. **Hito 1: Base estable** — cerrado.
2. **Hito 2: Pantalla principal terminada**.
3. **Hito 3: IA refinada**.
4. **Hito 4: Base de conocimiento madura**.
5. **Hito 5: Beta 1.0**.
6. **Hito 6: Release Candidate**.
7. **Hito 7: Versión 1.0**.

## Regla de trabajo

No se abre un bloque nuevo hasta cerrar el anterior.

## Roadmap

Ver [`ROADMAP.md`](./ROADMAP.md) para la hoja de ruta completa.