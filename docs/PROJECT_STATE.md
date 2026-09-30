# Rift Architect · Project State

> Documento de continuidad para retomar el proyecto en una nueva conversación.

## Naturaleza de la app

Rift Architect es una PWA para analizar **la propia composición** de League of Legends a partir de `Draft Pool.xlsx`.

La idea central no es comparar dos drafts ni analizar al rival. La app responde a esta pregunta:

**“Con esta composición, ¿cómo debo jugar para maximizar mis opciones de ganar?”**

## Objetivos del producto

- Convertir 5 campeones en una lectura clara y accionable.
- Mostrar identidad, condición de victoria, perfil táctico y plan de partida.
- Explicar qué hacer en early, mid y late.
- Señalar errores críticos y prioridades.
- Sugerir bans que protejan el plan de juego.
- Recomendar picks cuando falte una pieza de la propia composición.

## Estado actual

### Ya resuelto
- Selector de campeones por rol.
- Composition Story.
- Analysis Hub unificado.
- Executive Summary estable.
- Coach con `StrategicPlan` central.
- Draft Assistant básico en UI.
- Documentación de trabajo y roadmap al día.
- Consola limpia tras los últimos errores de helpers y referencias.

### Lo que hace ahora el sistema
- Analiza la composición seleccionada.
- Construye un `StrategicPlan`.
- Genera resumen ejecutivo, perfil de ejecución, plan por fases, checklist y errores críticos.
- Deriva un bloque de necesidades desde un **Need Engine** propio.
- Traduce esas necesidades a perfiles estratégicos y recomendaciones de picks/bans.
- Convierte el análisis en una **Narrative Engine** corta y ejecutiva:
  - cómo gana,
  - qué necesita,
  - qué le falta,
  - qué solución tiene,
  - qué debe evitar.
- Añade una línea explícita de razonamiento para explicar el porqué de la necesidad principal.
- Muestra un badge visible de build/versión en la cabecera para comprobar de un vistazo qué despliegue está cargado.
- Muestra el Draft Assistant como una beta 0.3 de una sola historia:
  - respuesta arriba,
  - detalle completo plegado,
  - menos ruido técnico visible,
  - más sensación de producto terminado.

## Arquitectura mental actual

`analysisEngine` → `coachEngine` → `strategicPlan` → `needEngine` → `strategicProfiles` → `narrativeEngine` → `draft assistant`

La fuente de verdad estratégica está en el análisis de la propia composición, no en el equipo rival.

## Lo siguiente por hacer

### Próximo bloque lógico
1. Consolidar el **Explainability Engine** como soporte estable de la narrativa.
2. Mantener el Draft Assistant en formato beta de una sola historia.
3. Revisar qué parte del Excel ya cubre esas necesidades sin añadir campos nuevos.
4. Mejorar la explicación de por qué un pick o un ban encaja con el plan.
5. Mantener la interfaz compacta y fácil de leer.

### Mejoras pendientes
- Afinar la UX del Draft Assistant para que sea más ejecutiva.
- Reducir texto redundante en algunas tarjetas.
- Validar más composiciones reales.
- Reforzar auditoría técnica después de cada cambio.

## Reglas de trabajo

- Cada sprint debe incluir desarrollo, auditoría, README y ROADMAP.
- No cerrar un sprint con errores de consola conocidos.
- Mantener la filosofía: **analizar la propia composición**.
- No convertir la app en un comparador genérico de drafts.

## Cómo retomar este proyecto en una nueva conversación

1. Abrir este archivo: `docs/PROJECT_STATE.md`.
2. Revisar `README.md` y `ROADMAP.md`.
3. Continuar desde el bloque “Lo siguiente por hacer”.

## Estado resumido

**Fase actual:** Beta 0.3 / One Story

**Meta inmediata:** que la parte superior se lea como una sola historia clara, con la respuesta primero y el detalle plegado debajo.
