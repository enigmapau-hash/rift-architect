# Rift Architect Roadmap

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
- Sinergias y riesgos.
- **Cerrado**.

### Hito 3: Profundidad del razonamiento
- Dependencias en cascada.
- Riesgo de ejecución.
- Robustez de la composición.
- Flexibilidad del draft.
- Condiciones de derrota.
- Planes de contingencia.
- Adaptación según rival.
- **En curso**.

### Hito 4: Knowledge Layer v3
- Identidades explícitas.
- Matchups entre estilos.
- Reglas macro.
- Prioridades de objetivos.
- Patrones de visión.
- Ventanas de tempo.
- Errores habituales.
- Condiciones de victoria y derrota.
- **En curso**.

### Hito 5: Presentación del análisis
- Informe ejecutivo estructurado por tarjetas.
- Contrato de datos estable entre motor y renderer.
- Menos duplicidad de texto.
- Mejor jerarquía visual.
- Más legibilidad en desktop y móvil.
- Modal de selección más homogéneo.
- Último pulido visual.
- Accesibilidad.
- Dashboard compacto sin huecos muertos.
- RC2: reconstrucción completa del renderer del informe.
- **Cerrado**.

### Hito 6: QA de estabilidad
- Probar decenas de composiciones.
- Revisar consola.
- Verificar refresh del Excel.
- Validar todas las secciones del informe.
- Eliminar código muerto.
- Revisar documentación.
- **En curso**.

### Hito 7: RC3 — Validación funcional
- Banco de composiciones de referencia.
- Cobertura de engage, poke, split push, front-to-back, protect the carry y pick.
- Cobertura de early, late, snowball, escalado e híbridas.
- Detección de composiciones con poca sinergia o riesgos claros.
- Validación de que el informe refleja las señales correctas por arquetipo.
- Comparación explícita entre señales esperadas y señales detectadas.
- **En curso**.

### Hito 8: RC4 — Calibración del motor
- Unificar la historia entre Executive Summary, Identidad, Plan y Lectura estratégica.
- Aumentar la profundidad de las inferencias.
- Reducir redundancias entre tarjetas.
- Calibrar pesos y prioridades.
- Pulir el lenguaje para hacerlo más ejecutivo y accionable.
- **En preparación**.

### Hito 9: Beta 1.0
- Experiencia estable.
- Lectura clara en móvil, tablet y escritorio.
- Sin regresiones conocidas.
- Documentación cerrada.

### Hito 10: Release Candidate
- Congelar funciones.
- Corregir bugs.
- Pulir rendimiento y accesibilidad.

### Hito 11: Versión 1.0
- Revisión final.
- Entrega estable del producto.

## Estado actual
- La app ya funciona con la cadena actualizada y con el flujo real de datos: `Draft Pool.xlsx` alimenta al motor de análisis e IA.
- No hay una capa JSON intermedia que sincronizar; los datos se leen del Excel y se normalizan en memoria.
- El trabajo real ahora está centrado en la calibración del relato, la QA, el contrato de datos y la limpieza de código.
- La build visible actual es **v131** y el estado funcional quedó estabilizado tras resolver la regresión del contrato.
- La Knowledge Layer no aparece como tarjeta propia; sus señales se integran en la tarjeta de **Lectura estratégica**.
- El siguiente paso es seguir afinando la consistencia del análisis y cerrar la validación sobre el banco de composiciones de referencia.

## Regla del proyecto

No se abre un nuevo bloque hasta cerrar el anterior.
