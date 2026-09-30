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
- Muestra un panel de Draft Assistant con:
  - necesidades detectadas,
  - impacto sobre el plan,
  - prioridades,
  - picks y bans en formato razonado.

## Arquitectura mental actual

`analysisEngine` → `coachEngine` → `strategicPlan` → `executiveSummary` + `analysis hub` + `draft assistant`

La fuente de verdad estratégica está en el análisis de la propia composición, no en el equipo rival.

## Lo siguiente por hacer

### Próximo bloque lógico
1. Introducir **Strategic Profiles** como capa intermedia entre necesidad y campeón.
2. Traducir necesidades a perfiles de campeón.
3. Mapear perfiles a campeones concretos.
4. Mejorar la explicación de por qué un pick o un ban encaja con el plan.
5. Usar `docs/strategic-profiles.md` como especificación base de esa capa.

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

**Fase actual:** Draft Assistant / Strategic Profiles

**Meta inmediata:** pasar de necesidades a perfiles y después a campeones concretos.
