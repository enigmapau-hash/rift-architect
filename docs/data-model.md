# Rift Architect data model v0.3

## Objetivo

Mantener `Draft Pool.xlsx` como fuente de verdad y generar JSON para la PWA.

## Estado actual

El modelo publicado ahora mismo usa esta estructura base:

- `champion`
- `identity`
- `function`
- `tempo`
- `strengths[]`
- `weaknesses[]`

Si el Excel incluye una hoja de atributos, la información se fusiona en cada campeón como `attributes`.

## Hoja opcional de atributos

La exportación reconoce una hoja llamada una de estas formas:

- `09_Attributes`
- `Attributes`
- `Tabla Attributes`
- `Tabla Atributos`

Columnas recomendadas:

- `Champion`
- `Engage`
- `Disengage`
- `Frontline`
- `Peel`
- `Pick`
- `Poke`
- `Burst`
- `DPS`
- `Scaling`
- `Mobility`
- `Waveclear`
- `Siege`
- `Splitpush`
- `Objective Control`
- `Vision`
- `Confidence`

## Regla de diseño

- El Excel sigue siendo la única fuente editable.
- El JSON es solo formato de distribución.
- La PWA no debe depender del Excel en producción.
- Los atributos explícitos tienen prioridad frente a los atributos derivados por texto.

## Siguiente evolución

Cuando el Excel esté listo para el siguiente salto, la estructura debería dividirse en hojas más estables:

- `Champions`
- `Roles`
- `Attributes`
- `Synergies`
- `Counters`
- `Config`
