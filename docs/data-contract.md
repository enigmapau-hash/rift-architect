# Data Contract v1

## Objetivo

Definir un modelo único y simple para que la aplicación, el motor de análisis y la IA trabajen con la misma información.

## Fuente de verdad

- `Draft Pool.xlsx` es la única fuente editable.
- La exportación genera JSON por rol.
- La interfaz nunca debe leer el Excel directamente en producción.

## Objeto canónico `Champion`

Todos los campeones deben exponer el mismo modelo:

```ts
Champion {
  id,
  displayName,
  role,
  icon,
  identity,
  function,
  tempo,
  strengths[],
  weaknesses[],
  attributes?
}
```

## Campos y uso

| Campo | Excel / origen | UI | Motor | IA | Estado |
|---|---|---:|---:|---:|---|
| `id` | generado | ✅ | ✅ | ✅ | obligatorio |
| `displayName` | nombre del campeón | ✅ | ✅ | ✅ | obligatorio |
| `role` | pestaña / tabla | ✅ | ✅ | ✅ | obligatorio |
| `icon` | alias del campeón | ✅ | ✅ | ✅ | obligatorio |
| `identity` | columna `Identity` | ✅ | ✅ | ✅ | obligatorio |
| `function` | columna `Function` | ✅ | ✅ | ✅ | obligatorio |
| `tempo` | columna `Tempo` | ✅ | ✅ | ✅ | obligatorio |
| `strengths[]` | columnas/etiquetas de fortalezas | ❌ | ✅ | ✅ | opcional |
| `weaknesses[]` | columnas/etiquetas de debilidades | ❌ | ✅ | ✅ | opcional |
| `attributes` | hoja opcional de atributos | ❌ | ✅ | ✅ | opcional |

## Reglas

1. Si un campo obligatorio falta en origen, es un problema de datos.
2. La interfaz no debe mezclar categorías ni inventar valores.
3. Variantes como Kayn, Shaco o Varus comparten el mismo icono base.
4. Los campos opcionales solo se usan cuando el Excel los proporciona.
5. No se añade información externa al contrato base.

## Qué ve cada capa

### UI
- Nombre.
- Identity.
- Function.
- Tempo.
- Icono.

### Motor
- Agrupa identidades.
- Resume fortalezas y carencias.
- Construye un bloque de análisis compacto.

### IA
- Explica la composición.
- Interpreta el resultado del motor.
- Responde preguntas de draft y ejecución.

## Resultado esperado

El contrato debe mantener la app simple:

- información concreta,
- datos homogéneos,
- sin exceso de texto,
- sin duplicar lógica entre UI, motor e IA.
