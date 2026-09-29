import { cleanLabel, normalizeText, sortByFrequency, uniqueOrdered } from './utils.js';

function summarizeTaggedConcepts(selectedChampions, field, limit) {
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
        firstIndex: index,
      };

      current.count += 1;
      counts.set(key, current);
    });
  });

  return sortByFrequency([...counts.values()]).slice(0, limit).map((item) => item.label);
}

export function summarizeStrengths(selectedChampions = [], limit = 4) {
  return uniqueOrdered(summarizeTaggedConcepts(selectedChampions, 'strengths', limit)).slice(0, limit);
}
