import { cleanLabel, matchesCategory, normalizeText, uniqueOrdered } from './utils.js';

const WEAKNESS_PRIORITIES = [
  { key: 'frontline', label: 'Poca frontline' },
  { key: 'engage', label: 'Poco engage' },
  { key: 'teamfight', label: 'Teamfight débil' },
  { key: 'objective', label: 'Objetivos lentos' },
  { key: 'scaling', label: 'Mal escalado' },
  { key: 'control', label: 'Poco control' },
  { key: 'damage', label: 'Daño irregular' },
  { key: 'poke', label: 'Poco poke' },
  { key: 'pick', label: 'Poco pick' },
  { key: 'mobility', label: 'Poca movilidad' },
  { key: 'splitpush', label: 'Poco splitpush' },
];

function summarizeConcepts(selectedChampions, field, limit, priorities) {
  const counts = new Map();

  selectedChampions.forEach((champion, index) => {
    const tags = Array.isArray(champion?.[field]) ? champion[field] : [];
    tags.forEach((tag) => {
      const label = cleanLabel(tag);
      const key = normalizeText(label);
      if (!key || key === normalizeText('Sin definir')) return;

      const current = counts.get(key) || {
        key,
        label,
        count: 0,
        champions: new Set(),
        firstIndex: index,
        priority: 0,
      };

      current.count += 1;
      current.champions.add(champion?.champion || champion?.displayName || 'Sin definir');

      const priorityIndex = priorities.findIndex((item) => matchesCategory(label, item.key) || normalizeText(item.label) === key);
      const priorityScore = priorityIndex === -1 ? 0 : priorities.length - priorityIndex;
      current.priority = Math.max(current.priority, priorityScore);
      counts.set(key, current);
    });
  });

  return [...counts.values()]
    .map((item) => {
      const championCount = item.champions.size;
      const score = item.count * 8 + championCount * 3 + item.priority * 2;
      return {
        key: item.key,
        label: item.label,
        score,
        count: item.count,
        championCount,
        champions: uniqueOrdered([...item.champions]),
        firstIndex: item.firstIndex,
      };
    })
    .sort((a, b) => b.score - a.score || b.count - a.count || a.firstIndex - b.firstIndex || a.label.localeCompare(b.label, 'es'))
    .slice(0, limit);
}

export function summarizeWeaknesses(selectedChampions = [], limit = 3) {
  return summarizeConcepts(selectedChampions, 'weaknesses', limit, WEAKNESS_PRIORITIES);
}
