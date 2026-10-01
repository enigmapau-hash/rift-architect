# Rift Architect

PWA para analizar **mi propia composición** de League of Legends a partir de `Draft Pool.xlsx`.

## Lo que muestra la app

- Selector de campeones por rol.
- Resumen ejecutivo corto.
- Identidad de la composición.
- Fortalezas y debilidades visuales.
- Plan de partida por fases.
- Sinergias clave y riesgos.

## Fuente de verdad

- `Draft Pool.xlsx` es la única fuente editable.
- Un GitHub Action convierte el Excel a JSON en cada push a `main`.
- La PWA consume `data/index.json` y los ficheros generados en `data/`.
- GitHub Pages publica la versión visible del proyecto.

## Hoja de ruta

1. **Hito 1: Base estable**
   - una sola ruta de render;
   - consola limpia;
   - sin módulos experimentales visibles.

2. **Hito 2: Pantalla principal terminada**
   - Executive Summary;
   - Identidad;
   - Fortalezas;
   - Debilidades;
   - Plan;
   - Sinergias y Riesgos.

3. **Hito 3: IA refinada**
   - mejorar la calidad de lo que ya existe;
   - sin nuevas pantallas.

4. **Hito 4: Base de conocimiento madura**
   - Excel más completo;
   - validación y normalización de datos;
   - más señales útiles por composición.

5. **Hito 5: Beta 1.0**
   - experiencia estable;
   - lectura clara en todos los dispositivos;
   - pocos errores y sin regresiones.

6. **Hito 6: Release Candidate**
   - congelar funciones;
   - corregir bugs;
   - pulir rendimiento y accesibilidad.

7. **Hito 7: Versión 1.0**
   - revisión final;
   - documentación cerrada;
   - entrega estable del producto.

## Regla de trabajo

No abrir un nuevo bloque hasta cerrar el anterior.

## Estado actual

- La pantalla principal vuelve a estar centrada en la composición y su lectura rápida.
- La Story muestra tarjetas fijas, compactas y visuales.
- El resumen ejecutivo principal vuelve a ser una pieza concreta: identidad, fortalezas, debilidades y plan.
- El motor interno sigue alimentando la lectura con identidad, plan, fortalezas, debilidades y riesgos.
- La interfaz prioriza claridad por encima de paneles experimentales.

## GitHub Pages

- `https://enigmapau-hash.github.io/rift-architect/`

## Flujo de trabajo

1. Implementar el cambio.
2. Probarlo en la UI principal.
3. Corregir regresiones.
4. Actualizar README, ROADMAP y `docs/PROJECT_STATE.md`.

## Roadmap

Ver [`ROADMAP.md`](./ROADMAP.md) para la hoja de ruta.
