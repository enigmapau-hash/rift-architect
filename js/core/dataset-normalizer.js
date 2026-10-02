import { normalizeText } from '../analyzer.js';
import { ROLE_ORDER } from './draft-state.js';

export function normalizeWorkbookDataset(roleRows = {}) {
  const registry = createRegistry();
  const data = Object.fromEntries(ROLE_ORDER.map((role) => [role, []]));

  ROLE_ORDER.forEach((role) => {
    const rows = Array.isArray(roleRows?.[role]) ? roleRows[role] : [];
    data[role] = rows.map((row) => normalizeChampionRow(role, row, registry));
  });

  const taxonomy = registry.export();

  return {
    data,
    taxonomy,
    stats: buildNormalizationStats(data, taxonomy),
  };
}

function normalizeChampionRow(role, row = {}, registry) {
  const champion = cleanLabel(row.champion);
  const identity = registry.intern('identity', row.identity);
  const functionEntry = registry.intern('function', row.function);
  const tempo = registry.intern('tempo', row.tempo);
  const strengths = registry.internMany('strength', row.strengths);
  const weaknesses = registry.internMany('weakness', row.weaknesses);

  return {
    role,
    champion,
    championKey: normalizeText(champion),
    identity: identity.label,
    identityId: identity.id,
    function: functionEntry.label,
    functionId: functionEntry.id,
    tempo: tempo.label,
    tempoId: tempo.id,
    strengths: strengths.labels,
    strengthIds: strengths.ids,
    weaknesses: weaknesses.labels,
    weaknessIds: weaknesses.ids,
    tags: uniqueValues([identity.label, functionEntry.label, tempo.label, ...strengths.labels, ...weaknesses.labels]),
    tagIds: uniqueValues([identity.id, functionEntry.id, tempo.id, ...strengths.ids, ...weaknesses.ids]),
  };
}

function createRegistry() {
  const buckets = {
    identity: createBucket('identity'),
    function: createBucket('function'),
    tempo: createBucket('tempo'),
    strength: createBucket('strength'),
    weakness: createBucket('weakness'),
  };

  return {
    intern(field, value) {
      return buckets[field]?.intern(value) || createEmptyEntry(field);
    },
    internMany(field, value) {
      return buckets[field]?.internMany(value) || { labels: [], ids: [] };
    },
    export() {
      return {
        identities: buckets.identity.export(),
        functions: buckets.function.export(),
        tempos: buckets.tempo.export(),
        strengths: buckets.strength.export(),
        weaknesses: buckets.weakness.export(),
      };
    },
  };
}

function createBucket(prefix) {
  const items = [];
  const lookup = new Map();

  function intern(value) {
    const label = cleanLabel(value);
    if (!label) return null;

    const key = normalizeText(label);
    if (!key) return null;

    const existing = lookup.get(key);
    if (existing) return existing;

    const entry = { id: `${prefix}-${items.length + 1}`, label };
    lookup.set(key, entry);
    items.push(entry);
    return entry;
  }

  function internMany(value) {
    const entries = normalizeLabelList(value).map(intern).filter(Boolean);
    return {
      labels: uniqueValues(entries.map((entry) => entry.label)),
      ids: uniqueValues(entries.map((entry) => entry.id)),
    };
  }

  function exportBucket() {
    return items.map((item) => ({ ...item }));
  }

  return {
    intern,
    internMany,
    export: exportBucket,
  };
}

function createEmptyEntry(field) {
  return {
    id: `${field}-0`,
    label: 'Sin definir',
  };
}

function normalizeLabelList(value) {
  if (Array.isArray(value)) {
    return value.map(cleanLabel).filter(Boolean);
  }

  const text = cleanLabel(value);
  if (!text) return [];

  return text
    .split(/[·•;\n]+/)
    .map(cleanLabel)
    .filter(Boolean);
}

function cleanLabel(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function uniqueValues(values = []) {
  return [...new Set(values.map(cleanLabel).filter(Boolean))];
}

function buildNormalizationStats(data, taxonomy) {
  const roles = Object.fromEntries(ROLE_ORDER.map((role) => [role, Array.isArray(data[role]) ? data[role].length : 0]));
  const totals = {
    identities: 0,
    functions: 0,
    tempos: 0,
    strengths: 0,
    weaknesses: 0,
  };

  ROLE_ORDER.forEach((role) => {
    const rows = Array.isArray(data[role]) ? data[role] : [];
    rows.forEach((row) => {
      totals.identities += row.identity ? 1 : 0;
      totals.functions += row.function ? 1 : 0;
      totals.tempos += row.tempo ? 1 : 0;
      totals.strengths += Array.isArray(row.strengths) ? row.strengths.length : 0;
      totals.weaknesses += Array.isArray(row.weaknesses) ? row.weaknesses.length : 0;
    });
  });

  const unique = {
    identities: Array.isArray(taxonomy.identities) ? taxonomy.identities.length : 0,
    functions: Array.isArray(taxonomy.functions) ? taxonomy.functions.length : 0,
    tempos: Array.isArray(taxonomy.tempos) ? taxonomy.tempos.length : 0,
    strengths: Array.isArray(taxonomy.strengths) ? taxonomy.strengths.length : 0,
    weaknesses: Array.isArray(taxonomy.weaknesses) ? taxonomy.weaknesses.length : 0,
  };

  const repeated = Object.fromEntries(
    Object.entries(totals).map(([field, total]) => [field, Math.max(0, total - unique[field])])
  );

  const totalOccurrences = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const totalUnique = Object.values(unique).reduce((sum, value) => sum + value, 0);
  const compressionRatio = totalOccurrences ? Number((1 - totalUnique / totalOccurrences).toFixed(3)) : 0;

  return {
    roles,
    totals,
    unique,
    repeated,
    totalOccurrences,
    totalUnique,
    totalRepeated: Object.values(repeated).reduce((sum, value) => sum + value, 0),
    compressionRatio,
  };
}
