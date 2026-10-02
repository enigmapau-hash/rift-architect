# Rift Architect — Estado del proyecto

## Naturaleza de la app
Rift Architect es una PWA para analizar una composición propia de League of Legends a partir de `Draft Pool.xlsx`. La idea central no es comparar drafts contra el rival, sino entender la propia composición, cómo gana, qué le falta y qué decisiones la hacen más sólida.

## Objetivo del proyecto
El objetivo es convertir la composición seleccionada en un briefing claro y accionable para la partida:

1. Entender qué composición se ha construido.
2. Saber cómo gana.
3. Ver qué debe hacer en early, mid y late.
4. Detectar errores críticos.
5. Sugerir bans que protejan el plan.
6. Preparar recomendaciones de pick cuando falte una pieza clave.

## Qué ya está hecho
- Selector modal por rol con composición temporal.
- Composition Story como vista principal.
- Analysis Hub unificado.
- Knowledge Layer separada del motor.
- Knowledge Layer v2 con playbooks explícitos para identidades y patrones.
- Motor de análisis con identidad, tempo, coherencia, win condition, fortalezas y debilidades.
- Coach con `StrategicPlan` único.
- Executive Summary estable.
- Narrativa contextual adaptativa basada en reglas.
- Motor estratégico que razona sobre dependencias, visión y choques de win conditions.
- Bans inteligentes con los 5 campeones que más dificultan ejecutar el plan.
- Recomendación del último pick con la mejor opción y alternativas útiles.
- Arranque guardado con bootloader único y overlay visible para errores reales de carga.

## En qué punto está ahora
La app ya funciona de forma estable al seleccionar 5 campeones. El foco actual es auditar, limpiar y simplificar la base de código antes de volver a crecer.

## Siguiente bloque de trabajo
El siguiente paso es una auditoría completa de estabilidad y limpieza:

- Selección de campeón.
- Cambio de campeón.
- Limpieza de composición.
- Persistencia al recargar.
- Análisis con 5 campeones.
- Re-cálculo al cambiar una pieza.
- Consola limpia.
- Responsive correcto.

## Pendiente por hacer
- Eliminar código viejo que ya no se use.
- Mantener una sola ruta de render.
- Revisar la documentación para que refleje la app real.
- Validar el sistema con composiciones reales de referencia.

## Reglas de trabajo
- Cada entrega debe incluir código, README, ROADMAP y auditoría técnica/funcional.
- No cerrar un sprint con errores de consola.
- No añadir más información si primero no mejora la claridad.
- La esencia de la app es analizar la propia composición, no hacer un comparador de rival.

## Cómo retomar en una nueva conversación
Si esta conversación se corta, seguir desde aquí:

- El proyecto ya tiene la base estable recuperada.
- El siguiente desarrollo debe respetar el estado actual y pasar por auditoría.
- Mantener la filosofía de analizar solo la composición propia.
- Antes de cerrar cualquier sprint, revisar consola, README y ROADMAP.
