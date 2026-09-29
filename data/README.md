# Data generada

Esta carpeta puede contener los JSON exportados desde `Draft Pool.xlsx`.

Para generarlos:

```bash
npm install
npm run generate:data
```

La aplicación carga primero `data/index.json` si existe. Si no, usa directamente el Excel.
