# Rift Architect · Project Context

## Qué es la app
Rift Architect es una PWA para analizar **tu propia composición** de League of Legends a partir de `Draft Pool.xlsx`.

La app ya no está en fase de exploración abierta. La dirección actual es consolidar una ruta estable de análisis, razonamiento y narrativa sobre la composición propia, mientras se pule la presentación para que el informe sea homogéneo, claro y rápido de escanear.

## Objetivo del producto
Convertir una selección de 5 campeones en un briefing estratégico rápido de leer.

La meta es que el usuario pueda entender en menos de un minuto:

1. qué composición ha construido;
2. cómo gana;
3. qué errores no puede cometer;
4. qué debe hacer por fases;
5. qué carencias tiene;
6. qué bans protegen mejor el plan;
7. qué tipo de pick completaría la composición.

## Fuente de verdad
`Draft Pool.xlsx` es la única fuente editable.

La app consume ese Excel en tiempo de ejecución y normaliza los datos en memoria para compartir identidades, funciones, tempos y etiquetas repetidas.

## Estado funcional actual
### Ya hecho
- Selector modal por rol.
- Composition Story principal.
- Analysis Hub unificado.
- Executive Summary estable.
- Knowledge Layer v3 con reglas explícitas.
- Strategic Engine con razonamiento causal.
- Ban recommendations.
- Last pick recommendations.
- Comparador A/B.
- Banco de validación humana.
- Tests automáticos.

### En curso
- Mejorar la profundidad del razonamiento.
- Ajustar la narrativa para que suene más a coach.
- Ordenar mejor el informe ejecutivo para que se lea de un vistazo.
- Cerrar la reconstrucción RC2 del dashboard.
- Cerrar el último pulido visual.
- Afinar foco, contraste y navegación por teclado.
- Mantener la documentación sincronizada con la app real.
- Limpiar restos de código legado.
- Cerrar la QA con muchas composiciones reales.

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
- actualizar README, ROADMAP y los documentos de contexto.

## Cómo retomar el proyecto en una nueva conversación
Si esta conversación se corta, seguir desde aquí:

1. revisar este archivo;
2. comprobar el estado del Analysis Hub y del Strategic Engine;
3. mantener la app centrada en la propia composición;
4. no abrir nuevas pantallas antes de cerrar la base actual.
