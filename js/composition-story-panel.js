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
};

const els = { root: null };

init().catch((error) => console.error(error));

async function init() {
  els.root = document.getElementById('storyView');
  if (!els.root) return;

  await loadRoleData();
  observeComposition();
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
  const label = asText(item?.label ?? item?.name ?? item?.title ?? item?.text ?? item?.value ?? item?.champion ?? item, 'Sin definir');
  const detail = asText(item?.detail ?? item?.summary ?? item?.description ?? item?.reason ?? item?.note ?? item?.explanation ?? item?.message ?? '', '');
  const score = Number.isFinite(Number(item?.score)) ? Math.round(Number(item.score)) : null;
  return { label, detail, score };
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
  return String(value)
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
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

function buildStoryModel(analysis, selectedChampions) {
  const strengths = asArray(analysis?.strengths).map(normalizeEntry);
  const weaknesses = asArray(analysis?.weaknesses).map(normalizeEntry);
  const plan = asArray(analysis?.gamePlan).slice(0, 3).map((step) => asText(step));
  const phases = asArray(analysis?.tempoDetail?.phases).slice(0, 3).map((phase) => asText(phase));
  const tempo = analysis?.tempoDetail?.label || analysis?.tempo || 'tu ventana natural de poder';
  const coach = analysis?.coach || analysis?.assistant || {};
  const advisor = analysis?.advisor || analysis?.assistant || {};
  const engager = findChampionByTags(selectedChampions, ['engage', 'iniciación', 'iniciacion', 'frontline', 'start']);
  const carry = findChampionByTags(selectedChampions, ['adc', 'carry', 'hypercarry', 'escalado']);
  const protector = findChampionByTags(selectedChampions, ['peel', 'protect', 'shield']);
  const frontline = findChampionByTags(selectedChampions, ['frontline', 'tanque', 'front', 'defensa']);
  const keyPiece = carry || engager || protector || frontline || selectedChampions[0] || null;

  const coherence = Number.isFinite(Number(analysis?.coherence?.score))
    ? Number(analysis.coherence.score)
    : Number.isFinite(Number(analysis?.confidence))
      ? Number(analysis.confidence)
      : 0;
  const roleCoverage = Math.round((new Set(asArray(selectedChampions).map((champion) => champion.role).filter(Boolean)).size / ROLE_FILES.length) * 100);
  const score = Math.max(0, Math.min(100, Math.round((coherence * 0.65) + (roleCoverage * 0.2) + (Math.max(40, 100 - weaknesses.length * 14) * 0.15))));
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
  ].filter(Boolean)).slice(0, 3);

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
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    whyItems,
    quickCoach: asText(coach.headline || coach.summary || 'Juega alrededor de tu identidad.'),
  };
}

function renderChip(label = '', value = '', tone = '') {
  return `
    <article class="design-system-chip ${tone}">
      <span class="design-system-chip__label">${escapeHtml(label)}</span>
      <strong class="design-system-chip__value">${escapeHtml(value)}</strong>
    </article>
  `;
}

function renderHero(model) {
  return `
    <article class="design-system-card design-system-card--hero">
      <div class="design-system-card__header">
        <span class="design-system-badge">Tu composición</span>
        <span class="design-system-badge design-system-badge--muted">Resumen ejecutivo</span>
      </div>

      <h3 class="design-system-card__title">${escapeHtml(model.identity)}</h3>
      <p class="design-system-card__copy">${escapeHtml(model.summaryText)}</p>

      <div class="design-system-chip-row">
        ${renderChip(`${model.grade} · ${model.score}/100`, model.quickCoach, 'is-primary')}
        ${renderChip('Pico', model.tempo)}
        ${renderChip('Pieza clave', model.keyPiece ? model.keyPiece.champion : 'Sin definir', 'is-warning')}
      </div>
    </article>
  `;
}

function renderCompactList(items = [], fallback = 'Sin datos claros.') {
  if (!items.length) {
    return `<p class="design-system-expandable__muted">${escapeHtml(fallback)}</p>`;
  }

  return `
    <div class="design-system-expandable__list">
      ${items.map((item) => `
        <article class="design-system-expandable__item">
          <div class="design-system-expandable__item-head">
            <strong>${escapeHtml(item.label)}</strong>
            ${item.score !== null ? `<span>${item.score}/10</span>` : ''}
          </div>
          ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
        </article>
      `).join('')}
    </div>
  `;
}

function renderDetailRow(title, text, note = '') {
  return `
    <article class="design-system-expandable__item">
      <div class="design-system-expandable__item-head">
        <strong>${escapeHtml(title)}</strong>
      </div>
      <p>${escapeHtml(text || 'Sin detalle')}</p>
      ${note ? `<p class="design-system-expandable__muted">${escapeHtml(note)}</p>` : ''}
    </article>
  `;
}

