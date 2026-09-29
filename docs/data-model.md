# Rift Architect data model v0.4

## Objetivo

Mantener `Draft Pool.xlsx` como fuente de verdad y generar JSON para la PWA.

## Estado actual

El modelo publicado usa esta estructura base:

- `champion`
- `identity`
- `function`
- `tempo`
- `strengths[]`
- `weaknesses[]`
- `attributes` (si existe la hoja opcional)

## Reglas del modelo

- `identity`, `function` y `tempo` deben existir en origen.
- Si un dato falta, el problema debe detectarse en la exportación o en la auditoría, no en la interfaz.
- Las variantes de campeón comparten icono base mediante alias (por ejemplo, Kayn, Shaco o Varus).
- El JSON es el formato de distribución; el Excel sigue siendo la única fuente editable.

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

## Siguiente evolución

Cuando el motor de análisis esté listo, la salida visible debería centrarse en:

- Identidad principal.
- Identidades secundarias.
- Fortalezas.
- Carencias.
- Plan de juego.
