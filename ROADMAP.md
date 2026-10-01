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

## Fase 14 — Draft Coach / Coach Intelligence ✅
- Consolidar el `StrategicPlan` como contrato único del coach.
- Generar briefing, fases, riesgos, picos de poder y perfil de ejecución desde una sola fuente.
- Reducir duplicidades entre resumen, plan, checklist y Advisor.
- Afinar el lenguaje para que el briefing sea corto, claro y accionable.
- Restabilizar helpers compartidos del Executive Summary y evitar regresiones por referencias rotas.
- Preparar el siguiente paso del Draft Assistant sin salir de la filosofía de analizar solo la propia composición.

## Fase 15 — Draft Assistant ✅
- Recomendar el pick que mejor completa la composición.
- Proponer bans que protejan el plan de juego.
- Reusar `StrategicPlan` sin depender del rival.
- Arrancar con una base de necesidades, prioridades y señales de pick/ban antes de mapear campeones concretos.
- Mostrar el razonamiento del asistente en el Analysis Hub antes de traducirlo a campeones concretos.
- Agrupar necesidades por prioridad e incluir el impacto sobre el plan antes de pasar a perfiles estratégicos.
- Introducir una capa de perfiles estratégicos entre las necesidades y las clases para mantener la explicación y el motor desacoplados de campeones concretos.
- Pulir la interfaz para que el panel sea más ejecutivo, más compacto y más coherente con el resto del hub.

## Fase 16 — Need Engine ✅
- Extraer la detección de necesidades a un módulo propio.
- Priorizar necesidades reales de la composición con una salida corta y fácil de leer.
- Mantener el motor simple reutilizando atributos existentes antes de añadir nuevos campos al Excel.
- Reusar esas necesidades para alimentar perfiles y recomendaciones de picks/bans.
- Mantener la IA como capa de explicación y no de decisión.
- Evitar añadir complejidad visual innecesaria.

## Fase 17 — Executive UX Pass ✅
- Convertir el Draft Assistant en una vista ejecutiva primero, con el veredicto por delante.
- Mantener el detalle completo como ampliación opcional.
- Reducir superficies de lectura redundantes sin tocar el motor.
- Conservar toda la profundidad estratégica detrás de una interfaz más compacta.
- Priorizar comprensión rápida sin devaluar el trabajo del análisis.

## Fase 18 — Narrative Engine ✅
- Convertir el análisis ejecutivo en una historia corta y legible.
- Unificar cómo gana, qué necesita, qué le falta, qué solución tiene y qué debe evitar.
- Mostrar la narrativa antes del detalle técnico.
- Reutilizar el motor existente sin añadir nuevos datos al Excel.

## Fase 19 — Explainability Engine ✅
- Hacer que cada conclusión responda al “por qué”.
- Conectar las necesidades con su causa principal.
- Dar soporte a la narrativa sin añadir ruido.
- Mantener la explicación corta, estructurada y reutilizable.
- Mostrar un badge visible de build y versión en la cabecera para confirmar el despliegue.

## Fase 20 — Beta 0.3 / One Story ✅
- Convertir la parte superior en una sola historia visible.
- Mostrar la respuesta primero y el detalle completo plegado.
- Eliminar nombres técnicos visibles cuando no aporten valor.
- Reducir el ruido visual sin tocar el motor.
- Acercar la experiencia a una Beta 1.0 utilizable de forma habitual.

## Fase 21 — Beta 0.4 / Product Audit ✅
- Revisar la experiencia superior como una sola tarjeta narrativa.
- Eliminar nombres técnicos visibles que no aporten valor a la decisión.
- Reducir tarjetas y texto innecesario en la vista principal.
- Validar que la respuesta principal se entiende en segundos.

## Fase 22 — Beta 0.5 / Product Simplification ✅
- Dejar la tarjeta superior como una sola respuesta directa.
- Reducir todavía más el ruido visual del bloque principal.
- Mantener el detalle plegado como soporte, no como protagonista.
- Seguir acercando la interfaz a un producto terminado.

## Fase 23 — Beta 0.6 / Single Decision Screen ✅
- Convertir la parte superior en una única tarjeta de decisión.
- Mostrar solo una respuesta directa arriba.
- Mantener el detalle como apoyo plegado.
- Reducir la percepción de “paneles” y aumentar la sensación de producto.

## Fase 24 — Beta 0.7 / Single Decision Card ✅
- Reducir la tarjeta superior a dos señales visibles: decisión principal y riesgo principal.
- Mantener el resto del análisis plegado como soporte.
- Seguir simplificando la lectura inicial.
- Acercar la experiencia a una pantalla única de decisión.

## Fase 25 — Beta 0.8 / Design System ✅
- Unificar las piezas visuales compartidas en Hero Card, Decision Card, Insight Card, Detail Card, chips y badges.
- Reducir variantes visuales para que la experiencia sea más consistente.
- Mantener una sola identidad de diseño en toda la app.
- Hacer que nuevas pantallas reutilicen componentes comunes en vez de inventar versiones nuevas.

## Fase 26 — Beta 0.9 / Home Wireframe ✅
- Replantear la home como una única tarjeta principal con hero, cómo gana, prioridad y evita.
- Separar el detalle en un bloque plegado secundario.
- Quitar ruido visual y dejar la decisión arriba.
- Sentar el contrato visual de la Beta 1.0 antes de seguir puliendo.

## Fase 27 — Beta 0.10 / Layout Pass 1 ✅
- Reordenar la home wireframe para que la jerarquía empiece por el hero y siga con el detalle plegado.
- Reducir tarjetas visibles y agrupar la información en menos bloques.
- Dar más protagonismo a la decisión principal y menos al soporte.
- Preparar el terreno para el último pulido antes de la beta estable.

## Fase 28 — Beta 0.11 / Expandable Cards ✅
- Convertir cada bloque de análisis en una tarjeta resumen expandible.
- Mostrar una sola línea de valor al cerrar y el razonamiento completo al abrir.
- Mantener toda la información del motor sin sacrificar limpieza visual.
- Unificar la interacción en una sola experiencia de acordeón inteligente.

## Fase 29 — Beta 0.12 / Accordion Flow ✅
- Convertir cada bloque en un acordeón con resumen breve y razonamiento desplegable.
- Mantener una sola tarjeta abierta a la vez para reducir ruido.
- Reordenar el flujo de lectura para que siga una secuencia natural.
- Preservar todo el análisis del motor sin obligar a leerlo de golpe.

## Fase 30 — Information Architecture / IA Flow ✅
- Reordenar la home en la secuencia definitiva de lectura.
- Añadir el bloque Draft al flujo principal.
- Mantener un solo acordeón abierto.
- Eliminar repeticiones entre tarjetas y dar a cada dato un único propietario.
- Convertir la tarjeta superior en una narrativa de seis bloques.

## Fase 31 — Legacy Migration 🔄
- Retirar el Analysis Hub antiguo de la interfaz principal.
- Evitar que la versión nueva conviva con paneles heredados.
- Consolidar la lectura en el flujo acordeón de la home.
- Limpiar estilos y scripts ya sin uso visible.

## Ideas futuras (fuera de Beta 1.0)
- Champion Pool Architect.

## Fase 8 — Validación y pulido ⏳
- Validar el motor con composiciones de referencia.
- Revisar coherencia tras cambios en el Excel.
- Afinar textos, espaciado, accesibilidad y rendimiento.

## Regla del proyecto
- Cada entrega debe actualizar código, README, ROADMAP y Pages.
- Cada entrega incluye revisión de regresiones visuales y de estado.
- Ningún sprint se cierra sin auditoría técnica y funcional mínima.
