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
- Analysis Engine unificado.
- Coach base con `StrategicPlan`.
- Draft Assistant básico.
- Documentación y roadmap al día.

### Lo que hace ahora el sistema
- Analiza la composición seleccionada.
- Construye un `StrategicPlan`.
- Genera resumen ejecutivo, plan por fases, checklist y errores críticos.
- Deriva necesidades de composición y recomendaciones de picks/bans.
- Re-renderiza la Story cuando cambia el borrador guardado.
- Muestra tarjetas fijas, compactas y visuales.
- Mantiene la cabecera limpia: solo build visible.
- El botón **Actualizar** quedó oculto.
- La Story mantiene la misma jerarquía en móvil, tablet y escritorio.
- La presentación prioriza barras, chips e indicadores visuales frente a bloques largos de texto.
- La interfaz vuelve a centrarse en una lectura rápida de la composición propia.
- El resumen ejecutivo principal vuelve a ser una pieza compacta de cuatro bloques: identidad, fortalezas, debilidades y plan.

## Arquitectura mental actual

`analysisEngine` → `coachEngine` → `strategicPlan` → `needEngine` → `strategicProfiles` → `narrativeEngine` → `draft assistant`

La fuente de verdad estratégica está en el análisis de la propia composición.

## Lo siguiente por hacer

1. Unificar todavía más los indicadores visuales.
2. Reducir la redundancia entre bloques.
3. Validar más composiciones reales en distintos tamaños de pantalla.
4. Reforzar auditoría técnica después de cada cambio.

## Regla del proyecto

- Cada entrega debe actualizar código, README, ROADMAP y `docs/PROJECT_STATE.md`.
- No cerrar un sprint con errores de consola conocidos.
- Mantener la filosofía: **analizar la propia composición**.
- No convertir la app en un comparador genérico de drafts.

## Estado resumido

**Fase actual:** Beta 0.43 / Executive Summary 2.0

**Meta inmediata:** mantener la Story en tarjetas fijas compactas y visuales, y dejar el resumen ejecutivo principal en un formato simple, tangible y funcional.