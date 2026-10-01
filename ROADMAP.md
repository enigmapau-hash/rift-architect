# Rift Architect Roadmap

## Fases completadas

- **Fase 1** — Base técnica: Excel como fuente de verdad, exportación a JSON y GitHub Pages.
- **Fase 2** — Selección y composición: selector modal por rol, tarjetas homogéneas y responsive.
- **Fases 3-5** — Motor de análisis, asistente IA y Knowledge + IA.
- **Fases 6-19** — Composition Story, UX passes, Analysis Hub, Draft Assistant, Narrative Engine, Explainability y mejoras de motor.
- **Fases 20-32** — Evolución hacia una home limpia, tarjetas-resumen, Motor Trace y limpieza del Analysis Hub.
- **Fase 33** — Story Sync: la Story se actualiza desde el borrador guardado en localStorage para reflejar la composición real.
- **Fase 34** — Fixed Cards: la Story vuelve a una rejilla de tarjetas fijas, compactas y jerarquizadas.

## Estado actual

- Home con seis tarjetas fijas de resumen.
- Cada tarjeta muestra líneas cortas, chips, barras textuales e iconos.
- No hay modales ni acordeones en la Story principal.
- El botón **Actualizar** sigue oculto.
- Cache de GitHub Pages y service worker alineados con la versión visible.

## Siguiente trabajo

- Pulir la lectura de las tarjetas fijas.
- Reducir texto redundante.
- Validar más composiciones reales.
- Seguir limpiando código legado si reaparece alguna regresión.

## Regla del proyecto

Cada entrega debe actualizar código, README, ROADMAP y `docs/PROJECT_STATE.md`.
