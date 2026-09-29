# Rift Architect Roadmap

## Fase 1 — Base técnica ✅
- Excel como fuente de verdad.
- Exportación automática a JSON.
- GitHub Pages como versión pública.

## Fase 2 — Selección y composición ✅
- Selector modal por rol.
- Tarjetas homogéneas con iconos oficiales.
- Identidad, función y tempo visibles.
- Responsive compartido para PC, tablet y móvil.
- Estado de composición temporal, sin persistencia automática al recargar.
- Modal estabilizado con interacción nativa.

## Fase 3 — Motor de análisis 🚧
- Definir qué es identidad, función y tempo.
- Detectar identidad principal y secundarias.
- Resumir fortalezas y carencias.
- Construir un plan de juego simple y compacto.

### Sprint 4.1 — Modelo de datos y contrato ✅
- Revisar el Excel como contrato de datos.
- Documentar qué campos usa la UI, el motor y la IA.
- Unificar el objeto `Champion`.
- Alinear `README`, `docs/` y la interfaz con el mismo modelo.

### Sprint 4.2 — Motor de análisis v1 ✅
- Motor determinista basado solo en el Excel.
- Identidad principal y secundarias.
- Fortalezas, carencias y plan de juego corto.
- Resumen compacto y fácil de leer.

### Sprint 4.3 — Auditoría y normalización del Draft Pool ✅
- Revisar hoja por hoja el Excel.
- Normalizar Identity y Tempo.
- Detectar vacíos y duplicados.
- Escribir `data/audit.json`.
- Mantener la base limpia antes de seguir con la IA.

### Sprint 4.4 — Catálogo de atributos ✅
- Definir qué atributos se muestran y cuáles son internos.
- Unificar el significado de cada atributo.
- Mantener la UI breve y sin exceso de texto.

### Sprint 4.5 — Motor de interpretación ✅
- Traducir datos del Excel a un resumen compacto.
- Mostrar identidad principal, secundarias, fortalezas, carencias y plan.
- Limitar la salida a lo imprescindible.
- Mantener la IA para una fase posterior.

### Sprint 4.6 — Visión de producto y contrato v2 ✅
- Definir qué es Rift Architect y qué no es.
- Fijar el presupuesto de información del análisis.
- Cerrar el contrato de salida del motor v2.

### Sprint 4.7 — Core Engine v0.5 🚧
- Implementar el motor v2 como entregable completo.
- Separar el motor en módulos de identidad, fortalezas, debilidades, tempo y plan.
- Integrar el panel final de análisis con tempo visible.
- Estabilizar el modal de selección con controles nativos.
- Publicar documentación técnica y changelog.
- Pasar la auditoría general antes de cerrar el hito.

## Fase 4 — Asistente IA ⏳
- Explicar la composición seleccionada.
- Responder preguntas de draft.
- Ampliar el análisis sin usar datos externos.

## Fase 5 — Coach conversacional ⏳
- Preguntas sobre ejecución, errores y win condition.
- Respuestas guiadas por la información del Excel.

## Regla del proyecto
- Cada sprint debe actualizar código, README, roadmap y Pages.
- Cada sprint incluye una revisión de regresiones visuales y de estado.
