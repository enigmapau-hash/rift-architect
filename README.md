# Rift Architect

PWA para construir y entender composiciones de League of Legends a partir de `Draft Pool.xlsx`.

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
- El panel de análisis v2 ya es el único panel visible del resumen.
- El Core Engine v3.1 añade sinergias, dependencias, coherencia, condición de victoria y plan priorizado.
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
- [`CHANGELOG.md`](./CHANGELOG.md)

Objetivo del hito:

- Un motor de análisis compacto, basado solo en el Excel.
- Una pantalla principal que se entienda en segundos.
- Un contrato estable para la futura IA.

Core engine en curso:

- `js/engine/identityEngine.js`
- `js/engine/strengthEngine.js`
- `js/engine/weaknessEngine.js`
- `js/engine/tempoEngine.js`
- `js/engine/synergyEngine.js`
- `js/engine/dependencyEngine.js`
- `js/engine/coherenceEngine.js`
- `js/engine/winConditionEngine.js`
- `js/engine/planEngine.js`
- `js/engine/analysisEngine.js`
- `js/analysis-panel.js`

Knowledge layer:

- `knowledge/identity-relations.js`
- `knowledge/synergies.js`
- `knowledge/patterns.js`
- `knowledge/dependencies.js`
- `knowledge/conflicts.js`
- `knowledge/win-conditions.js`
- `knowledge/validator.js`
- `knowledge/index.js`

Testing:

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

## Roadmap

- Fase 1: base técnica y publicación.
- Fase 2: selección y composición.
- Fase 3: motor de análisis.
- Fase 4: asistente IA.
- Fase 5: coach conversacional.
