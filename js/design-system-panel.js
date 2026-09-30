const TOKENS = [
  { name: 'Success', value: '#46d3a1', className: 'palette-swatch--success' },
  { name: 'Warning', value: '#ffd18a', className: 'palette-swatch--warning' },
  { name: 'Danger', value: '#ff7a7a', className: 'palette-swatch--danger' },
  { name: 'Info', value: '#7c8cff', className: 'palette-swatch--info' },
  { name: 'Coach', value: '#b56eff', className: 'palette-swatch--coach' },
  { name: 'Neutral', value: '#8b96ad', className: 'palette-swatch--neutral' },
];

const HERO_SAMPLE = {
  title: 'Front to Back',
  subtitle: 'Identidad dominante de la composición actual.',
  stats: [
    { label: 'Win condition', value: 'Escalar y ganar 5v5', detail: 'Peleas ordenadas y carry protegido.' },
    { label: 'Tempo', value: 'Early → Mid', detail: 'Ventana fuerte para convertir ventaja.' },
    { label: 'Coherencia', value: '92%', detail: 'Plan alineado entre frontline, engage y daño.' },
    { label: 'Complejidad', value: 'Media', detail: 'Fácil de leer, exige buena ejecución.' },
  ],
  chips: ['Protect', 'Dive', 'Teamfight'],
};

const METRICS = [
  { label: 'Engage', score: 8, detail: 'Capacidad de iniciar con seguridad.', variant: 'good' },
  { label: 'Frontline', score: 9, detail: 'Espacio para que el carry pegue.', variant: 'good' },
  { label: 'Peel', score: 7, detail: 'Protección del backline y del tirador.', variant: 'good' },
  { label: 'Escalado', score: 8, detail: 'Gana valor con el tiempo.', variant: 'info' },
  { label: 'Poke', score: 3, detail: 'Daño a distancia limitado.', variant: 'warn' },
  { label: 'Movilidad', score: 4, detail: 'Poca capacidad para reposicionarse.', variant: 'danger' },
];

const ADVICE = [
  {
    type: 'coach',
    label: 'Coach',
    title: 'Power spike: nivel 11',
    body: 'No fuerces peleas largas antes del segundo pico de poder.',
  },
  {
    type: 'advisor',
    label: 'Strategic Advisor',
    title: 'Objetivo principal: escalar',
    body: 'Prioriza dragones y Nashor cuando el equipo llegue junto.',
  },
  {
    type: 'warning',
    label: 'Risk',
    title: 'Evita peleas desordenadas',
    body: 'La composición pierde mucho valor si entra por separado.',
  },
];

