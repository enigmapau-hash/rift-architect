# Rift Architect

PWA para entender una composición de League of Legends a partir de `Draft Pool.xlsx`.

## Arquitectura simple

- **Knowledge Layer**: Excel + reglas estratégicas normalizadas.
- **Inference Layer**: análisis, coach, necesidades, perfiles y narrativa.
- **Communication Layer**: tarjetas fijas de resumen, compactas y visuales, con señales, chips y barras para móvil, tablet y escritorio.

## Fuente de verdad

- `Draft Pool.xlsx` es la única fuente editable.
- Un GitHub Action convierte el Excel a JSON en cada push a `main`.
- La PWA consume `data/index.json` y los ficheros generados en `data/`.
- GitHub Pages publica la versión visible del proyecto.

## Estado actual

- Selector modal por rol con iconos oficiales y alias para variantes como Kayn, Shaco o Varus.
- La composición se reinicia al recargar; no hay persistencia automática.
- La pantalla principal sigue una arquitectura fija: Tu composición, Plan de victoria, Prioridades, Riesgos, Draft y Análisis avanzado.
- La Story muestra seis tarjetas fijas con señales compactas, barras y chips.
- La Story se sincroniza con la composición mediante el borrador guardado en localStorage.
- La lectura prioriza indicadores visuales para reducir texto redundante.
- El antiguo flujo de modal/accordion quedó descartado para simplificar la lectura principal.
- La IA sigue apoyándose en el motor y en el Excel para explicar el plan en lenguaje simple.
- La Knowledge Layer separa identidad, sinergias, patrones, dependencias, conflictos y win conditions del motor.
- Existe un banco de pruebas del motor con composiciones de referencia, edge cases y medición básica de tiempo.
- El Coach genera un `StrategicPlan` único con briefing, fases, riesgos, picos de poder y perfil de ejecución.
- El Draft Assistant perfila necesidades de composición, prioriza picks y orienta bans a partir del `StrategicPlan`.
- El Explainability Panel permite abrir la lectura del motor en forma de evidencias, pesos y confianza.
- El análisis ahora expone un **Unified Analysis Model** para que Story, Coach, Draft y Explainability lean la misma estructura.
- El Explainability Panel incorpora un **Recommendation Hub** para revisar acciones ordenadas por impacto, confianza y evidencia.
- El panel explicativo añade una vista de **Strategic Coach** con fases, alertas, prioridades y picos de poder.
- Se añadió una vista de **Tactical Intelligence** para traducir el plan en decisiones concretas y alternativas si se cierra la ventana.

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