# Atributos de campeón

Plantilla para la hoja `09_Attributes` / `Attributes` del Excel.

## Reglas

- Una fila por campeón.
- Cada valor de atributo va de `0` a `5`.
- `Confidence` va de `0` a `100`.
- El nombre del campeón debe coincidir con el nombre usado en las hojas de rol.
- Si un valor está vacío, el generador lo ignora.

## Columnas

| Champion | Engage | Disengage | Frontline | Peel | Pick | Poke | Burst | DPS | Scaling | Mobility | Waveclear | Siege | Splitpush | Objective Control | Vision | Confidence |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ChampionName | 0-5 | 0-5 | 0-5 | 0-5 | 0-5 | 0-5 | 0-5 | 0-5 | 0-5 | 0-5 | 0-5 | 0-5 | 0-5 | 0-5 | 0-5 | 0-100 |

## Ejemplo de formato

| Champion | Engage | Disengage | Frontline | Peel | Pick | Poke | Burst | DPS | Scaling | Mobility | Waveclear | Siege | Splitpush | Objective Control | Vision | Confidence |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Shen | 5 | 4 | 5 | 5 | 2 | 0 | 1 | 2 | 4 | 2 | 2 | 1 | 1 | 4 | 3 | 90 |
| Jinx | 0 | 0 | 0 | 0 | 2 | 2 | 2 | 5 | 5 | 4 | 1 | 1 | 0 | 4 | 1 | 85 |

## Cómo se usa

1. Añade o renombra la hoja del Excel como `09_Attributes`.
2. Pega esta estructura de columnas.
3. Rellena las filas de campeones.
4. Sube el Excel al repositorio.
5. GitHub Actions generará el JSON automáticamente.
