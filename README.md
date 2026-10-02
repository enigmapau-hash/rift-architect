# Rift Architect

PWA para analizar **mi propia composición** de League of Legends a partir de `Draft Pool.xlsx`.

## Qué hace la app

- Selector de campeones por rol.
- Resumen ejecutivo.
- Identidad de la composición.
- Fortalezas y debilidades.
- Plan de partida por fases.
- Sinergias y riesgos.
- Narrativa contextual adaptativa.
- Knowledge Layer v2 con playbooks explícitos.
- Motor estratégico que razona sobre dependencias, visión y choques de win conditions.
- Bans inteligentes que señalan los 5 campeones que más dificultan ejecutar el plan.
- Recomendación del último pick para cerrar composiciones de cuatro campeones.
- Comparador A/B de composiciones para ver cuál encaja mejor con el plan.

## Fuente de verdad

- `Draft Pool.xlsx` es la única fuente editable.
- La app lee el Excel directamente en tiempo de ejecución.
- Los datos repetidos del Excel se normalizan en memoria para compartir identidades, funciones, tempos y etiquetas.
- La Knowledge Layer añade reglas explícitas para profundizar el análisis sin duplicar la lógica en la UI.
- El motor estratégico añade deducciones causales sobre la composición.
- La capa de bans inteligentes prioriza los campeones que más rompen el plan.
- La capa de último pick sugiere la pieza que cierra mejor el draft.
- El comparador A/B permite guardar dos composiciones y contrastar su encaje.
- No hay una capa generada de JSON en `data/`.

## Estado actual

- La app ya está centrada en una única ruta de render.
- La selección, la persistencia y el análisis funcionan sobre la composición propia.
- La UI prioriza lectura rápida y bloques compactos.
- El dataset vive en una taxonomía compartida para reducir duplicidad.
- La narrativa contextual sale de reglas explícitas además de la lectura del Excel.
- El motor estratégico añade razonamiento sobre dependencias críticas y compatibilidad de planes.
- Los bans inteligentes priorizan los campeones que más rompen el plan.
- El último pick recomendado explica qué problema resuelve cada alternativa.
- El comparador A/B muestra cuál de dos composiciones encaja mejor con el plan.

## GitHub Pages

- `https://enigmapau-hash.github.io/rift-architect/`

## Regla de trabajo

No se abre un bloque nuevo hasta cerrar el anterior.

## Roadmap

Ver [`ROADMAP.md`](./ROADMAP.md) para la hoja de ruta completa.
