import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import XLSX from 'xlsx';

const workbookPath = process.argv[2] || 'Draft Pool.xlsx';
const outputDir = process.argv[3] || 'data';

const ROLE_SHEETS = [
  { key: 'top', sheet: 'Tabla Top' },
  { key: 'jungle', sheet: 'Tabla Jungla' },
  { key: 'mid', sheet: 'Tabla Mid' },
  { key: 'bot', sheet: 'Tabla Botline' },
  { key: 'support', sheet: 'Tabla Support' },
];

const ATTRIBUTE_SHEET_CANDIDATES = ['09_Attributes', 'Attributes', 'Tabla Attributes', 'Tabla Atributos'];

const ATTRIBUTE_FIELDS = [
  { key: 'engage', aliases: ['Engage'] },
  { key: 'disengage', aliases: ['Disengage'] },
  { key: 'frontline', aliases: ['Frontline'] },
  { key: 'peel', aliases: ['Peel'] },
  { key: 'pick', aliases: ['Pick'] },
  { key: 'poke', aliases: ['Poke'] },
  { key: 'burst', aliases: ['Burst'] },
  { key: 'dps', aliases: ['DPS'] },
  { key: 'scaling', aliases: ['Scaling'] },
  { key: 'mobility', aliases: ['Mobility'] },
  { key: 'waveclear', aliases: ['Waveclear', 'Wave Clear'] },
  { key: 'siege', aliases: ['Siege'] },
  { key: 'splitpush', aliases: ['Splitpush', 'Split Push'] },
  { key: 'objectiveControl', aliases: ['Objective Control', 'Objective', 'ObjectiveControl'] },
  { key: 'vision', aliases: ['Vision'] },
  { key: 'confidence', aliases: ['Confidence'] },
];

function splitTags(value) {
  if (!value) return [];
  return String(value)
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeChampion(value) {
  return normalizeText(value);
}

function clampNumber(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function getAttributeSheet(workbook) {
  const sheetName = workbook.SheetNames.find((name) => ATTRIBUTE_SHEET_CANDIDATES.includes(name));
  if (!sheetName) return null;
  return { sheetName, worksheet: workbook.Sheets[sheetName] };
}

function findHeaderIndex(headerIndex, aliases) {
  for (const alias of aliases) {
    const index = headerIndex.get(normalizeText(alias));
    if (typeof index === 'number') {
      return index;
    }
  }
  return -1;
}

function parseAttributesSheet(workbook) {
  const match = getAttributeSheet(workbook);
  if (!match) {
    return { entries: [], map: new Map(), sheetName: null };
  }

  const rows = XLSX.utils.sheet_to_json(match.worksheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  const headerRow = rows.find((row) => row.some((cell) => String(cell).trim() !== '')) || [];
  const headerIndex = new Map();

  headerRow.forEach((value, index) => {
    const key = normalizeText(value);
    if (key) headerIndex.set(key, index);
  });

  const championColumn = findHeaderIndex(headerIndex, ['Champion', 'Name', 'Campeón']);
  if (championColumn < 0) {
    return { entries: [], map: new Map(), sheetName: match.sheetName };
  }

  const entries = [];
  const map = new Map();

  for (const row of rows.slice(1)) {
    const champion = String(row[championColumn] || '').trim();
    if (!champion) continue;

    const attributes = {};

    for (const field of ATTRIBUTE_FIELDS) {
      const columnIndex = findHeaderIndex(headerIndex, field.aliases);
      if (columnIndex < 0) continue;

      const parsed = clampNumber(row[columnIndex], field.key === 'confidence' ? 100 : 5);
      if (parsed === null) continue;

      attributes[field.key] = parsed;
    }

    if (!Object.keys(attributes).length) continue;

    const entry = {
      champion,
      attributes,
    };

    entries.push(entry);
    map.set(normalizeChampion(champion), attributes);
  }

  return { entries, map, sheetName: match.sheetName };
}

function buildRoleEntries(worksheet, attributesMap) {
  if (!worksheet) return [];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  return rows
    .slice(1)
    .filter((row) => row[0])
    .map((row) => {
      const champion = String(row[0]).trim();
      const attributes = attributesMap.get(normalizeChampion(champion));

      const entry = {
        champion,
        identity: String(row[1] || '').trim(),
        function: String(row[2] || '').trim(),
        tempo: String(row[3] || '').trim(),
        strengths: splitTags(row[4]),
        weaknesses: splitTags(row[5]),
      };

      if (attributes) {
        entry.attributes = attributes;
      }

      return entry;
    });
}

async function main() {
  const workbookBuffer = await fs.readFile(workbookPath);
  const workbook = XLSX.read(workbookBuffer, { type: 'buffer' });

  await fs.mkdir(outputDir, { recursive: true });

  const { entries: attributeEntries, map: attributesMap, sheetName: attributeSheetName } = parseAttributesSheet(workbook);

  for (const { key, sheet } of ROLE_SHEETS) {
    const worksheet = workbook.Sheets[sheet];
    if (!worksheet) {
      throw new Error(`No existe la hoja ${sheet}`);
    }

    const champions = buildRoleEntries(worksheet, attributesMap);

    await fs.writeFile(
      path.join(outputDir, `${key}.json`),
      `${JSON.stringify(champions, null, 2)}\n`,
      'utf8'
    );
  }

  await fs.writeFile(
    path.join(outputDir, 'attributes.json'),
    `${JSON.stringify(attributeEntries, null, 2)}\n`,
    'utf8'
  );

  await fs.writeFile(
    path.join(outputDir, 'index.json'),
    `${JSON.stringify(
      {
        source: workbookPath,
        generatedAt: new Date().toISOString(),
        sheets: {
          roles: ROLE_SHEETS.map(({ key, sheet }) => ({ key, sheet })),
          attributes: attributeSheetName ? { sheet: attributeSheetName, file: 'attributes.json' } : null,
        },
        files: [...ROLE_SHEETS.map(({ key }) => `${key}.json`), 'attributes.json'],
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
