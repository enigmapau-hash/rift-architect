import { analyzeComposition } from './analyzer.js';

const WORKBOOK_URL = './Draft%20Pool.xlsx';
const DATA_MANIFEST_URL = './data/index.json';
const ROLE_FILES = [
  { key: 'top', file: './data/top.json', sheet: 'Tabla Top' },
  { key: 'jungle', file: './data/jungle.json', sheet: 'Tabla Jungla' },
  { key: 'mid', file: './data/mid.json', sheet: 'Tabla Mid' },
  { key: 'botline', file: './data/bot.json', sheet: 'Tabla Botline' },
  { key: 'support', file: './data/support.json', sheet: 'Tabla Support' },
];

const state = {
  data: new Map(),
  loaded: false,
  patchScheduled: false,
  openCard: null,
};

const els = { root: null };

init().catch((error) => console.error(error));

async function init() {
  els.root = document.getElementById('storyView');
  if (!els.root) return;

  bindEvents();
  await loadRoleData();
  observeComposition();
  renderStory();
}

function bindEvents() {
  els.root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-accordion-toggle]');
    if (!trigger || !els.root.contains(trigger)) return;
    toggleCard(String(trigger.dataset.accordionToggle || ''));
  });
}

function toggleCard(cardKey) {
  if (!cardKey) return;
  state.openCard = state.openCard === cardKey ? null : cardKey;
  renderStory();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function asText(value, fallback = 'Sin definir') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => asText(item, '')).filter(Boolean).join(' · ') || fallback;
  if (typeof value === 'object') {
    return asText(
      value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '',
      fallback,
    );
  }
  return String(value) || fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function gradeFromScore(score) {
  if (score >= 95) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 72) return 'B';
  if (score >= 64) return 'C+';
  if (score >= 56) return 'C';
  return 'D';
}

function normalizeEntry(item) {
  return {
    label: asText(item?.label ?? item?.name ?? item?.title ?? item?.text ?? item?.value ?? item?.champion ?? item, 'Sin definir'),
    detail: asText(item?.detail ?? item?.summary ?? item?.description ?? item?.reason ?? item?.note ?? item?.explanation ?? item?.message ?? '', ''),
    score: Number.isFinite(Number(item?.score)) ? Math.round(Number(item.score)) : null,
  };
}

function normalizeSelectedChampion(champion) {
  if (!champion) return null;
  return {
    role: champion.role,
    champion: champion.champion,
    identity: champion.identity,
    function: champion.function,
    tempo: champion.tempo,
    strengths: asArray(champion.strengths),
    weaknesses: asArray(champion.weaknesses),
  };
}

async function loadRoleData() {
  if (state.loaded) return;
  state.loaded = true;

  const loaded = (await loadJsonDataset()) || (await loadWorkbookDataset());
  if (loaded) {
    Object.entries(loaded).forEach(([key, rows]) => state.data.set(key, Array.isArray(rows) ? rows : []));
    return;
  }

  ROLE_FILES.forEach(({ key }) => state.data.set(key, []));
}

async function loadJsonDataset() {
  try {
    const manifestResponse = await fetch(DATA_MANIFEST_URL, { cache: 'reload' });
    if (!manifestResponse.ok) return null;

    const manifest = await manifestResponse.json();
    if (!Array.isArray(manifest?.files) || !manifest.files.length) return null;

    const loaded = await Promise.all(
      ROLE_FILES.map(async ({ key, file }) => {
        const response = await fetch(file, { cache: 'reload' });
        if (!response.ok) throw new Error(`No se pudo leer ${file}`);
        return [key, await response.json()];
      }),
    );

    return Object.fromEntries(loaded);
  } catch {
    return null;
  }
}

async function loadWorkbookDataset() {
  if (!window.XLSX) return null;

  try {
    const response = await fetch(WORKBOOK_URL, { cache: 'reload' });
    if (!response.ok) return null;

    const workbook = window.XLSX.read(await response.arrayBuffer(), { type: 'array' });
    const dataset = {};
    ROLE_FILES.forEach(({ key, sheet }) => {
      dataset[key] = worksheetToRows(workbook.Sheets[sheet]);
    });
    return dataset;
  } catch {
    return null;
  }
}

