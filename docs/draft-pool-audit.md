# Draft Pool Audit

## Objetivo

Mantener `Draft Pool.xlsx` limpio, consistente y fácil de usar como fuente de verdad.

## Qué valida el generador

- Hojas de rol: `Tabla Top`, `Tabla Jungla`, `Tabla Mid`, `Tabla Botline`, `Tabla Support`.
- Campos obligatorios por campeón:
  - `Identity`
  - `Function`
  - `Tempo`
- Campeones duplicados dentro de una misma hoja.
- Variantes que comparten icono base:
  - Kayn
  - Shaco
  - Varus
  - Nunu & Willump

## Normalización aplicada

### Identity
Se convierte a una forma canónica para evitar variantes equivalentes:

- `Front to Back`
- `Engage`
- `Pick`
- `Poke`
- `Teamfight`
- `Splitpush`
- `Dive`
- `Skirmish`
- `Protect`
- `Control`
- `Siege`
- `Catch`
- `Flexible`

### Tempo
Se normaliza a valores simples:

- `Early`
- `Mid`
- `Late`
- `Early/Mid`
- `Mid/Late`
- `Early/Late`
- `Early/Mid/Late`
- `Sin definir`

## Salida de auditoría

El generador escribe:

- `data/audit.json`

Ese fichero resume:

- campeones por hoja,
- avisos detectados,
- campos vacíos,
- duplicados,
- problemas de consistencia.

## Regla del proyecto

Si la auditoría detecta un problema, la corrección se hace en el Excel o en la normalización de datos, no en la interfaz.
