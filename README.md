# Rift Architect

PWA para entender una composición de League of Legends a partir de `Draft Pool.xlsx`.

## Fuente de verdad

- `Draft Pool.xlsx` es la única fuente editable.
- Un GitHub Action convierte el Excel a JSON en cada push a `main`.
- La PWA consume `data/index.json` y los ficheros generados en `data/`.
- GitHub Pages publica la versión visible del proyecto.

## Estado actual

- Selector modal por rol con iconos oficiales y alias para variantes como Kayn, Shaco o Varus.
- La composición se reinicia al recargar; no hay persistencia automática.
- La pantalla principal se organiza alrededor de una sola **Composition Story**.
- La Story usa una rejilla más equilibrada en escritorio y mantiene una lectura compacta en móvil.
- La Story resume identidad, perfil táctico, cómo gana, qué hacer, qué evitar, pieza clave, timeline y preguntas rápidas.
- El plan principal se muestra como checklist visual para que sea más rápido de leer.
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
- El Executive Summary volvió a renderizar correctamente tras restaurar los helpers de confidencia.
- La disciplina de trabajo obliga a actualizar código, README, ROADMAP y auditoría funcional/técnica en cada entrega.
- Responsive compartido para PC, tablet y móvil.

## GitHub Pages

- `https://enigmapau-hash.github.io/rift-architect/`

## Flujo de trabajo de cada entrega

1. Implementar la funcionalidad.
2. Ejecutar auditoría técnica y funcional.
3. Corregir regresiones antes de cerrar el sprint.
4. Actualizar README y ROADMAP.
5. Publicar en Pages si hay cambios de versión.

## Roadmap

Ver [`ROADMAP.md`](./ROADMAP.md) para la hoja de ruta completa.