function renderExpandableCard({ label, summary, meta = [], tone = '', details = '', open = false }) {
  const metaMarkup = meta.filter(Boolean).map((item) => `<span class="design-system-expandable__pill">${escapeHtml(item)}</span>`).join('');

  return `
    <details class="design-system-card design-system-expandable ${tone ? `design-system-expandable--${tone}` : ''}" data-expandable-card${open ? ' open' : ''}>
      <summary class="design-system-expandable__summary">
        <div class="design-system-expandable__copy">
          <span class="design-system-badge">${escapeHtml(label)}</span>
          <p class="design-system-expandable__summary-text">${escapeHtml(summary)}</p>
        </div>

        <div class="design-system-expandable__aside">
          ${metaMarkup ? `<div class="design-system-expandable__meta">${metaMarkup}</div>` : ''}
          <span class="design-system-expandable__toggle design-system-expandable__toggle--closed">▼ Ver más</span>
          <span class="design-system-expandable__toggle design-system-expandable__toggle--open">▲ Ocultar</span>
        </div>
      </summary>

      <div class="design-system-expandable__body">
        ${details}
      </div>
    </details>
  `;
}

function renderStory() {
  if (!els.root) return;

  const selectedChampions = collectSelectedChampions();
  if (selectedChampions.length < 5) {
    els.root.innerHTML = `
      <section class="composition-story composition-story--empty">
        <p class="eyebrow">Composition Story</p>
        <h3>Selecciona cinco campeones para ver el resumen compacto</h3>
        <p>La pantalla principal mostrará solo una decisión clara por bloque y el detalle quedará oculto hasta que lo abras.</p>
      </section>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildStoryModel(analysis, selectedChampions);

  const cards = [
    renderExpandableCard({
      label: 'Lectura táctica',
      summary: model.quickCoach,
      meta: [`${model.grade} · ${model.score}/100`, `Pico: ${model.tempo}`],
      tone: 'hero',
      details: `
        ${renderDetailRow('Identidad', model.identity, model.summaryText)}
        ${renderDetailRow('Pieza clave', model.keyPiece ? `${model.keyPiece.champion} es la pieza que más condiciona el resultado.` : 'No hay una pieza clave clara todavía.', model.keyPiece ? [model.keyPiece.function, model.keyPiece.identity, model.keyPiece.tempo].filter(Boolean).join(' · ') : '')}
        ${renderDetailRow('Razonamiento', model.quickCoach, model.whyItems.join(' · '))}
      `,
    }),
    renderExpandableCard({
      label: 'Cómo ganas',
      summary: model.win,
      meta: [model.tempo, model.phases[0] || 'Primer pico'],
      tone: 'primary',
      details: `
        ${renderDetailRow('Condición de victoria', model.win, 'La composición gana cuando juega alrededor de su mejor ventana.')}
        ${renderDetailRow('Ventanas de poder', model.phases.join(' · ') || model.tempo, 'Early · Mid · Late')}
        ${renderDetailRow('Señales del plan', model.priorities[0] || 'Ganar tempo y visión', model.priorities.slice(1, 3).join(' · '))}
      `,
    }),
    renderExpandableCard({
      label: 'Tu prioridad',
      summary: model.priorities[0] || 'Ganar tempo y visión',
      meta: [model.priorities[1] || 'Agruparte bien', model.keyPiece ? model.keyPiece.champion : 'Sin pieza clave'],
      tone: 'success',
      details: `
        ${renderCompactList(
          model.priorities.map((priority, index) => ({ label: `Prioridad ${index + 1}`, detail: priority, score: null })),
          'No hay prioridades claras.',
        )}
        ${renderDetailRow('Pieza clave', model.keyPiece ? `${model.keyPiece.champion} debe estar protegida o habilitada.` : 'No hay una pieza clave clara todavía.')}
      `,
    }),
    renderExpandableCard({
      label: 'Qué evitar',
      summary: model.avoid.join(' · ') || 'Evita pelear sin visión',
      meta: ['Errores críticos', 'Control del ritmo'],
      tone: 'warning',
      details: `
        ${renderCompactList(
          model.avoid.map((item) => ({ label: item, detail: 'Evita este error porque castiga directamente tu plan.', score: null })),
          'No hay riesgos claros.',
        )}
        ${renderDetailRow('Riesgo mayor', model.weaknesses.map((item) => item.label).join(' · ') || 'Sin riesgos claros.', 'Lo que más necesitas compensar.')}
      `,
    }),
    renderExpandableCard({
      label: 'Fortalezas',
      summary: model.strengths.map((item) => item.label).join(' · ') || 'Sin fortalezas claras',
      meta: ['Sostén del plan'],
      details: `
        ${renderCompactList(model.strengths, 'Sin fortalezas claras.')}
      `,
    }),
    renderExpandableCard({
      label: 'Debilidades',
      summary: model.weaknesses.map((item) => item.label).join(' · ') || 'Sin riesgos claros',
      meta: ['Necesidades', 'Compensación'],
      details: `
        ${renderCompactList(model.weaknesses, 'Sin riesgos claros.')}
      `,
    }),
  ];

  els.root.innerHTML = `
    <section class="composition-story composition-story--wireframe">
      ${renderHero(model)}
      <div class="composition-story__accordion">
        ${cards.join('')}
      </div>
    </section>
  `;

  bindAccordion();
}

function bindAccordion() {
  const cards = [...els.root.querySelectorAll('[data-expandable-card]')];
  cards.forEach((card) => {
    card.addEventListener('toggle', () => {
      if (!card.open) return;
      cards.forEach((other) => {
        if (other !== card) other.open = false;
      });
    });
  });
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
