import { normalizeText } from './utils.js';
import { WIN_CONDITION_RULES } from '../../knowledge/win-conditions.js';

function toLabel(value) {
  if (!value) return '';
  return String(value);
}

function prioritize(items) {
  return [...new Set(items.filter(Boolean))].slice(0, 3);
}

function makeResult(rule) {
  return {
    label: rule.label,
    detail: rule.detail,
    priorities: prioritize(rule.priorities),
    avoid: prioritize(rule.avoid),
  };
}

function includesAny(text, terms = []) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

export function determineWinCondition({ identitySummary = null, tempoSummary = null, synergies = [], coherence = null } = {}) {
  const primary = normalizeText(identitySummary?.primary?.label || '');
  const tempo = normalizeText(tempoSummary?.label || '');
  const coherenceScore = Number(coherence?.score) || 0;
  const strongestSynergy = synergies[0]?.label ? toLabel(synergies[0].label) : '';

  for (const rule of WIN_CONDITION_RULES) {
    if (rule.key === 'fallback') continue;

    const hitPrimary = includesAny(primary, rule.match);
    const hitTempo = includesAny(tempo, rule.match);
    const hitSynergy = includesAny(strongestSynergy, rule.match);

    if (!hitPrimary && !hitTempo && !hitSynergy) continue;

    if (rule.key === 'pick-engage' && coherenceScore < 45 && !hitPrimary) continue;
    return makeResult(rule);
  }

  const fallback = WIN_CONDITION_RULES.find((rule) => rule.key === 'fallback') || WIN_CONDITION_RULES[WIN_CONDITION_RULES.length - 1];
  return makeResult(fallback);
}
