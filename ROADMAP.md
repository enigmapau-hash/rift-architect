# Rift Architect Roadmap

## Fases completadas

- **Fase 1** — Base técnica: Excel como fuente de verdad, exportación a JSON y GitHub Pages.
- **Fase 2** — Selección y composición: selector modal por rol, tarjetas homogéneas y responsive.
- **Fases 3-5** — Motor de análisis, asistente IA y Knowledge + IA.
- **Fases 6-19** — Composition Story, UX passes, Analysis Hub, Draft Assistant, Narrative Engine, Explainability y mejoras de motor.
- **Fases 20-32** — Evolución hacia una home limpia, tarjetas-resumen, Motor Trace y limpieza del Analysis Hub.
- **Fase 33** — Story Sync: la Story se actualiza desde el borrador guardado en localStorage para reflejar la composición real.
- **Fase 34** — Fixed Cards: la Story vuelve a una rejilla de tarjetas fijas, compactas y jerarquizadas.
- **Fase 35** — Responsive Fixed Cards: las tarjetas fijas se ajustan a móvil, tablet y escritorio con la misma jerarquía.
- **Fase 36** — Compact Story Signals: la Story reduce texto redundante y prioriza señales compactas por tarjeta.
- **Fase 37** — Signal Cards: la comunicación visual gana peso frente al texto largo y la información repetida.
- **Fase 38** — Visual Signal Cards: las señales pasan a usar chips y barras más gráficas para leer de un vistazo.
- **Fase 39** — Desktop Signal Balance: el banco de señales gana más aire en escritorio para evitar columnas estrechas y texto comprimido.
- **Fase 40** — Explainability Panel: el motor se expone como evidencias, pesos y confianza dentro de un panel contextual.
- **Fase 41** — Unified Analysis Model: todas las vistas consumen el mismo objeto de análisis normalizado.

## Estado actual

- Home con seis tarjetas fijas de resumen.
- Cada tarjeta muestra líneas cortas, chips, barras textuales e indicadores visuales.
- La experiencia mantiene la misma estructura en móvil, tablet y escritorio.
- La lectura es más compacta y deja más aire al contenido importante.
- El botón **Actualizar** sigue oculto.
- Cache de GitHub Pages y service worker alineados con la versión visible.

## Siguiente trabajo

- Unificar todavía más los indicadores visuales.
- Reducir la redundancia entre las tarjetas, el panel explicativo y el modelo unificado.
- Validar más composiciones reales en varios tamaños de pantalla.
- Seguir limpiando código legado si reaparece alguna regresión.

## Regla del proyecto

Cada entrega debe actualizar código, README, ROADMAP y `docs/PROJECT_STATE.md`.
