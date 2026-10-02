# Rift Architect

PWA para analizar **tu propia composición** de League of Legends a partir de `Draft Pool.xlsx`. El flujo real es directo: el Excel alimenta al motor de análisis e IA; no hay una capa JSON intermedia ni necesaria.

## Qué hace ahora

- Selector por rol con composición temporal.
- Executive Summary y Composition Story como vista principal.
- Knowledge Layer v3 con reglas explícitas de identidad, macro, visión, tempo, objetivos, victoria y derrota.
- Motor estratégico con razonamiento sobre dependencias críticas, redundancias, planes incompatibles, riesgos y picos de poder.
- Narrativa contextual con tono de coach.
- Bans inteligentes.
- Recomendación del último pick.
- Comparador A/B de composiciones.
- Banco de validación humana con drafts de referencia.
- Tests automáticos para análisis, identidad, selección, dataset, estrategia, bans, último pick, comparación, narrativa, conocimiento y story.

## Estado actual

La app ya está estable en la ruta principal de render y el trabajo actual se centra en tres cosas:

1. consolidar la calidad del razonamiento;
2. mantener limpia la base de código;
3. mantener la documentación sincronizada con la app real.

La fase actual está centrada en el **informe ejecutivo**: ordenar la lectura, quitar duplicidades, reducir texto innecesario y reforzar la jerarquía visual.

## Fuente de verdad

- `Draft Pool.xlsx` es la única fuente editable.
- La app lee el Excel en tiempo de ejecución.
- El motor IA analiza directamente esa composición en memoria.
- No existe una capa JSON intermedia para sincronizar datos.
- Los datos repetidos se normalizan en memoria.
- La Knowledge Layer y el motor estratégico añaden reglas y deducciones sin mover la lógica a la UI.

## Cómo usarla

La app se despliega como sitio estático en GitHub Pages:

- `https://enigmapau-hash.github.io/rift-architect/`

También puede abrirse con cualquier servidor estático local que sirva `index.html`.

## Documentación principal

- [`ROADMAP.md`](./ROADMAP.md)
- [`CHANGELOG.md`](./CHANGELOG.md)
- [`PROJECT_STATE.md`](./PROJECT_STATE.md)
- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)

## Regla de trabajo

No se abre un bloque nuevo hasta cerrar el anterior.