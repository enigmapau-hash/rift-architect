export function cleanText(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function toText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return cleanText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(' · ');
  if (typeof value === 'object') {
    return toText(
      value.label ??
        value.name ??
        value.title ??
        value.text ??
        value.value ??
        value.detail ??
        value.summary ??
        value.reason ??
        value.description ??
        value.champion ??
        value.item ??
        ''
    );
  }
  return cleanText(String(value));
}

export function uniqueValues(values = []) {
  return [...new Set(values.map(toText).filter(Boolean))];
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function gradeFromScore(score) {
  const value = clamp(score, 0, 100);
  if (value >= 90) return 'S';
  if (value >= 80) return 'A+';
  if (value >= 70) return 'A';
  if (value >= 60) return 'B';
  if (value >= 45) return 'C';
  return 'D';
}

export function labelFromConfidence(score = 0) {
  const value = clamp(Math.round(Number(score) || 0), 0, 100);
  if (value >= 90) return 'Excelente';
  if (value >= 80) return 'Muy alta';
  if (value >= 70) return 'Alta';
  if (value >= 60) return 'Media';
  return 'Baja';
}

export function toneFromScore(score = 0) {
  const value = clamp(Number(score) || 0, 0, 100);
  if (value >= 85) return 'is-strong';
  if (value >= 70) return 'is-mid';
  return 'is-low';
}

export function buildRankedList(items = [], badge = '', detail = '', startScore = 90) {
  return uniqueValues(Array.isArray(items) ? items : [items])
    .slice(0, 3)
    .map((label, index) => ({
      label,
      badge,
      detail,
      score: clamp(startScore - index * 8, 35, 100),
    }));
}
