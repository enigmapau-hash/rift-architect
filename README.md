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
- El bloque de **Índice de salud** añade diagnóstico ejecutivo, condición de victoria y mayor error castigado.
- El selector de campeones se ha ampliado para ser más cómodo en escritorio.
- La IA sigue apoyándose en el motor y en el Excel para explicar el plan en lenguaje simple.
- El **Composition Optimizer** permite probar swaps internos y priorizar mejoras.
- La Knowledge Layer separa identidad, sinergias, patrones, dependencias, conflictos y win conditions del motor.
- La Knowledge Layer se valida al arrancar para detectar incoherencias antes de usar la IA.
- Existe un banco de pruebas del motor con composiciones de referencia, edge cases, cobertura de patrones y dependencias, y medición básica de tiempo.
- Responsive compartido para PC, tablet y móvil.

## GitHub Pages

- `https://enigmapau-hash.github.io/rift-architect/`

## Roadmap

Ver [`ROADMAP.md`](./ROADMAP.md) para la hoja de ruta completa.
