import { normalizeIdentityLabel, normalizeText, sortByFrequency } from './utils.js';

export function summarizeIdentities(selectedChampions = []) {
  const counts = new Map();

  selectedChampions.forEach((champion, index) => {
    const label = normalizeIdentityLabel(champion?.identity);
    const key = normalizeText(label);
    const current = counts.get(key) || {
      key,
      label,
      count: 0,
      firstIndex: index,
      champions: [],
    };

    current.count += 1;
    current.champions.push(champion?.champion || champion?.displayName || 'Sin definir');
    counts.set(key, current);
  });

  const ordered = sortByFrequency([...counts.values()]);
  const pool = ordered.filter((item) => item.key !== normalizeText('Sin definir'));
  const ranked = pool.length ? pool : ordered;
  const [primary, ...secondary] = ranked;

  return {
    primary: primary || {
      key: normalizeText('Sin definir'),
      label: 'Sin definir',
      count: 0,
      champions: [],
    },
    secondary: secondary.slice(0, 2),
  };
}
