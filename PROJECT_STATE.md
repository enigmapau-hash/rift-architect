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
- Motor de análisis con identidad, tempo, coherencia, win condition, fortalezas y debilidades.
- Coach con `StrategicPlan` único.
- Executive Summary estable tras restaurar helpers de confidencia.
- Draft Assistant base con necesidades, prioridades, picks y bans.
- Draft Assistant UI integrada en el Analysis Hub y ya visible con composiciones reales.
- README y ROADMAP actualizados de forma continua.

## En qué punto está ahora
La app ya funciona de forma estable al seleccionar 5 campeones. El foco actual no es corregir errores, sino aumentar la calidad de las recomendaciones.

## Siguiente bloque de trabajo
El siguiente paso previsto es evolucionar el Draft Assistant hacia una capa de perfiles estratégicos:

- StrategicPlan
- Necesidades
- Perfiles requeridos
- Clases
- Campeones

La idea es pasar de necesidades genéricas a perfiles de campeón más precisos, sin depender del rival.

## Pendiente por hacer
- Diseñar y conectar Strategic Profiles.
- Preparar el Excel para soportar más metadatos estratégicos.
- Traducir necesidades a perfiles y luego a campeones compatibles.
- Añadir un índice de confianza para cada recomendación.
- Seguir afinando el texto para que el panel sea más ejecutivo y compacto.
- Validar el sistema con composiciones reales de referencia.

## Reglas de trabajo
- Cada entrega debe incluir código, README, ROADMAP y auditoría técnica/funcional.
- No cerrar un sprint con errores de consola.
- No añadir más información si primero no mejora la claridad.
- La esencia de la app es analizar la propia composición, no hacer un comparador de rival.

## Cómo retomar en una nueva conversación
Si esta conversación se corta, seguir desde aquí:

- El proyecto ya tiene Analysis Hub, Coach y Draft Assistant funcionando.
- El siguiente desarrollo debe ser la capa de Strategic Profiles.
- Mantener la filosofía de analizar solo la composición propia.
- Antes de cerrar cualquier sprint, revisar consola, README y ROADMAP.
