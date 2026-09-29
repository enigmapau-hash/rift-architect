# Analysis Engine

## Objetivo

Definir una capa de análisis simple, estable y basada solo en la información del Excel.

## Entradas

El motor trabaja con el mismo objeto de campeón en todos los roles:

- `champion`
- `identity`
- `function`
- `tempo`
- `strengths[]`
- `weaknesses[]`
- `attributes` cuando existan

## Qué debe detectar

### Identidad principal
La identidad que mejor representa la composición.

Regla inicial:
- Se toma la identidad más repetida entre los campeones seleccionados.
- Si hay empate, se prioriza la identidad que aparece en más roles clave.
- Si sigue habiendo empate, se usa la primera identidad dominante encontrada.

### Identidades secundarias
Identidades presentes en la composición que no son la principal.

### Fortalezas
Conceptos que aparecen reforzados por varios campeones o por atributos explícitos del Excel.

### Carencias
Conceptos poco cubiertos o ausentes en la composición.

### Plan de juego
La forma natural de jugar la composición a partir de su identidad principal y su tempo.

## Qué no debe hacer

- No usar meta externo.
- No usar winrates.
- No analizar al rival.
- No recomendar campeones en esta fase.
- No inventar datos si faltan campos.

## Salida esperada

La interfaz debe mostrar, como mínimo:

- Identidad principal
- Identidades secundarias
- Fortalezas
- Carencias
- Plan de juego

## Criterio de calidad

Si un dato no existe en el Excel, debe detectarse en origen. La interfaz no debe mezclar categorías ni mostrar datos inconsistentes.
