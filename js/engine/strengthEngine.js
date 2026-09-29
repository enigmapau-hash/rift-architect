import { cleanLabel, matchesCategory, normalizeText, uniqueOrdered } from './utils.js';

const STRENGTH_PRIORITIES = [
  { key: 'frontline', label: 'Frontline' },
  { key: 'engage', label: 'Engage' },
  { key: 'teamfight', label: 'Teamfight' },
  { key: 'objective', label: 'Objetivos' },
  { key: 'scaling', label: 'Escalado' },
  { key: 'control', label: 'Control' },
  { key: 'damage', label: 'Daño' },
  { key: 'poke', label: 'Poke' },
  { key: 'pick', label: 'Pick' },
  { key: 'mobility', label: 'Movilidad' },
  { key: 'splitpush', label: 'Splitpush' },
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

export function summarizeStrengths(selectedChampions = [], limit = 4) {
  return summarizeConcepts(selectedChampions, 'strengths', limit, STRENGTH_PRIORITIES);
}
