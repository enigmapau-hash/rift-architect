# Rift Architect · Project State

> Documento de continuidad para retomar el proyecto en una nueva conversación.

## Naturaleza de la app

Rift Architect es una PWA para analizar **la propia composición** de League of Legends a partir de `Draft Pool.xlsx`.

La pregunta central sigue siendo:

**“Con esta composición, ¿cómo debo jugar para maximizar mis opciones de ganar?”**

## Hoja de ruta oficial

### Hito 1: Base estable
- Una sola ruta de render.
- Consola limpia.
- Sin paneles experimentales visibles.
- Responsive estable.
- **Cerrado**.

### Hito 2: Pantalla principal terminada
- Executive Summary.
- Identidad.
- Fortalezas.
- Debilidades.
- Plan de partida.
- Sinergias y Riesgos.
- **Cerrado**.

### Hito 3: IA refinada
- Mejorar lo que ya existe.
- Más claridad en las salidas del motor.
- Sin crear nuevas pantallas.

### Hito 4: Base de conocimiento madura
- Excel más completo.
- Normalización y validación más estrictas.
- Más señales útiles por composición.

### Hito 5: Beta 1.0
- Experiencia estable.
- Lectura clara en móvil, tablet y escritorio.
- Sin regresiones conocidas.

### Hito 6: Release Candidate
- Congelar funciones.
- Corregir bugs.
- Pulir rendimiento y accesibilidad.

### Hito 7: Versión 1.0
- Revisión final.
- Documentación cerrada.
- Entrega estable del producto.

## Estado actual

### Ya resuelto
- Selector de campeones por rol.
- Composition Story resumida.
- Analysis Engine unificado.
- Coach base con `StrategicPlan`.
- Draft Assistant básico.
- Documentación y roadmap alineados.
- Hito 1 cerrado.
- Hito 2 cerrado.

### Lo que hace ahora el sistema
- Analiza la composición seleccionada.
- Construye un `StrategicPlan`.
- Genera un resumen ejecutivo corto.
- Genera plan por fases, checklist y errores críticos.
- Deriva necesidades de composición y recomendaciones de picks/bans.
- Re-renderiza la Story cuando cambia el borrador guardado.
- Muestra tarjetas fijas, compactas y visuales.
- Mantiene la cabecera limpia: solo build visible.
- El botón **Actualizar** quedó oculto.
- La Story mantiene la misma jerarquía en móvil, tablet y escritorio.
- La presentación prioriza barras, chips e indicadores visuales frente a bloques largos de texto.
- La interfaz vuelve a centrarse en una lectura rápida de la composición propia.
- El resumen ejecutivo principal se mantiene en un formato corto y tangible.
- La pantalla principal ya muestra Executive Summary, Identidad, Fortalezas, Debilidades, Plan, Sinergias y Riesgos.

## Arquitectura mental actual

`analysisEngine` → `coachEngine` → `strategicPlan` → `needEngine` → `strategicProfiles` → `narrativeEngine` → `draft assistant`

La fuente de verdad estratégica está en el análisis de la propia composición.

## Lo siguiente por hacer

1. Empezar el Hito 3.
2. Reducir cualquier redundancia residual.
3. Validar composiciones reales en distintos tamaños de pantalla.
4. Reforzar auditoría técnica después de cada cambio.

## Regla del proyecto

- Cada entrega debe actualizar código, README, ROADMAP y `docs/PROJECT_STATE.md`.
- No cerrar un sprint con errores de consola conocidos.
- Mantener la filosofía: **analizar la propia composición**.
- No convertir la app en un comparador genérico de drafts.

## Estado resumido

**Fase actual:** Hito 2 cerrado / Pantalla principal terminada

**Meta inmediata:** dejar la pantalla principal como experiencia finalizada, y pasar al Hito 3 sin abrir otros bloques.