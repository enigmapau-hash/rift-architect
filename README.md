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
- Responsive compartido para PC, tablet y móvil.

## Sprint actual

- `docs/data-contract.md`
- `docs/analysis-engine.md`
- Motor de análisis v1 basado en el Excel.
- Resumen compacto: identidad principal, secundarias, fortalezas, carencias y plan de juego.

## Estructura de datos

- `data/index.json`
- `data/top.json`
- `data/jungle.json`
- `data/mid.json`
- `data/bot.json`
- `data/support.json`
- `data/attributes.json`

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
