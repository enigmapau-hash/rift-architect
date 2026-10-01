# Rift Architect

PWA para entender una composición de League of Legends a partir de `Draft Pool.xlsx`.

## Arquitectura simple

- **Knowledge Layer**: Excel + reglas estratégicas normalizadas.
- **Inference Layer**: análisis, coach, necesidades, perfiles y narrativa.
- **Communication Layer**: Draft Assistant y vistas ejecutivas para leer el resultado rápido.

## Fuente de verdad

- `Draft Pool.xlsx` es la única fuente editable.
- Un GitHub Action convierte el Excel a JSON en cada push a `main`.
- La PWA consume `data/index.json` y los ficheros generados en `data/`.
- GitHub Pages publica la versión visible del proyecto.

## Estado actual

- Selector modal por rol con iconos oficiales y alias para variantes como Kayn, Shaco o Varus.
- La composición se reinicia al recargar; no hay persistencia automática.
- La pantalla principal ahora sigue una arquitectura de información fija: Tu composición, Plan de victoria, Prioridades, Riesgos, Draft y Análisis avanzado.
- La composición Story usa un flujo acordeón con una sola tarjeta abierta a la vez.
- La Story muestra un resumen corto primero y despliega el razonamiento completo solo al abrir cada apartado.
- El bloque Draft completa el recorrido con necesidades, picks y bans antes del análisis avanzado.
- El **Analysis Hub** unifica assessment y Rift Advisor en una sola superficie de lectura y acción.
- El hub concentra veredicto, diagnósticos, cobertura, prioridades, fases y respuestas contextuales.
- El hub usa ahora un único modelo interno de análisis tras retirar la referencia obsoleta del asistente.
- El selector de campeones se ha ampliado para ser más cómodo en escritorio.
- La IA sigue apoyándose en el motor y en el Excel para explicar el plan en lenguaje simple.
- El **Composition Optimizer** permite probar swaps internos y priorizar mejoras.
- La Knowledge Layer separa identidad, sinergias, patrones, dependencias, conflictos y win conditions del motor.
- La Knowledge Layer se valida al arrancar para detectar incoherencias antes de usar la IA.
- Existe un banco de pruebas del motor con composiciones de referencia, edge cases, cobertura de patrones y dependencias, y medición básica de tiempo.
- El **Coach** ya genera un `StrategicPlan` único con modo de plan, briefing, fases, riesgos, picos de poder y perfil de ejecución.
- El **Draft Assistant** ya tiene una base para perfilar necesidades de composición, priorizar picks y orientar bans a partir del `StrategicPlan`.
- El **Draft Assistant** ahora se muestra como una beta 0.14 de IA Flow: resumen corto primero, detalle bajo demanda y flujo acordeón.
- La capa visual usa un sistema de diseño compartido para Hero Card, Decision Card, Insight Card, Detail Card, chips, badges y flow cards.
- El **Narrative Engine** convierte el análisis ejecutivo en una historia corta: cómo gana, qué necesita, qué le falta, qué solución tiene y qué debe evitar.
- La línea de razón del Narrative Engine muestra el “por qué” detrás de la necesidad principal.
- Hay un badge visible de build en la cabecera para comprobar de un vistazo qué versión está cargada.
- El documento `docs/architecture.md` describe el modelo de tres capas: Knowledge, Inference y Communication.
- El documento `docs/narrative-engine.md` define la narrativa ejecutiva como capa de comunicación.
- El documento `docs/strategic-profiles.md` define el Need Engine y la traducción de necesidades a perfiles estratégicos.
- El **Draft Assistant UI** ya puede mostrar necesidades, perfiles estratégicos, clases compatibles y bans en un panel propio dentro del Analysis Hub.
- La capa visual del Draft Assistant se sigue ajustando para que el panel sea más ejecutivo, más compacto y más coherente con el resto del hub.
- El Executive Summary volvió a renderizar correctamente tras restaurar los helpers de confidencia.
- La disciplina de trabajo obliga a actualizar código, README, ROADMAP y `docs/PROJECT_STATE.md` en cada entrega.
- Responsive compartido para PC, tablet y móvil.

## GitHub Pages

- `https://enigmapau-hash.github.io/rift-architect/`

## Flujo de trabajo de cada entrega

1. Implementar la funcionalidad.
2. Ejecutar auditoría técnica y funcional.
3. Corregir regresiones antes de cerrar el sprint.
4. Actualizar README, ROADMAP y `docs/PROJECT_STATE.md`.
5. Publicar en Pages si hay cambios de versión.

## Roadmap

Ver [`ROADMAP.md`](./ROADMAP.md) para la hoja de ruta completa.
