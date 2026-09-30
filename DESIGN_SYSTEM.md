# Rift Architect Design System v1

Este documento define la base visual común del producto. La regla es simple: cualquier pantalla nueva debe reutilizar estos componentes antes de inventar uno nuevo.

## Principios

- Leer en pocos segundos.
- Priorizar jerarquía antes que decoración.
- Separar bien estado positivo, riesgo, aviso e información.
- Mantener un mismo lenguaje visual en dashboard, simulador y futuros módulos.
- Evitar bloques de texto largos cuando una tarjeta o una barra pueden explicar mejor.

## Tokens semánticos

### Colores

- `--ds-success`: fortaleza, mejora, estado positivo.
- `--ds-warning`: aviso o riesgo moderado.
- `--ds-danger`: riesgo claro o problema.
- `--ds-info`: información general, datos base y estado neutro.
- `--ds-coach`: recomendaciones, guía y consejo táctico.
- `--ds-neutral`: texto secundario y estados sin carga semántica.

### Superficies

- `--ds-surface`: fondo principal de tarjeta.
- `--ds-surface-strong`: superficie más densa.
- `--ds-surface-soft`: superficie ligera.
- `--ds-surface-accent`: superficie de información destacada.
- `--ds-surface-success`, `--ds-surface-warning`, `--ds-surface-danger`, `--ds-surface-info`, `--ds-surface-coach`.

### Espaciado

Escala base:

- 4 px
- 8 px
- 12 px
- 16 px
- 24 px
- 32 px
- 40 px
- 48 px

### Bordes y sombras

- Radios: `sm`, `md`, `lg`, `xl`.
- Sombras: `--ds-shadow` y `--ds-shadow-soft`.

## Componentes

### Hero Card

Uso: bloque principal de identidad o resumen.

Partes:

- título
- subtítulo
- 2 a 4 metadatos clave
- chips de estado o identidad

### Metric Card

Uso: mostrar una métrica con valor y barra.

Partes:

- nombre de la métrica
- puntuación numérica
- barra de progreso
- detalle corto

### Advice Card

Uso: Coach y Strategic Advisor.

Partes:

- etiqueta de contexto
- título
- explicación corta
- badge semántico

### Timeline

Uso: plan de partida, lectura de fases o secuencia lógica.

Partes:

- etapa
- acción principal
- detalle breve

### Chip

Uso: identidades secundarias, estados, etiquetas y categorías.

### Severity Badge

Uso: priorizar problemas o estados importantes.

- `success`
- `warning`
- `danger`
- `info`
- `coach`

## Orden visual recomendado

1. Hero Card.
2. Fortalezas y riesgos.
3. Métricas.
4. Timeline de partida.
5. Coach.
6. Strategic Advisor.
7. Explicabilidad.
8. Composition Optimizer.

## Reglas de uso

- No usar el mismo peso visual para todo.
- No mezclar colores semánticos sin una razón.
- No mostrar objetos crudos en la UI.
- No duplicar componentes si ya existe uno equivalente.
- No añadir nuevos bloques de texto si se puede resumir en chip, badge, barra o tarjeta.

## Futuro

Este sistema debe crecer sin romper la coherencia de:

- Analysis Dashboard
- Composition Optimizer
- Champion Pool Architect
- AI Coach

