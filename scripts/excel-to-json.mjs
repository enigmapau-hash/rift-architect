import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import XLSX from 'xlsx';

const workbookPath = process.argv[2] || 'Draft Pool.xlsx';
const outputDir = process.argv[3] || 'data';

const SHEETS = [
  { key: 'top', sheet: 'Tabla Top' },
  { key: 'jungle', sheet: 'Tabla Jungla' },
  { key: 'mid', sheet: 'Tabla Mid' },
  { key: 'bot', sheet: 'Tabla Botline' },
  { key: 'support', sheet: 'Tabla Support' },
];

function splitTags(value) {
  if (!value) return [];
  return String(value)
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
}

async function main() {
  const workbookBuffer = await fs.readFile(workbookPath);
  const workbook = XLSX.read(workbookBuffer, { type: 'buffer' });

  await fs.mkdir(outputDir, { recursive: true });

  for (const { key, sheet } of SHEETS) {
    const worksheet = workbook.Sheets[sheet];
    if (!worksheet) {
      throw new Error(`No existe la hoja ${sheet}`);
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false,
      defval: '',
    });

    const champions = rows
      .slice(1)
      .filter((row) => row[0])
      .map((row) => ({
        champion: String(row[0]).trim(),
        identity: String(row[1] || '').trim(),
        function: String(row[2] || '').trim(),
        tempo: String(row[3] || '').trim(),
        strengths: splitTags(row[4]),
        weaknesses: splitTags(row[5]),
      }));

    await fs.writeFile(
      path.join(outputDir, `${key}.json`),
      `${JSON.stringify(champions, null, 2)}\n`,
      'utf8'
    );
  }

  await fs.writeFile(
    path.join(outputDir, 'index.json'),
    `${JSON.stringify(
      {
        source: workbookPath,
        generatedAt: new Date().toISOString(),
        files: SHEETS.map(({ key }) => `${key}.json`),
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log(`JSON generado en ./${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
