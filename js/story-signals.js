const STORY_ROOT_SELECTOR = '#storyView';
const SECTION_KEYS = ['composition', 'victory', 'priorities', 'risks', 'draft', 'advanced'];
let observer = null;
let rafId = null;

function getRoot() {
  return document.querySelector(STORY_ROOT_SELECTOR);
}

function scheduleEnhance() {
  if (rafId) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = null;
    enhanceStory();
  });
}

function enhanceStory() {
  const root = getRoot();
  if (!root) return;

  const cards = [...root.querySelectorAll('.composition-story__summary-card')];
  cards.forEach((card, index) => {
    const section = SECTION_KEYS[index] || 'composition';
    const existing = card.querySelector('.composition-story__signal-bank');
    if (existing) existing.remove();

    const signals = buildSignals(section, card);
    const bank = document.createElement('div');
    bank.className = 'composition-story__signal-bank';
    bank.innerHTML = signals
      .map((signal) => renderSignal(signal))
      .join('');

    const anchor = card.querySelector('.composition-story__summary-main');
    if (anchor) {
      anchor.insertAdjacentElement('afterend', bank);
    } else {
      card.prepend(bank);
    }

    card.classList.add('has-signals');
  });
}

function buildSignals(section, card) {
  const score = readScore(card.querySelector('.composition-story__summary-cta')?.textContent || '0');
  const title = textOf(card.querySelector('.composition-story__summary-title'));
  const summary = textOf(card.querySelector('.composition-story__summary-copy'));
  const pills = [...card.querySelectorAll('.story-pill')].map((element) => textOf(element)).filter(Boolean);
  const flows = [...card.querySelectorAll('.design-system-flow__item')].map((item) => ({
    label: textOf(item.querySelector('.design-system-flow__label')),
    value: textOf(item.querySelector('.design-system-flow__value')),
    meta: textOf(item.querySelector('.design-system-flow__meta')),
  }));

  const firstFlow = flows[0] || {};
  const secondFlow = flows[1] || {};
  const thirdFlow = flows[2] || {};

  switch (section) {
    case 'composition':
      return [
        { label: 'Identidad', value: shorten(summary || title, 22), score },
        { label: 'Pico', value: shorten(pills[1] || firstFlow.value || 'Estable', 18), score: clamp(score - 4, 0, 100) },
        { label: 'Huecos', value: shorten(thirdFlow.value || firstFlow.meta || 'Bajos', 18), score: clamp(100 - flows.length * 12, 35, 92) },
      ];
    case 'victory':
      return [
        { label: 'Early', value: shorten(firstFlow.value || summary || 'Presión', 18), score: clamp(score - 6, 0, 100) },
        { label: 'Mid', value: shorten(secondFlow.value || 'Ventaja', 18), score: score },
        { label: 'Late', value: shorten(thirdFlow.value || 'Cierre', 18), score: clamp(score - 8, 0, 100) },
      ];
    case 'priorities':
      return [
        { label: 'Paso 1', value: shorten(firstFlow.value || 'Ejecutar', 18), score: clamp(score + 4, 0, 100) },
        { label: 'Paso 2', value: shorten(secondFlow.value || 'Preparar', 18), score: clamp(score - 2, 0, 100) },
        { label: 'Paso 3', value: shorten(thirdFlow.value || 'Cerrar', 18), score: clamp(score - 10, 0, 100) },
      ];
    case 'risks':
      return [
        { label: 'Riesgo', value: shorten(firstFlow.value || 'Forzar', 18), score: clamp(100 - score, 0, 100) },
        { label: 'Errores', value: shorten(secondFlow.value || 'Mal timing', 18), score: clamp(100 - score / 2, 0, 100) },
        { label: 'Evitar', value: shorten(thirdFlow.value || 'Sobreextender', 18), score: clamp(90 - flows.length * 8, 35, 90) },
      ];
    case 'draft':
      return [
        { label: 'Necesidad', value: shorten(firstFlow.value || 'Cubrir huecos', 18), score: clamp(score - 2, 0, 100) },
        { label: 'Pick', value: shorten(secondFlow.value || 'Mejorar plan', 18), score: clamp(score + 2, 0, 100) },
        { label: 'Ban', value: shorten(thirdFlow.value || 'Proteger', 18), score: clamp(score - 8, 0, 100) },
      ];
    case 'advanced':
    default:
      return [
        { label: 'Coherencia', value: shorten(summary || title, 22), score },
        { label: 'Métricas', value: shorten(firstFlow.value || 'Lectura estable', 18), score: clamp(score - 6, 0, 100) },
        { label: 'Señales', value: shorten(secondFlow.meta || thirdFlow.meta || 'IA compacta', 18), score: clamp(score - 10, 0, 100) },
      ];
  }
}

function renderSignal(signal) {
  const tone = toneFromScore(signal.score);
  return `
    <article class="composition-story__signal composition-story__signal--${tone}">
      <span class="composition-story__signal-label">${escapeHtml(signal.label)}</span>
      <strong class="composition-story__signal-value">${escapeHtml(signal.value)}</strong>
      <span class="composition-story__signal-bar" aria-hidden="true">${escapeHtml(renderMeter(signal.score))}</span>
    </article>
  `;
}

function renderMeter(score = 0) {
  const value = clamp(Math.round(Number(score) || 0), 0, 100);
  const filled = Math.round(value / 20);
  const empty = 5 - filled;
  return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${value}%`;
}

function textOf(element) {
  return String(element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function shorten(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(8, maxLength - 1)).trimEnd()}…`;
}

function readScore(value) {
  const match = String(value).match(/(\d{1,3})/);
  return match ? clamp(Number(match[1]), 0, 100) : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toneFromScore(score) {
  if (score >= 75) return 'good';
  if (score >= 55) return 'neutral';
  return 'bad';
}

function ensureObserver() {
  const root = getRoot();
  if (!root || observer) return;

  observer = new MutationObserver(() => {
    scheduleEnhance();
  });

  observer.observe(root, { childList: true, subtree: true });
}

function init() {
  enhanceStory();
  ensureObserver();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      enhanceStory();
      ensureObserver();
    }, { once: true });
  }
}

init();

export {};