function worksheetToRows(worksheet) {
  if (!worksheet) return [];
  const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
  return rows
    .slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      champion: String(row[0]).trim(),
      identity: String(row[1] || '').trim(),
      function: String(row[2] || '').trim(),
      tempo: String(row[3] || '').trim(),
      strengths: splitTags(row[4]),
      weaknesses: splitTags(row[5]),
    }));
}

function splitTags(value) {
  if (!value) return [];
  return String(value).split('·').map((part) => part.trim()).filter(Boolean);
}

function findChampion(roleKey, championName) {
  const normalizedName = String(championName || '').trim().toLowerCase();
  const rows = state.data.get(roleKey) || [];
  return rows.find((item) => String(item?.champion || '').trim().toLowerCase() === normalizedName) || null;
}

function collectSelectedChampions() {
  return [...document.querySelectorAll('#compositionGrid .slot.is-filled')]
    .map((slot) => {
      const role = String(slot.dataset.role || 'top');
      const name = slot.querySelector('.slot__name')?.textContent?.trim() || '';
      const champion = findChampion(role, name);
      return normalizeSelectedChampion(champion ? { role, ...champion } : null);
    })
    .filter(Boolean);
}

function findChampionByTags(selectedChampions, tags = []) {
  return selectedChampions.find((champion) => {
    const values = [champion.champion, champion.identity, champion.function, champion.tempo, ...asArray(champion.strengths), ...asArray(champion.weaknesses)];
    return values.some((value) => tags.some((tag) => normalizeText(asText(value)).includes(normalizeText(tag))));
  });
}

function formatTags(values = []) {
  return uniqueValues(asArray(values).map((item) => asText(item)).filter(Boolean)).join(' · ');
}

