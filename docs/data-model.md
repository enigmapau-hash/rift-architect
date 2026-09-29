# Rift Architect data model v0.2

## Objetivo

Mantener `Draft Pool.xlsx` como fuente de verdad y generar JSON para la PWA.

## Estado actual

El modelo publicado ahora mismo es compatible con esta forma:

- `champion`
- `identity`
- `function`
- `tempo`
- `strengths[]`
- `weaknesses[]`

La aplicación deriva un perfil numérico a partir de esos campos para alimentar el motor de análisis.

## Siguiente evolución

Cuando el Excel esté listo para el siguiente salto, la estructura debería dividirse en hojas más estables:

- `Champions`
- `Roles`
- `Attributes`
- `Synergies`
- `Counters`
- `Config`

## Regla de diseño

- El Excel sigue siendo la única fuente editable.
- El JSON es solo formato de distribución.
- La PWA no debe depender del Excel en producción.
