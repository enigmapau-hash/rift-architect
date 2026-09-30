# Rift Architect

PWA para construir y entender una composición de League of Legends a partir de `Draft Pool.xlsx`.

## Fuente de verdad

- `Draft Pool.xlsx` es la única fuente editable.
- Un GitHub Action convierte el Excel a JSON en cada push a `main`.
- La PWA consume `data/index.json` y los ficheros generados en `data/`.
- GitHub Pages publica la versión visible del proyecto.

## Estado actual

- Selector modal por rol.
- Tarjetas de composición compactas.
- Iconos oficiales de Riot con alias para variantes como Kayn, Shaco o Varus.
- Identidad, función y tempo visibles en selector y tarjetas.
- La composición se reinicia al recargar; no hay persistencia automática.
- Modal de selección estabilizado con controles nativos.
- La vista principal es ahora **Composition View**, estructurada en hero, plan, fortalezas, riesgos, explicación e IA.
- La IA resume la composición en lenguaje natural: qué es, cómo gana, qué debe evitar y qué te recomienda hacer.
- La IA también ofrece preguntas rápidas dentro de la vista para profundizar sin jerga.
- Fortalezas, riesgos, métricas, plan, coach, advisor y explicabilidad se muestran en bloques separados.
- La lectura está pensada para entender tu composición en pocos segundos.
- El **Composition Optimizer** permite probar swaps internos y priorizar mejoras.
- La Knowledge Layer separa identidad, sinergias, patrones, dependencias, conflictos y win conditions del motor.
- La Knowledge Layer se valida al arrancar para detectar incoherencias antes de usar la IA.
- Existe un banco de pruebas del motor con composiciones de referencia, edge cases, cobertura de patrones y dependencias, y medición básica de tiempo.
- Se añadió un `data/index.json` mínimo para evitar 404 en Pages y un icono SVG como favicon.
- Responsive compartido para PC, tablet y móvil.

## Hito 2 — Core Engine v0.5

Documentación base del hito:

- [`docs/product-vision.md`](./docs/product-vision.md)
- [`docs/data-contract.md`](./docs/data-contract.md)
- [`docs/draft-pool-audit.md`](./docs/draft-pool-audit.md)
- [`docs/attribute-catalog.md`](./docs/attribute-catalog.md)
- [`docs/analysis-engine.md`](./docs/analysis-engine.md)
- [`docs/knowledge-layer.md`](./docs/knowledge-layer.md)
- [`docs/testing.md`](./docs/testing.md)
- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)
- [`CHANGELOG.md`](./CHANGELOG.md)

## Motor y UI principales

- `js/analyzer.js`
- `js/composition-visual-panel.js`
- `js/engine/analysisEngine.js`
- `js/engine/comparisonEngine.js`
- `js/engine/simulationEngine.js`
- `js/engine/explainabilityEngine.js`
- `js/engine/coachEngine.js`
- `js/engine/strategicAdvisor.js`
- `js/engine/planEngine.js`
- `js/engine/identityEngine.js`
- `js/engine/strengthEngine.js`
- `js/engine/weaknessEngine.js`
- `js/engine/tempoEngine.js`
- `js/engine/synergyEngine.js`
- `js/engine/dependencyEngine.js`
- `js/engine/coherenceEngine.js`
- `js/engine/winConditionEngine.js`

## Knowledge layer

- `knowledge/identity-relations.js`
- `knowledge/synergies.js`
- `knowledge/patterns.js`
- `knowledge/dependencies.js`
- `knowledge/conflicts.js`
- `knowledge/win-conditions.js`
- `knowledge/validator.js`
- `knowledge/index.js`

## Testing

- `tests/index.html`
- `tests/engineValidation.js`
- `tests/compositions/*.json`

## Estructura de datos

- `data/index.json`
- `data/top.json`
- `data/jungle.json`
- `data/mid.json`
- `data/bot.json`
- `data/support.json`
- `data/attributes.json`
- `data/audit.json`

## Hoja opcional de atributos

Si añades una hoja `09_Attributes` o `Attributes`, el generador la detecta y mezcla esos valores en cada campeón.

Plantilla exacta:

- [`docs/attributes-template.md`](./docs/attributes-template.md)

## Scripts

```bash
npm install
npm run generate:data
```

## GitHub Pages

- `https://enigmapau-hash.github.io/rift-architect/`

## Roadmap

Ver [`ROADMAP.md`](./ROADMAP.md) para la hoja de ruta completa.
