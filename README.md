# Rift Architect

PWA base para construir y analizar composiciones de League of Legends.

## Qué incluye esta primera versión

- Lectura directa del Excel `Draft Pool.xlsx`.
- Selector de campeones por rol.
- Vista de composición.
- Análisis básico de frontline, engage, daño, poke, teamfight, movilidad, control y escalado.
- Service worker y manifest para convertirlo en PWA.

## Cómo funciona

La app carga el Excel del repo y lee estas hojas:

- Tabla Top
- Tabla Jungla
- Tabla Mid
- Tabla Botline
- Tabla Support

La hoja `Tabla Composición` se usa como referencia del modelo de datos, pero la app ya trabaja con un motor propio en JavaScript.

## Siguiente paso

El siguiente paso es separar el Excel en un JSON limpio y añadir:
- sinergias entre campeones,
- counters,
- recomendación del mejor siguiente pick,
- y cálculo de condiciones de victoria.