function buildStoryModel(analysis, selectedChampions) {
  const weaknesses = asArray(analysis?.weaknesses).slice(0, 3).map(normalizeEntry);
  const plan = asArray(analysis?.gamePlan).slice(0, 3).map((step) => asText(step));
  const phases = asArray(analysis?.tempoDetail?.phases).slice(0, 3).map((phase) => asText(phase));
  const tempo = analysis?.tempoDetail?.label || analysis?.tempo || 'tu ventana natural de poder';
  const coach = analysis?.coach || analysis?.assistant || {};
  const advisor = analysis?.advisor || analysis?.assistant || {};
  const draftAssistant = analysis?.draftAssistant || {};

  const engager = findChampionByTags(selectedChampions, ['engage', 'iniciación', 'iniciacion', 'frontline', 'start']);
  const carry = findChampionByTags(selectedChampions, ['adc', 'carry', 'hypercarry', 'escalado']);
  const protector = findChampionByTags(selectedChampions, ['peel', 'protect', 'shield']);
  const frontline = findChampionByTags(selectedChampions, ['frontline', 'tanque', 'front', 'defensa']);
  const keyPiece = carry || engager || protector || frontline || selectedChampions[0] || null;

  const coherenceScore = Number.isFinite(Number(analysis?.coherence?.score))
    ? Number(analysis.coherence.score)
    : Number.isFinite(Number(analysis?.confidence))
      ? Number(analysis.confidence)
      : 0;
  const roleCoverage = Math.round((new Set(asArray(selectedChampions).map((champion) => champion.role).filter(Boolean)).size / ROLE_FILES.length) * 100);
  const score = Math.max(0, Math.min(100, Math.round((coherenceScore * 0.65) + (roleCoverage * 0.2) + (Math.max(40, 100 - weaknesses.length * 14) * 0.15))));
  const grade = gradeFromScore(score);

  const objectivePriority = uniqueValues(asArray(advisor.objectivePriority).slice(0, 3).map((item) => asText(item))).filter(Boolean);
  const loseConditions = uniqueValues(asArray(advisor.loseConditions).slice(0, 3).map((item) => asText(item))).filter(Boolean);

  const priorities = [
    objectivePriority[0] || plan[0] || 'Ganar tempo y visión',
    objectivePriority[1] || plan[1] || 'Agruparte en tu ventana de poder',
    keyPiece ? `Cuidar a ${keyPiece.champion}` : 'Proteger tu pieza clave',
  ].filter(Boolean);

  const avoid = uniqueValues([
    loseConditions[0] || weaknesses[0]?.label || 'Iniciar sin visión',
    loseConditions[1] || weaknesses[1]?.label || 'Dividir el equipo sin motivo',
    loseConditions[2] || 'Forzar peleas antes del pico de poder',
  ].filter(Boolean)).slice(0, 2);

  const summaryText = analysis?.summaryText || `Tu composición gira alrededor de ${analysis?.primaryIdentity || 'una identidad todavía imprecisa'} y necesita una lectura simple para convertir esa idea en decisiones.`;
  const whyItems = uniqueValues([
    analysis?.primaryIdentity || 'Identidad no definida',
    analysis?.winCondition?.label || 'Win condition no definida',
    analysis?.coherence?.label || 'Coherencia no definida',
    ...(analysis?.metrics || []).map((metric) => asText(metric?.label)).filter(Boolean),
  ].filter(Boolean)).slice(0, 4);

  const draftPriorities = asArray(draftAssistant.priorities)
    .slice(0, 3)
    .map((item) => ({
      label: asText(item?.label ?? item),
      detail: asText(item?.detail ?? item?.impact ?? item?.priority ?? ''),
      meta: asText(item?.impact ?? item?.priority ?? ''),
    }));

  const draftPicks = asArray(draftAssistant.pickRecommendations)
    .slice(0, 3)
    .map((item) => ({
      label: asText(item?.label ?? item?.action ?? 'Pick flexible'),
      detail: asText(item?.detail ?? item?.profileLabel ?? ''),
      meta: uniqueValues([
        asText(item?.profileLabel ?? ''),
        formatTags(item?.classTags),
        asText(item?.confidenceLabel ?? ''),
      ].filter(Boolean)).join(' · '),
    }));

  const draftBans = asArray(draftAssistant.banRecommendations)
    .slice(0, 3)
    .map((item) => ({
      label: asText(item?.label ?? item?.action ?? 'Ban flexible'),
      detail: asText(item?.detail ?? item?.profileLabel ?? ''),
      meta: uniqueValues([
        asText(item?.profileLabel ?? ''),
        formatTags(item?.classTags),
        asText(item?.focus ?? ''),
      ].filter(Boolean)).join(' · '),
    }));

  const draftSummary = asText(
    draftAssistant.summary ||
      draftAssistant.profileSummary ||
      'La composición todavía pide completar huecos concretos con picks y bans que protejan el plan.'
  );

  const executive = analysis?.executiveSummary || {};
  const executiveScore = Number.isFinite(Number(executive.score)) ? Number(executive.score) : score;

  return {
    score,
    grade,
    identity: analysis?.primaryIdentity || 'Sin identidad clara',
    summaryText,
    win: analysis?.winCondition?.detail || analysis?.winCondition?.label || 'Escala y gana la pelea correcta en tu ventana de poder.',
    tempo,
    phases,
    priorities,
    avoid,
    keyPiece,
    weaknesses,
    whyItems,
    quickCoach: asText(coach.headline || coach.summary || 'Juega alrededor de tu identidad.'),
    summaryStat: [`${grade} · ${score}/100`, `Pico: ${tempo}`, `${selectedChampions.length}/5 roles`],
    draft: {
      summary: draftSummary,
      priorities: draftPriorities,
      picks: draftPicks,
      bans: draftBans,
    },
    advanced: {
      coherenceLabel: analysis?.coherence?.label || 'Coherencia',
      coherenceDetail: analysis?.coherence?.detail || 'La consistencia del plan se apoya en el motor y en la composición seleccionada.',
      metrics: asArray(analysis?.metrics).slice(0, 4).map(normalizeEntry),
      insights: uniqueValues(asArray(coach.insights).map((item) => asText(item?.label ?? item)).filter(Boolean)).slice(0, 3),
      alerts: uniqueValues(asArray(coach.alerts).map((item) => asText(item?.label ?? item)).filter(Boolean)).slice(0, 3),
    },
    executive,
    executiveScore,
  };
}

function renderFlowItem(label = '', value = '', meta = '', tone = '') {
  return `
    <article class="design-system-flow__item ${tone}">
      <span class="design-system-flow__label">${escapeHtml(label)}</span>
      <p class="design-system-flow__value">${escapeHtml(value)}</p>
      ${meta ? `<p class="design-system-flow__meta">${escapeHtml(meta)}</p>` : ''}
    </article>
  `;
}

