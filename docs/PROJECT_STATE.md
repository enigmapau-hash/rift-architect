# Rift Architect · Project State

> Documento de continuidad para retomar el proyecto en una nueva conversación.

## Naturaleza de la app

Rift Architect es una PWA para analizar **la propia composición** de League of Legends a partir de `Draft Pool.xlsx`.

La pregunta central sigue siendo:

**“Con esta composición, ¿cómo debo jugar para maximizar mis opciones de ganar?”**

## Estado actual

### Ya resuelto
- Selector de campeones por rol.
- Composition Story simplificada.
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
- Convierte el análisis en una **Narrative Engine** corta y ejecutiva.
- Añade una línea explícita de razonamiento para explicar el porqué de la necesidad principal.
- Abre el análisis completo de cada tarjeta en una **ventana modal dedicada**.
- Mantiene la cabecera limpia: solo build visible.
- La pantalla principal sigue la arquitectura de información fija:
  - Tu composición,
  - Plan de victoria,
  - Prioridades,
  - Riesgos,
  - Draft,
  - Análisis avanzado.

## Arquitectura mental actual

`analysisEngine` → `coachEngine` → `strategicPlan` → `needEngine` → `strategicProfiles` → `narrativeEngine` → `draft assistant`

La fuente de verdad estratégica está en el análisis de la propia composición, no en el equipo rival.

## Lo siguiente por hacer

1. Terminar de pulir el contenido del modal.
2. Reducir texto redundante en algunas tarjetas.
3. Validar más composiciones reales.
4. Reforzar auditoría técnica después de cada cambio.

## Regla del proyecto

- Cada entrega debe actualizar código, README, ROADMAP y `docs/PROJECT_STATE.md`.
- No cerrar un sprint con errores de consola conocidos.
- Mantener la filosofía: **analizar la propia composición**.
- No convertir la app en un comparador genérico de drafts.

## Estado resumido

**Fase actual:** Beta 0.21 / Modal Analysis Fix

**Meta inmediata:** que al pulsar una tarjeta se abra el modal correcto con el análisis completo de esa sección.
