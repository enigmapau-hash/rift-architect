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

## Fase 3 — Motor de análisis ✅
- Identidad principal y secundarias.
- Fortalezas, carencias y plan de juego.
- Resumen compacto y fácil de leer.
- Sinergias, dependencias, coherencia y win condition.
- Coach, Strategic Advisor y Explainability.

## Fase 4 — Asistente IA ✅
- Explicar la composición seleccionada.
- Responder preguntas de draft.
- Ampliar el análisis sin usar datos externos.

## Fase 5 — Knowledge + IA ✅
- Separar el conocimiento estratégico del código.
- Validar identidades, sinergias, conflictos y win conditions.
- Preparar inferencias para la IA.

## Fase 6 — Composition Story ✅
- Convertir el análisis en una sola historia visual.
- Mostrar qué eres, cómo ganas, qué debes hacer y qué debes evitar.
- Reducir paneles redundantes y priorizar la lectura rápida.

## Fase 7 — UX Pass ✅
- Simplificar la pantalla principal a una vista más clara.
- Dar más protagonismo a la historia de la composición.
- Eliminar bloques repetidos de la experiencia principal.

## Fase 10 — UX Refactor ✅
- Reorganizar la Composition Story en una rejilla de dos columnas en escritorio.
- Añadir el perfil táctico visual de la composición con barras.
- Mostrar el plan principal como checklist visual.
- Mantener la lectura compacta en móvil para reducir scroll.
- Dar más ancho al selector de campeones.
- Afinar espaciados, jerarquía y consistencia visual antes de la beta.

## Fase 11A — Analysis Experience ✅
- Convertir las barras tácticas en una lectura realmente ejecutiva.
- Añadir el Índice de salud de la composición.
- Mostrar la condición de victoria de forma más explícita.
- Destacar el mayor error castigado por el draft.
- Contextualizar fortalezas y riesgos con frases accionables.

## Fase 11B — Executive Analysis ✅
- Mostrar un veredicto ejecutivo en el hero de análisis.
- Ordenar prioridades dinámicas según identidad, tempo y win condition.
- Explicar cada indicador con el botón “¿Por qué?”.
- Reducir texto suelto y dar más peso a indicadores visuales.

## Fase 12 — Analysis Quality ✅
- Unificar las puntuaciones del motor en una lectura más fiable.
- Medir cobertura, coherencia y señales fuertes del análisis.
- Destacar mejoras prioritarias para cada composición.
- Validar composiciones de referencia y ajustar pesos del Draft Pool.

## Fase 12.5 — Product Audit ✅
- Fusionar la salud y la calidad en un único bloque de assessment.
- Reducir redundancias entre hero, assessment, plan y perfil táctico.
- Revisar orden de lectura, espaciado y lenguaje visual.
- Mantener una sola narrativa clara desde el hero hasta el cierre.

## Fase 13 — Analysis Hub ✅
- Unificar assessment y Rift Advisor en una sola superficie de análisis.
- Mostrar veredicto, diagnósticos, prioridades, fases y respuestas rápidas.
- Mantener explicaciones contextuales enlazadas al mismo análisis.
- Reducir duplicidad entre bloques y simplificar la lectura principal.
- Cerrar la dependencia del asistente obsoleto y trabajar con un único modelo interno.

## Fase 14 — Draft Coach / Coach Intelligence 🔄
- Consolidar el `StrategicPlan` como contrato único del coach.
- Generar briefing, fases, riesgos, picos de poder y perfil de ejecución desde una sola fuente.
- Reducir duplicidades entre resumen, plan, checklist y Advisor.
- Afinar el lenguaje para que el briefing sea corto, claro y accionable.
- Restabilizar helpers compartidos del Executive Summary y evitar regresiones por referencias rotas.
- Preparar el siguiente paso del Draft Assistant sin salir de la filosofía de analizar solo la propia composición.

## Fase 15 — Draft Assistant ⏳
- Recomendar el pick que mejor completa la composición.
- Proponer bans que protejan el plan de juego.
- Reusar `StrategicPlan` sin depender del rival.

## Fase 8 — Validación y pulido ⏳
- Validar el motor con composiciones de referencia.
- Revisar coherencia tras cambios en el Excel.
- Afinar textos, espaciado, accesibilidad y rendimiento.

## Fase 9 — Champion Pool Architect ⏳
- Analizar el estilo del jugador.
- Recomendar campeones por pool y rol.
- Detectar huecos del pool y prioridades de práctica.

## Regla del proyecto
- Cada entrega debe actualizar código, README, roadmap y Pages.
- Cada entrega incluye revisión de regresiones visuales y de estado.
- Ningún sprint se cierra sin auditoría técnica y funcional mínima.