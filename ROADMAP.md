# Rift Architect Roadmap

## Hoja de ruta oficial

### Sprint 0: Base mínima v2
- Crear una UI nueva y mínima, sin reutilizar el renderer antiguo.
- Conservar el motor de análisis y el contrato como única fuente de datos.
- Arrancar con una sola tarjeta: Executive Summary.
- Verificar despliegue en Pages y consola limpia.
- Actualizar documentación de seguimiento en cada entrega.
- **En curso**.

### Sprint 1: Executive Summary
- Renderizar únicamente Executive Summary desde el contrato.
- Validar estructura visual y legibilidad.
- Corregir errores de consola hasta dejar la base estable.
- **Pendiente**.

### Sprint 2: Composition
- Añadir la tarjeta de composición.
- Mostrar identidad, tempo y plan base.
- **Pendiente**.

### Sprint 3: Identity
- Separar la lectura de identidad del resumen ejecutivo.
- **Pendiente**.

### Sprint 4: Strategic Engine
- Migrar el razonamiento estratégico en una tarjeta propia.
- **Pendiente**.

### Sprint 5: Knowledge Layer
- Integrar la lectura de conocimiento y contexto.
- **Pendiente**.

### Sprint 6: Strengths, Weaknesses y Timeline
- Añadir lectura estructurada de fortalezas, debilidades y ritmo temporal.
- **Pendiente**.

### Sprint 7: Bans, Last Pick y Comparison
- Integrar bloques de decisión final y comparación.
- **Pendiente**.

### Sprint 8: QA de estabilidad
- Probar la app mínima en Pages.
- Revisar consola y refresco de caché.
- Eliminar código muerto.
- **Pendiente**.

### Sprint 9: Calibración del motor
- Ajustar el relato del análisis sobre la nueva UI.
- **Pendiente**.

## Estado actual
- La v131 queda congelada como referencia funcional.
- La nueva línea de trabajo es una UI mínima v2 sobre `v132-dashboard-v2`.
- El motor de análisis, el contrato y los datos se conservan.
- El objetivo inmediato es dejar visible y estable la tarjeta de **Executive Summary**.

## Regla del proyecto

No se abre un nuevo bloque hasta cerrar el anterior.