const TIMELINE = [
  { stage: 'Early', title: 'Farm y visión', detail: 'Evita peleas largas hasta tener herramientas clave.' },
  { stage: 'Mid', title: 'Objetivos y rotaciones', detail: 'Usa la prioridad de línea para mover primero.' },
  { stage: 'Late', title: '5v5 y cierre', detail: 'Protege al carry y juega la teamfight decisiva.' },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderHeroSample() {
  return `
    <section class="hero-card">
      <div class="hero-card__head">
        <p class="eyebrow">Hero card</p>
        <h3 class="hero-card__title">${escapeHtml(HERO_SAMPLE.title)}</h3>
        <p class="hero-card__subtitle">${escapeHtml(HERO_SAMPLE.subtitle)}</p>
      </div>

      <div class="hero-card__grid">
        ${HERO_SAMPLE.stats
          .map(
            (stat) => `
              <article class="hero-card__meta">
                <span class="hero-card__meta-label">${escapeHtml(stat.label)}</span>
                <strong class="hero-card__meta-value">${escapeHtml(stat.value)}</strong>
                <span class="hero-card__meta-detail">${escapeHtml(stat.detail)}</span>
              </article>
            `
          )
          .join('')}
      </div>

      <div class="hero-card__actions">
        ${HERO_SAMPLE.chips.map((chip) => `<span class="chip chip--success">${escapeHtml(chip)}</span>`).join('')}
      </div>
    </section>
  `;
}

function renderMetrics() {
  return `
    <section class="component-sample">
      <div class="stack stack--compact">
        <p class="eyebrow">Metric cards</p>
        <h4>Lenguaje visual común para todas las métricas</h4>
      </div>
      <div class="stack">
        ${METRICS.map(renderMetricCard).join('')}
      </div>
    </section>
  `;
}

function renderMetricCard(metric) {
  const width = Math.max(8, Math.min(100, metric.score * 10));
  const variantClass = metric.variant ? `metric-card--${metric.variant}` : '';
  return `
    <article class="metric-card ${variantClass}">
      <div class="metric-card__head">
        <strong>${escapeHtml(metric.label)}</strong>
        <span class="metric-card__score">${metric.score}/10</span>
      </div>
      <div class="metric-card__bar" aria-hidden="true">
        <span class="metric-card__fill" style="width: ${width}%;"></span>
      </div>
      <p class="metric-card__detail">${escapeHtml(metric.detail)}</p>
    </article>
  `;
}

function renderAdvice() {
  return `
    <section class="component-sample">
      <div class="stack stack--compact">
        <p class="eyebrow">Advice cards</p>
        <h4>Coach y Strategic Advisor comparten el mismo lenguaje</h4>
      </div>
      <div class="stack">
        ${ADVICE.map((card) => renderAdviceCard(card)).join('')}
      </div>
    </section>
  `;
}

function renderAdviceCard(card) {
  return `
    <article class="advice-card advice-card--${escapeHtml(card.type)}">
      <div class="advice-card__head">
        <span class="advice-card__label">${escapeHtml(card.label)}</span>
        <span class="badge badge--${escapeHtml(card.type === 'warning' ? 'warning' : card.type === 'coach' ? 'coach' : 'info')}">${escapeHtml(card.type.toUpperCase())}</span>
      </div>
      <h4 class="advice-card__title">${escapeHtml(card.title)}</h4>
      <p class="advice-card__text">${escapeHtml(card.body)}</p>
    </article>
  `;
}

function renderTimeline() {
  return `
    <section class="timeline-card">
      <div class="stack stack--compact">
        <p class="eyebrow">Timeline</p>
        <h4>Cómo se lee la partida de principio a fin</h4>
      </div>
      <div class="timeline">
        ${TIMELINE.map((step, index) => renderTimelineStep(step, index + 1)).join('')}
      </div>
    </section>
  `;
}

function renderTimelineStep(step, index) {
  return `
    <article class="timeline__step">
      <span class="timeline__dot">${index}</span>
      <div>
        <span class="timeline__label">${escapeHtml(step.stage)}</span>
        <h4 class="timeline__title">${escapeHtml(step.title)}</h4>
        <p class="timeline__detail">${escapeHtml(step.detail)}</p>
      </div>
    </article>
  `;
}

function renderTokens() {
  return `
    <section class="component-sample">
      <div class="stack stack--compact">
        <p class="eyebrow">Design tokens</p>
        <h4>Colores semánticos y base del sistema</h4>
      </div>
      <div class="palette-grid">
        ${TOKENS.map((token) => renderToken(token)).join('')}
      </div>
    </section>
  `;
}

function renderToken(token) {
  return `
    <article class="palette-swatch ${escapeHtml(token.className)}">
      <span class="palette-swatch__preview" aria-hidden="true"></span>
      <span class="palette-swatch__name">${escapeHtml(token.name)}</span>
      <span class="palette-swatch__hex">${escapeHtml(token.value)}</span>
    </article>
  `;
}

function renderChipsAndBadges() {
  return `
    <section class="component-sample">
      <div class="stack stack--compact">
        <p class="eyebrow">Chips & badges</p>
        <h4>Identidades, estados y niveles de prioridad</h4>
      </div>
      <div class="stack stack--spaced">
        <div class="hero-card__actions">
          <span class="chip chip--success">Protect</span>
          <span class="chip chip--success">Dive</span>
          <span class="chip chip--info">Teamfight</span>
          <span class="chip chip--coach">Coach</span>
        </div>
        <div class="hero-card__actions">
          <span class="severity-badge severity-badge--danger">CRÍTICO</span>
          <span class="severity-badge severity-badge--warning">MEDIO</span>
          <span class="severity-badge severity-badge--success">FUERTE</span>
          <span class="severity-badge severity-badge--info">NEUTRO</span>
        </div>
      </div>
    </section>
  `;
}

function init() {
  const root = document.getElementById('designSystem');
  if (!root) return;

  root.innerHTML = `
    <section class="design-system">
      <div class="design-system__header hero-card">
        <div class="hero-card__head">
          <p class="eyebrow">Design System v1</p>
          <h3 class="hero-card__title">Lenguaje visual común de Rift Architect</h3>
          <p class="hero-card__subtitle">Una capa compartida para que el dashboard, el simulador y los futuros módulos hablen el mismo idioma visual.</p>
        </div>
        <div class="hero-card__actions">
          <span class="badge badge--info">Core</span>
          <span class="badge badge--coach">Coach</span>
          <span class="badge badge--success">Fortalezas</span>
          <span class="badge badge--danger">Riesgos</span>
        </div>
      </div>

      <div class="design-system__grid">
        ${renderTokens()}
        ${renderHeroSample()}
        ${renderMetrics()}
        ${renderAdvice()}
        ${renderTimeline()}
        ${renderChipsAndBadges()}
      </div>
    </section>
  `;
}

init();