function renderMotorTrace(title, rows = []) {
  if (!rows.length) return '';
  return `
    <article class="design-system-card design-system-card--detail motor-trace">
      <span class="design-system-badge design-system-badge--muted">Motor</span>
      <div class="design-system-flow">
        <article class="design-system-flow__item is-hero">
          <span class="design-system-flow__label">Fuente</span>
          <p class="design-system-flow__value">${escapeHtml(title)}</p>
          <p class="design-system-flow__meta">De dónde sale este bloque del análisis.</p>
        </article>
        ${rows.map((row, index) => {
          const tone = index === 0 ? 'is-hero' : index === 1 ? 'is-primary' : 'is-warning';
          return `
            <article class="design-system-flow__item ${tone}">
              <span class="design-system-flow__label">${escapeHtml(row.label)}</span>
              <p class="design-system-flow__value">${escapeHtml(row.value)}</p>
              ${row.detail ? `<p class="design-system-flow__meta">${escapeHtml(row.detail)}</p>` : ''}
            </article>
          `;
        }).join('')}
      </div>
    </article>
  `;
}

function renderAccordionCard({ key, title, kicker, summary, meta = [], body = '', traceTitle = '', traceRows = [] }) {
  const isOpen = state.openCard === key;
  return `
    <article class="design-system-card design-system-card--accordion ${isOpen ? 'is-open' : ''}" data-accordion-card="${escapeHtml(key)}">
      <button
        type="button"
        class="design-system-card__summary"
        data-accordion-toggle="${escapeHtml(key)}"
        aria-expanded="${String(isOpen)}"
      >
        <div class="design-system-card__summary-main">
          <span class="design-system-badge">${escapeHtml(kicker)}</span>
          <strong class="design-system-card__title">${escapeHtml(title)}</strong>
          <p class="design-system-card__summary-copy">${escapeHtml(summary)}</p>
        </div>
        <div class="design-system-card__summary-meta">
          ${meta.map((item) => `<span class="design-system-badge design-system-badge--muted">${escapeHtml(item)}</span>`).join('')}
          <span class="design-system-card__toggle design-system-card__toggle--closed">▼ Ver análisis</span>
          <span class="design-system-card__toggle design-system-card__toggle--open">▲ Ocultar análisis</span>
        </div>
      </button>
      <div class="design-system-card__body" ${isOpen ? '' : 'hidden'}>
        ${body}
        ${traceTitle || traceRows.length ? renderMotorTrace(traceTitle || title, traceRows) : ''}
      </div>
    </article>
  `;
}

