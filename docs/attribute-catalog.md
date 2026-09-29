# Attribute Catalog

## Objetivo

Definir qué significa cada atributo para que el motor de análisis y la futura IA interpreten la información del Excel de la misma forma.

## Regla base

- El Excel sigue siendo la fuente de verdad.
- El catálogo no añade datos nuevos.
- Solo define el significado, uso y visibilidad de cada atributo.
- La interfaz debe seguir siendo simple y compacta.

## Niveles de visibilidad

### Visible en la UI
Son los atributos que el usuario puede entender de un vistazo.

- Frontline
- Engage
- Peel
- DPS
- Burst
- Poke
- Teamfight
- Scaling
- Objective Control
- Splitpush
- Waveclear

### Útil para el motor
Se usan para agrupar y resumir, aunque no siempre se muestren como texto principal.

- Mobility
- Siege
- Pick
- Control
- Disengage

### Interno / técnico
Se usa para ajustar o enriquecer el análisis sin mostrarse en la UI base.

- Confidence
- Vision
- Notas internas de normalización

## Significado de referencia

| Atributo | Significado breve | Visible |
|---|---|:---:|
| Frontline | Aguantar daño y mantener la pelea | ✅ |
| Engage | Iniciar la pelea | ✅ |
| Peel | Proteger al carry | ✅ |
| DPS | Daño sostenido | ✅ |
| Burst | Daño explosivo | ✅ |
| Poke | Daño a distancia antes de pelear | ✅ |
| Teamfight | Rendimiento en peleas agrupadas | ✅ |
| Scaling | Mejora con el paso de la partida | ✅ |
| Objective Control | Ayuda a asegurar objetivos | ✅ |
| Splitpush | Presión en side lane | ✅ |
| Waveclear | Limpiar oleadas rápido | ✅ |
| Mobility | Capacidad de moverse y reposicionarse | ❌ |
| Siege | Presión sobre torres y zonas | ❌ |
| Pick | Castigar errores con cazadas | ❌ |
| Control | Utilidad, CC y zona | ❌ |
| Disengage | Salir o frenar una pelea | ❌ |
| Vision | Control de visión | ❌ |
| Confidence | Dato interno de consistencia | ❌ |

## Uso en Rift Architect

### UI
Solo debe enseñar lo imprescindible:

- Identity
- Function
- Tempo
- Resumen de análisis

### Motor
Agrupa atributos y devuelve un bloque compacto:

- Identidad principal
- Identidades secundarias
- Hace bien
- Le falta
- Plan de juego

### IA
La IA usará este catálogo para explicar la composición con más contexto, pero sin salir del marco del Excel.

## Regla de calidad

Si un atributo no aparece en el Excel, no se inventa. Si aparece con una variante de nombre, se normaliza antes de llegar a la UI o al motor.
