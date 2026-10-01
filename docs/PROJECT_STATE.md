# Rift Architect · Project State

> Documento de continuidad para retomar el proyecto en una nueva conversación.

## Naturaleza de la app

Rift Architect es una PWA para analizar **la propia composición** de League of Legends a partir de `Draft Pool.xlsx`.

La pregunta central sigue siendo:

**“Con esta composición, ¿cómo debo jugar para maximizar mis opciones de ganar?”**

## Estado actual

### Ya resuelto
- Selector de campeones por rol.
- Composition Story resumida.
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
- Re-renderiza la Story cuando cambia el borrador guardado de la composición.
- Muestra seis tarjetas fijas, cada una con un resumen corto y líneas compactas.
- Mantiene la cabecera limpia: solo build visible.
- El botón **Actualizar** quedó oculto para no ensuciar la UI.
- La Story mantiene la misma jerarquía en móvil, tablet y escritorio.
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

1. Pulir el contenido de las tarjetas fijas.
2. Reducir texto redundante en algunas tarjetas.
3. Validar más composiciones reales en distintos tamaños de pantalla.
4. Reforzar auditoría técnica después de cada cambio.

## Regla del proyecto

- Cada entrega debe actualizar código, README, ROADMAP y `docs/PROJECT_STATE.md`.
- No cerrar un sprint con errores de consola conocidos.
- Mantener la filosofía: **analizar la propia composición**.
- No convertir la app en un comparador genérico de drafts.

## Estado resumido

**Fase actual:** Beta 0.27 / Responsive Fixed Cards

**Meta inmediata:** mantener la Story en tarjetas fijas compactas y responsive, asegurando que el análisis aparece al completar los 5 campeones en móvil, tablet y escritorio.
