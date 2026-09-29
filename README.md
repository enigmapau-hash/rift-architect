# Rift Architect

PWA para construir y analizar composiciones de League of Legends.

## Estado actual

- La app carga la base desde `Draft Pool.xlsx`.
- Si existe `data/index.json`, usa los JSON exportados.
- El analizador ya funciona en JavaScript puro.
- Hay service worker y manifest para instalarla como PWA.

## Exportar JSON desde el Excel

```bash
npm install
npm run generate:data
```

Ese comando genera:

- `data/top.json`
- `data/jungle.json`
- `data/mid.json`
- `data/bot.json`
- `data/support.json`
- `data/index.json`

## Próximo paso

- Sinergias entre campeones.
- Counters.
- Recomendación del mejor siguiente pick.
- Cálculo de condiciones de victoria.
