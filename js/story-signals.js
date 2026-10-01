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
    card.querySelector('.composition-story__signal-bank')?.remove();

    const signals = buildSignals(section, card);
    const bank = document.createElement('div');
    bank.className = 'composition-story__signal-bank';
    bank.innerHTML = signals.map((signal) => renderSignal(signal)).join('');

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
  const fourthFlow = flows[3] || {};
  const state = toneState(score);

  switch (section) {
    case 'composition':
      return [
        signal('Estado', state.label, `${score}%`, score),
        signal('Ritmo', smartText(pills[2] || firstFlow.value || summary || 'Mid game', 16), 'Tempo', clamp(score - 6, 0, 100)),
        signal('Foco', smartText(fourthFlow.value || thirdFlow.value || title || 'A revisar', 16), 'Prioridad', clamp(score - 14, 0, 100)),
      ];
    case 'victory':
      return [
        signal('Plan', smartText(summary || firstFlow.value || 'Ejecutar', 16), 'Win', clamp(score, 0, 100)),
        signal('Tempo', smartText(firstFlow.value || pills[0] || 'Mid game', 16), smartText(pills[0] || 'Ritmo', 12), clamp(score - 6, 0, 100)),
        signal('Cierre', smartText(fourthFlow.value || thirdFlow.value || 'Cerrar limpio', 16), 'Final', clamp(score - 10, 0, 100)),
      ];
    case 'priorities':
      return [
        signal('Ahora', smartText(firstFlow.value || 'Ejecutar', 16), 'Paso 1', clamp(score + 4, 0, 100)),
        signal('Orden', smartText(secondFlow.value || 'Preparar', 16), 'Paso 2', clamp(score - 2, 0, 100)),
        signal('Disciplina', smartText(thirdFlow.value || 'Cerrar', 16), 'Checks', clamp(score - 10, 0, 100)),
      ];
    case 'risks':
      return [
        signal('Riesgo', smartText(firstFlow.value || 'Forzar', 16), 'Crítico', clamp(100 - score, 0, 100)),
        signal('Exposición', smartText(secondFlow.value || 'Timing', 16), 'Atención', clamp(100 - score / 2, 0, 100)),
        signal('Mitigar', smartText(thirdFlow.value || 'Sobreextender', 16), 'Plan', clamp(90 - flows.length * 8, 35, 90)),
      ];
    case 'draft':
      return [
        signal('Necesidad', smartText(firstFlow.value || 'Cubrir huecos', 16), 'Hueco', clamp(score - 2, 0, 100)),
        signal('Pick', smartText(secondFlow.value || 'Mejorar plan', 16), 'Añadir', clamp(score + 2, 0, 100)),
        signal('Ban', smartText(thirdFlow.value || 'Proteger', 16), 'Bloquear', clamp(score - 8, 0, 100)),
      ];
    case 'advanced':
    default:
      return [
        signal('Coherencia', smartText(summary || title || 'Lectura estable', 16), 'IA', clamp(score, 0, 100)),
        signal('Métrica', smartText(firstFlow.value || 'Lectura estable', 16), 'Dato', clamp(score - 6, 0, 100)),
        signal('Señal', smartText(secondFlow.value || secondFlow.meta || 'Motor', 16), 'Clave', clamp(score - 10, 0, 100)),
      ];
  }
}

function signal(label, value, chip, score) {
  return {
    label,
    value,
    chip,
    score: clamp(Math.round(Number(score) || 0), 0, 100),
  };
}

function renderSignal(signalData) {
  const tone = toneFromScore(signalData.score);
  return `
    <article class="composition-story__signal composition-story__signal--${tone}">
      <div class="composition-story__signal-head">
        <span class="composition-story__signal-label">${escapeHtml(signalData.label)}</span>
        <span class="composition-story__signal-chip">${escapeHtml(signalData.chip)}</span>
      </div>
      <strong class="composition-story__signal-value">${escapeHtml(signalData.value)}</strong>
      <div class="composition-story__signal-meter" aria-hidden="true">
        <span style="width:${signalData.score}%"></span>
      </div>
    </article>
  `;
}

function toneState(score) {
  if (score >= 75) return { tone: 'good', label: 'Fuerte' };
  if (score >= 55) return { tone: 'neutral', label: 'Equilibrada' };
  return { tone: 'bad', label: 'Frágil' };
}

function smartText(value, maxLength) {
  const text = textOf({ textContent: value });
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(8, maxLength - 1)).trimEnd()}…`;
}

function textOf(element) {
  return String(element?.textContent || '').replace(/\s+/g, ' ').trim();
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

  observer.observe(root, {
    childList: true,
    subtree: true,
  });
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