function renderStory() {
  if (!els.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    els.root.innerHTML = `
      <section class="composition-story composition-story--empty">
        <h3>Selecciona cinco campeones para ver el análisis</h3>
        <p>El resumen compacto y el razonamiento aparecen cuando la composición está completa.</p>
      </section>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildStoryModel(analysis, selectedChampions);

  const cards = [
    renderAccordionCard({
      key: 'composition',
      title: 'Tu composición',
      kicker: 'Identidad',
      summary: model.summaryText,
      meta: model.summaryStat,
      body: `
        <div class="design-system-flow">
          ${renderFlowItem('Identidad', model.identity, `Confianza ${model.grade} · ${model.score}/100`, 'is-hero')}
          ${renderFlowItem('Pieza clave', model.keyPiece ? model.keyPiece.champion : 'Sin pieza clave', model.keyPiece ? [model.keyPiece.function, model.keyPiece.identity, model.keyPiece.tempo].filter(Boolean).join(' · ') : 'Todavía no hay una pieza clave clara.', 'is-primary')}
          ${renderFlowItem('Lectura', model.quickCoach, 'La composición se entiende desde su identidad.', 'is-warning')}
        </div>
      `,
      traceTitle: 'Executive Summary + Coach',
      traceRows: [
        { label: 'Resumen ejecutivo', value: model.executive.title || model.identity, detail: model.executive.text || model.summaryText },
        { label: 'Fuente principal', value: uniqueValues([model.identity, model.win, model.tempo]).join(' · ') || 'Identidad + condición de victoria + tempo', detail: 'La lectura sale del motor y de la composición.' },
        { label: 'Confianza', value: `${model.grade} · ${model.executiveScore || model.score}/100`, detail: 'La confianza sintetiza la coherencia del draft.' },
      ],
    }),
    renderAccordionCard({
      key: 'victory',
      title: 'Plan de victoria',
      kicker: 'Cómo gana',
      summary: model.win,
      meta: [`Pico: ${model.tempo}`, `${model.phases.length} fases`],
      body: `
        <div class="design-system-flow">
          ${renderFlowItem('Win condition', model.win, model.quickCoach, 'is-primary')}
          ${renderFlowItem('Tempo', model.tempo, 'Cuándo es más fuerte esta composición.', 'is-hero')}
          ${renderFlowItem('Fases', model.phases.join(' · ') || 'Sin fases definidas', 'Early · Mid · Late', 'is-warning')}
        </div>
      `,
      traceTitle: 'Advisor + tempo',
      traceRows: [
        { label: 'Objetivo principal', value: analysis?.advisor?.primaryObjective || model.win, detail: analysis?.advisor?.summary?.reason || model.win },
        { label: 'Ventanas', value: model.phases.join(' · ') || 'Early · Mid · Late', detail: 'Dónde debe crecer el plan.' },
        { label: 'Pico de poder', value: model.tempo, detail: 'La ventana natural de victoria.' },
      ],
    }),
    renderAccordionCard({
      key: 'priorities',
      title: 'Prioridades',
      kicker: 'Qué hacer ahora',
      summary: model.priorities[0] || 'Ganar tempo y visión',
      meta: [`${model.priorities.length} pasos`, 'Plan activo'],
      body: `
        <div class="design-system-flow">
          ${model.priorities.map((priority, index) => renderFlowItem(`Prioridad ${index + 1}`, priority, index === 0 ? 'La más importante ahora' : 'Siguiente paso del plan', index === 0 ? 'is-primary' : '')).join('')}
          ${renderFlowItem('Coach', model.quickCoach, 'El criterio que ordena todo el plan.', 'is-hero')}
        </div>
      `,
      traceTitle: 'Checklist + Coach',
      traceRows: [
        { label: 'Checklist', value: model.priorities.slice(0, 3).join(' · ') || 'Sin checklist', detail: 'Pasos que el plan necesita cumplir.' },
        { label: 'Prioridades IA', value: model.priorities.slice(0, 3).join(' · ') || 'Sin prioridades', detail: 'Lo más importante ahora mismo.' },
        { label: 'Coach', value: model.quickCoach, detail: 'El criterio que ordena la ejecución.' },
      ],
    }),
    renderAccordionCard({
      key: 'risks',
      title: 'Riesgos',
      kicker: 'Qué evitar',
      summary: model.avoid[0] || 'Forzar peleas malas',
      meta: [`${model.weaknesses.length} debilidades`, `${model.avoid.length} riesgos`],
      body: `
        <div class="design-system-flow">
          ${model.avoid.map((risk, index) => renderFlowItem(`Riesgo ${index + 1}`, risk, index === 0 ? 'El más castigado' : 'Compensar a tiempo', index === 0 ? 'is-warning' : '')).join('')}
          ${model.weaknesses.map((item) => renderFlowItem(item.label, item.detail || 'Sin detalle adicional', item.score !== null ? `${item.score}/10` : 'Debilidad detectada', '')).join('')}
        </div>
      `,
      traceTitle: 'Errores críticos + debilidades',
      traceRows: [
        { label: 'Errores críticos', value: model.avoid.join(' · ') || 'Sin errores críticos', detail: 'Lo que más castiga el plan.' },
        { label: 'Riesgo mayor', value: model.avoid[0] || 'Sin riesgo claro', detail: 'La amenaza principal que conviene vigilar.' },
        { label: 'Debilidades', value: model.weaknesses.slice(0, 3).map((item) => item.label).join(' · ') || 'Sin debilidades visibles', detail: 'Se conectan al perfil del draft.' },
      ],
    }),
    renderAccordionCard({
      key: 'draft',
      title: 'Draft',
      kicker: 'Picks y bans',
      summary: model.draft.summary,
      meta: [`${model.draft.picks.length} picks`, `${model.draft.bans.length} bans`],
      body: `
        <div class="design-system-flow">
          ${renderFlowItem('Resumen', model.draft.summary, model.draft.priorities[0]?.detail || 'El draft completa el plan de la composición.', 'is-hero')}
          ${model.draft.priorities.map((item, index) => renderFlowItem(`Necesidad ${index + 1}`, item.label, item.detail || item.meta || 'Necesidad detectada', index === 0 ? 'is-primary' : '')).join('')}
          ${model.draft.picks.map((item, index) => renderFlowItem(`Pick ${index + 1}`, item.label, [item.detail, item.meta].filter(Boolean).join(' · ') || 'Completar el plan.', index === 0 ? 'is-primary' : '')).join('')}
          ${model.draft.bans.map((item, index) => renderFlowItem(`Ban ${index + 1}`, item.label, [item.detail, item.meta].filter(Boolean).join(' · ') || 'Bloquear una amenaza clave.', index === 0 ? 'is-warning' : '')).join('')}
        </div>
      `,
      traceTitle: 'Need Engine + picks/bans',
      traceRows: [
        { label: 'Necesidades', value: model.draft.priorities.map((item) => item.label).join(' · ') || 'Sin necesidades', detail: 'Huecos que el draft debe cubrir.' },
        { label: 'Picks', value: model.draft.picks.map((item) => item.label).join(' · ') || 'Sin picks', detail: 'Opciones que completan el plan.' },
        { label: 'Bans', value: model.draft.bans.map((item) => item.label).join(' · ') || 'Sin bans', detail: 'Amenazas que frenan el plan.' },
      ],
    }),
    renderAccordionCard({
      key: 'advanced',
      title: 'Análisis avanzado',
      kicker: 'Por qué',
      summary: model.advanced.coherenceLabel,
      meta: [`${model.advanced.metrics.length} métricas`, `${model.advanced.insights.length} insights`],
      body: `
        <div class="design-system-flow">
          ${renderFlowItem('Razonamiento', model.quickCoach, 'La explicación resumida de la IA.', 'is-hero')}
          ${renderFlowItem('Coherencia', model.advanced.coherenceLabel, model.advanced.coherenceDetail || `Confianza global ${model.score}/100`, 'is-primary')}
          ${renderFlowItem('Señales', model.whyItems.join(' · ') || 'Sin señales destacadas', 'Evidencias que sostienen la lectura.', 'is-warning')}
          ${model.advanced.metrics.map((metric, index) => renderFlowItem(metric.label, `${metric.score ?? 0}/10`, index === 0 ? 'Métrica agregada' : 'Señal cuantitativa', '')).join('')}
          ${model.advanced.insights.map((insight, index) => renderFlowItem(`Insight ${index + 1}`, insight, 'Consejo táctico del motor.', index === 0 ? 'is-primary' : '')).join('')}
          ${model.advanced.alerts.length ? renderFlowItem('Alertas', model.advanced.alerts.join(' · '), 'Puntos que conviene vigilar.', 'is-warning') : ''}
        </div>
      `,
      traceTitle: 'Explainability Engine',
      traceRows: [
        { label: 'Ejecución', value: model.quickCoach, detail: 'Cómo se ordena la partida.' },
        { label: 'Métricas', value: model.advanced.metrics.map((item) => `${item.label} ${item.score ?? 0}/10`).join(' · ') || 'Sin métricas', detail: 'Señales cuantitativas del motor.' },
        { label: 'Razón', value: model.advanced.coherenceLabel, detail: model.advanced.coherenceDetail || 'La consistencia del plan se apoya en el motor y la composición.' },
      ],
    }),
  ];

  els.root.innerHTML = `
    <section class="composition-story composition-story--accordion" style="grid-template-columns:minmax(0,1fr);gap:12px;">
      ${cards.join('')}
    </section>
  `;
}

function observeComposition() {
  const node = document.getElementById('compositionGrid');
  if (!node) {
    window.requestAnimationFrame(observeComposition);
    return;
  }

  const observer = new MutationObserver(schedulePatch);
  observer.observe(node, { childList: true, subtree: true, characterData: true });
}

function schedulePatch() {
  if (state.patchScheduled) return;
  state.patchScheduled = true;
  window.requestAnimationFrame(() => {
    state.patchScheduled = false;
    renderStory();
  });
}
