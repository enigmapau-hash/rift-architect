# Rift Architect · Project Context

## Qué es la app
Rift Architect es una PWA para analizar **tu propia composición** de League of Legends a partir de `Draft Pool.xlsx`.

La aplicación no está pensada para comparar de forma global contra el rival. La filosofía actual es:

- entender qué identidad tiene la composición;
- explicar cómo gana;
- mostrar qué hacer y qué evitar;
- proponer bans que protejan el plan;
- y, más adelante, recomendar picks que completen la propia composición.

## Objetivo del producto
Convertir una selección de 5 campeones en un **briefing estratégico rápido de leer**.

La meta de RC1 es que el usuario pueda entender en menos de un minuto:

1. qué composición ha construido;
2. cómo gana;
3. qué errores no puede cometer;
4. qué debe hacer por fases;
5. qué carencias tiene;
6. qué bans protegen mejor el plan;
7. qué tipo de pick completaría la composición.

## Fuente de verdad
`Draft Pool.xlsx` es la única fuente editable.

Flujo actual:

- el Excel se convierte a JSON;
- la PWA consume `data/index.json` y el resto de ficheros generados;
- GitHub Pages publica la versión visible.

## Estado funcional actual
### Ya hecho
- Selector modal por rol.
- Composition Story principal.
- Analysis Hub unificado.
- Executive Summary estable.
- Coach Intelligence con `StrategicPlan`.
- Draft Assistant básico en UI.
- Draft Assistant con necesidades agrupadas, impacto sobre el plan y bloques para picks/bans.
- Knowledge Layer validada al arrancar.
- Banco de pruebas del motor.
- El proyecto ya no depende de un asistente obsoleto; usa un modelo interno.

### En marcha
- Traducir necesidades a perfiles estratégicos.
- Traducir perfiles a clases de campeón.
- Traducir clases a candidatos concretos.
- Afinar el texto del Draft Assistant para que sea más ejecutivo y menos largo.

### Pendiente a medio plazo
- Pick Assistant completo.
- Ban Assistant más inteligente.
- Validación funcional con varias composiciones de referencia.
- Pulido visual y reducción de redundancias.
- Posible uso de perfiles estratégicos en el Excel.

## Diseño del análisis
La estructura de trabajo actual es:

`Analysis Engine -> Coach -> StrategicPlan -> Executive Summary -> Analysis Hub -> Draft Assistant`

### Piezas clave
- `analysisEngine.js`: construye el análisis base.
- `coachEngine.js`: genera el `StrategicPlan`.
- `executiveSummary.js`: resume el análisis en una lectura rápida.
- `draftAssistant.js`: detecta necesidades y orienta picks/bans.
- `analysis-draft-assistant-panel.js`: muestra el panel en la UI.

## Filosofía de diseño
- Primero analizar la propia composición.
- No convertir el producto en un comparador genérico del rival.
- Priorizar claridad, no cantidad de texto.
- Cada bloque debe aportar una función distinta.
- Si algo se repite, se elimina o se mueve a otro bloque.

## Regla de trabajo
Antes de cerrar un sprint:

- revisar consola;
- comprobar que no haya errores de referencias ni duplicados;
- probar composiciones reales;
- actualizar `README.md`;
- actualizar `ROADMAP.md`.

## Cómo retomar el proyecto en una nueva conversación
Si esta conversación se corta, el siguiente paso debe arrancar desde aquí:

1. revisar este archivo;
2. comprobar el estado del `Draft Assistant`;
3. seguir con la capa intermedia de **perfiles estratégicos**;
4. conectar esos perfiles con clases y campeones;
5. mantener la app centrada en la propia composición.

## Último estado conocido
El Draft Assistant ya muestra en pantalla:
- necesidades agrupadas por prioridad;
- impacto de cada necesidad sobre el plan;
- plan detectado;
- secciones separadas para necesidades, picks y bans.

El siguiente salto razonable es pasar de necesidades a **perfiles requeridos** antes de mapear campeones concretos.