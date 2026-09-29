import { cleanLabel, normalizeText, TEMPO_ORDER } from './utils.js';

const TEMPO_COMPONENTS = {
  Early: [1],
  Mid: [2],
  Late: [3],
  'Early/Mid': [1, 2],
  'Mid/Late': [2, 3],
  'Early/Late': [1, 3],
  'Early/Mid/Late': [1, 2, 3],
};

function tempoToComponents(label) {
  const normalized = normalizeText(label);
  if (!normalized) return [];
  if (normalized.includes('earlymidlate')) return TEMPO_COMPONENTS['Early/Mid/Late'];
  if (normalized.includes('earlymid')) return TEMPO_COMPONENTS['Early/Mid'];
  if (normalized.includes('midlate')) return TEMPO_COMPONENTS['Mid/Late'];
  if (normalized.includes('earlylate')) return TEMPO_COMPONENTS['Early/Late'];
  if (normalized.includes('early')) return TEMPO_COMPONENTS.Early;
  if (normalized.includes('mid')) return TEMPO_COMPONENTS.Mid;
  if (normalized.includes('late')) return TEMPO_COMPONENTS.Late;
  return [];
}

export function summarizeTempo(selectedChampions = []) {
  const counts = new Map();

  selectedChampions.forEach((champion, index) => {
    const label = cleanLabel(champion?.tempo);
    const normalized = normalizeText(label);
    if (!normalized || normalized === normalizeText('Sin definir')) return;

    const canonical =
      TEMPO_ORDER.find((tempo) => normalizeText(tempo) === normalized) ||
      (normalizeText(label).includes('earlymidlate') && 'Early/Mid/Late') ||
      (normalizeText(label).includes('earlymid') && 'Early/Mid') ||
      (normalizeText(label).includes('midlate') && 'Mid/Late') ||
      (normalizeText(label).includes('earlylate') && 'Early/Late') ||
      (normalizeText(label).includes('early') && 'Early') ||
      (normalizeText(label).includes('mid') && 'Mid') ||
      (normalizeText(label).includes('late') && 'Late') ||
      label;

    const current = counts.get(canonical) || {
      label: canonical,
      count: 0,
      firstIndex: index,
    };

    current.count += 1;
    counts.set(canonical, current);
  });

  if (!counts.size) {
    return 'Sin definir';
  }

  const ordered = [...counts.values()].sort((a, b) => b.count - a.count || a.firstIndex - b.firstIndex || a.label.localeCompare(b.label, 'es'));
  const dominant = ordered[0];
  if (dominant.count >= 2 && ordered.length === 1) {
    return dominant.label;
  }

  const componentSet = new Set();
  ordered.forEach((item) => {
    tempoToComponents(item.label).forEach((component) => componentSet.add(component));
  });

  const active = [...componentSet].sort((a, b) => a - b);
  if (!active.length) return dominant.label;
  if (active.length === 1) return TEMPO_ORDER[active[0] - 1];

  const start = TEMPO_ORDER[active[0] - 1];
  const end = TEMPO_ORDER[active[active.length - 1] - 1];
  if (start === end) return start;
  return `${start} → ${end}`;
}
