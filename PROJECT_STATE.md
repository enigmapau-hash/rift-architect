# Rift Architect — Estado del proyecto

## Naturaleza de la app
Rift Architect es una PWA para analizar **tu propia composición** de League of Legends a partir de `Draft Pool.xlsx`.

La idea central no es comparar drafts contra el rival, sino entender la propia composición: cómo gana, qué le falta y qué decisiones la hacen más sólida. El flujo de datos es directo: el Excel alimenta al motor de análisis e IA; no hay una capa JSON intermedia.

## Objetivo del proyecto
El objetivo es convertir la composición seleccionada en un briefing claro y accionable para la partida:

1. Entender qué composición se ha construido.
2. Saber cómo gana.
3. Ver qué debe hacer en early, mid y late.
4. Detectar errores críticos.
5. Sugerir bans que protejan el plan.
6. Preparar recomendaciones de pick cuando falte una pieza clave.
7. Comparar dos composiciones para ver cuál encaja mejor con el plan.
8. Detectar dependencias críticas, redundancias, planes incompatibles y picos de poder.

## Qué ya está hecho
- Selector modal por rol con composición temporal.
- Composition Story como vista principal.
- Analysis Hub unificado.
- Knowledge Layer separada del motor.
- Knowledge Layer v3 con reglas explícitas para identidad, macro, visión, tempo, objetivos, victoria y derrota.
- Motor de análisis con identidad, tempo, coherencia, win condition, fortalezas y debilidades.
- Coach con `StrategicPlan` único.
- Executive Summary estable.
- Narrativa contextual adaptativa basada en reglas.
- Motor estratégico que razona sobre dependencias, visión, contingencia y choques de win conditions.
- Detección de dependencias críticas, redundancias, planes incompatibles y picos de poder.
- Bans inteligentes con los 5 campeones que más dificultan ejecutar el plan.
- Recomendación del último pick con la mejor opción y alternativas útiles.
- Comparador A/B para contrastar dos composiciones guardadas.
- Contrato de datos del análisis para que el renderer solo consuma una capa estable.
- RC2 estabilizada: el dashboard ya no entra en bucle de render y el observer solo reacciona a cambios reales de composición.
- RC3 iniciada: banco de composiciones de referencia y validación funcional de señales del informe.
- Arranque guardado con bootloader único y overlay visible para errores reales de carga.
- Suite de tests automáticos para evitar regresiones.

## En qué punto está ahora
La app ya funciona de forma estable al seleccionar 5 campeones. El foco actual es cerrar la validación funcional RC3 con un banco de composiciones de referencia, mantener el informe ejecutivo estructurado, seguir auditando el contrato de datos, y terminar el último pulido visual y la accesibilidad. Cada motor debe reflejar su salida en una tarjeta clara y la lectura debe ser compacta y coherente.

## Siguiente bloque de trabajo
El siguiente paso es una validación funcional RC3 con un banco de composiciones de referencia:

- probar composiciones de engage;
- probar composiciones de poke;
- probar split push;
- probar front-to-back;
- probar protect the carry;
- probar pick comps;
- probar early game y snowball;
- probar late game y escalado;
- probar híbridas;
- probar composiciones de poca sinergia;
- probar composiciones con riesgos claros;
- comparar el resultado del informe con la expectativa temática de cada caso.

## Pendiente por hacer
- Eliminar código viejo que ya no se use.
- Mantener una sola ruta de render.
- Revisar la documentación para que refleje la app real.
- Validar el sistema con composiciones de referencia.

## Reglas de trabajo
- Cada entrega debe incluir código, README, ROADMAP y documentación técnica actualizada.
- No cerrar un sprint con errores de consola.
- No añadir más información si primero no mejora la claridad.
- La esencia de la app es analizar la propia composición, no hacer un comparador genérico del rival.

## Cómo retomar el proyecto en una nueva conversación
Si esta conversación se corta, seguir desde aquí:

- El proyecto ya tiene la base estable recuperada.
- El siguiente desarrollo debe respetar el estado actual y pasar por auditoría.
- Mantener la filosofía de analizar solo la composición propia.
- Antes de cerrar cualquier sprint, revisar consola, README, ROADMAP y documentación base.
