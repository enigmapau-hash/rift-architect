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

const QUESTION_BLUEPRINTS = [
  { key: 'priorities', label: 'Prioridades' },
  { key: 'avoid', label: 'Evitar' },
  { key: 'piece', label: 'Pieza clave' },
  { key: 'initiative', label: 'Iniciativa' },
];

const state = {
  data: new Map(),
  dataLoaded: false,
  patchScheduled: false,
  activeQuestion: 'priorities',
};

const els = { root: null };

init().catch((error) => console.error(error));

async function init() {
  els.root = document.getElementById('decisionView');
  await loadRoleData();
  observeComposition();
  renderSummary();
  window.setInterval(renderSummary, 1400);
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
    return asText(value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '', fallback);
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
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
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
  if (state.dataLoaded) return;
  state.dataLoaded = true;

  const loaded = await loadJsonDataset() || await loadWorkbookDataset();
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

    const loaded = await Promise.all(ROLE_FILES.map(async ({ key, file }) => {
      const response = await fetch(file, { cache: 'reload' });
      if (!response.ok) throw new Error(`No se pudo leer ${file}`);
      return [key, await response.json()];
    }));

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
    ROLE_FILES.forEach(({ key, sheet }) => { dataset[key] = worksheetToRows(workbook.Sheets[sheet]); });
    return dataset;
  } catch {
    return null;
  }
}

function worksheetToRows(worksheet) {
  if (!worksheet) return [];
  const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
  return rows.slice(1).filter((row) => row[0]).map((row) => ({
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

function hasTag(champion, tags = []) {
  if (!champion) return false;
  const values = [champion.champion, champion.identity, champion.function, champion.tempo, ...asArray(champion.strengths), ...asArray(champion.weaknesses)];
  return values.some((value) => tags.some((tag) => normalizeText(asText(value)).includes(normalizeText(tag))));
}

function buildDecisionModel(analysis, selectedChampions) {
  const risks = asArray(analysis?.weaknesses).slice(0, 3).map((item) => ({
    label: asText(item?.label ?? item?.name ?? item?.title ?? item?.text ?? item?.value ?? item?.champion ?? item, 'Sin definir'),
    detail: asText(item?.detail ?? item?.summary ?? item?.description ?? item?.reason ?? item?.note ?? item?.explanation ?? item?.message ?? '', ''),
  }));
  const coach = analysis?.coach || analysis?.assistant || {};
  const advisor = analysis?.advisor || analysis?.assistant || {};
  const tempo = analysis?.tempoDetail?.label || analysis?.tempo || 'tu ventana natural de poder';
  const phases = asArray(analysis?.tempoDetail?.phases).slice(0, 3).map((phase) => asText(phase));
  const plan = asArray(analysis?.gamePlan).slice(0, 3).map((step) => asText(step));
  const engager = selectedChampions.find((item) => hasTag(item, ['engage', 'iniciación', 'iniciacion', 'frontline', 'start'])) || null;
  const carry = selectedChampions.find((item) => hasTag(item, ['adc', 'carry', 'hypercarry', 'escalado'])) || null;
  const protector = selectedChampions.find((item) => hasTag(item, ['peel', 'protect', 'shield'])) || null;
  const frontline = selectedChampions.find((item) => hasTag(item, ['frontline', 'tanque', 'front', 'defensa'])) || null;
  const keyPiece = carry || engager || protector || frontline || selectedChampions[0] || null;
  const coherence = Number.isFinite(Number(analysis?.coherence?.score)) ? Math.round(Number(analysis.coherence.score)) : 0;
  const objectives = uniqueValues((asArray(advisor.objectivePriority).slice(0, 3).map((item) => asText(item))).filter(Boolean));
  const loseConditions = uniqueValues((asArray(advisor.loseConditions).slice(0, 3).map((item) => asText(item))).filter(Boolean));

  const priorities = [
    { label: carry ? `Protege a ${carry.champion}` : 'Protege a tu carry principal', detail: carry ? `Si ${carry.champion} vive, tu composición gana mucho valor.` : 'La pieza que más escale o aporte daño necesita espacio y visión.' },
    { label: `Juega a ${tempo}`, detail: phases.length ? `Tu plan real pasa por ${phases[0] || tempo}.` : 'Respeta tu ventana natural de fuerza.' },
    { label: objectives[0] || plan[1] || 'Asegura un objetivo con visión', detail: objectives[1] || plan[2] || 'Convierte tu prioridad en una pelea favorable antes de cerrar la partida.' },
  ];

  const avoid = uniqueValues([
    loseConditions[0] || risks[0]?.label || 'Iniciar sin visión',
    loseConditions[1] || risks[1]?.label || 'Dividir el mapa sin necesidad',
    loseConditions[2] || risks[2]?.label || 'Forzar peleas antes del pico de poder',
  ].filter(Boolean)).slice(0, 3);

  const initiativeLabel = phases[0] ? `Tu iniciativa principal aparece en ${phases[0]}.` : 'Tu iniciativa aparece en mid game.';
  const behindPlan = [
    loseConditions[0] || 'No fuerces todos los objetivos.',
    'Busca picks y peleas cortas.',
    'Mantén el oro cerca y evita 5v5 abiertos.',
  ];

  return {
    score: coherence,
    priorities,
    avoid,
    keyPiece,
    initiativeLabel,
    behindPlan,
    coach,
    answers: {
      priorities: { title: 'Tus 3 prioridades', text: priorities.map((item) => item.label).join(' · '), chips: uniqueValues([analysis?.primaryIdentity, analysis?.winCondition?.label, analysis?.tempoDetail?.label || analysis?.tempo].filter(Boolean)).slice(0, 4) },
      avoid: { title: 'Qué evitar', text: avoid.join(' · '), chips: avoid },
      piece: { title: 'Pieza clave', text: keyPiece?.champion ? `${keyPiece.champion} es la pieza que más condiciona tu plan.` : 'La composición todavía no tiene una pieza clave clara.', chips: uniqueValues([keyPiece?.champion, keyPiece?.identity, keyPiece?.function].filter(Boolean)).slice(0, 4) },
      initiative: { title: 'Iniciativa', text: initiativeLabel, chips: uniqueValues(['Early', 'Mid', 'Late', tempo].filter(Boolean)).slice(0, 4) },
    },
  };
}

function renderDecisionEngine(model) {
  const active = model.answers[state.activeQuestion] || model.answers.priorities;
  const keyPieceTitle = model.keyPiece?.champion || 'Pieza clave no definida';
  const keyPieceDetail = model.keyPiece ? model.keyPiece.function || model.keyPiece.identity || 'La composición gira a su alrededor.' : 'La composición aún no tiene una pieza clave clara.';

  return `
    <section class="decision-engine">
      <div class="decision-engine__header">
        <div>
          <p class="eyebrow">Decision Engine</p>
          <h3>Qué debes priorizar ahora</h3>
        </div>
        <div class="decision-engine__badge">
          <span>Coherencia</span>
          <strong>${model.score || '—'}</strong>
        </div>
      </div>

      <div class="decision-engine__priorities">
        ${model.priorities.map((priority, index) => `
          <article class="decision-engine__priority decision-engine__priority--${index + 1}">
            <span class="decision-engine__priority-index">0${index + 1}</span>
            <strong>${escapeHtml(priority.label)}</strong>
            <p>${escapeHtml(priority.detail)}</p>
          </article>
        `).join('')}
      </div>

      <div class="decision-engine__secondary">
        <article class="decision-engine__panel decision-engine__panel--danger">
          <div class="decision-engine__section-head">
            <p class="eyebrow">Evita</p>
            <h4>Lo que más te castiga</h4>
          </div>
          <ul class="decision-engine__list">
            ${model.avoid.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </article>

        <article class="decision-engine__panel decision-engine__panel--coach">
          <div class="decision-engine__section-head">
            <p class="eyebrow">Pieza clave</p>
            <h4>${escapeHtml(keyPieceTitle)}</h4>
          </div>
          <p class="decision-engine__detail">${escapeHtml(keyPieceDetail)}</p>
          <div class="analysis-chip-list analysis-chip-list--compact">
            ${model.keyPiece?.role ? `<span class="analysis-chip">${escapeHtml(model.keyPiece.role)}</span>` : ''}
            ${model.keyPiece?.tempo ? `<span class="analysis-chip">${escapeHtml(asText(model.keyPiece.tempo))}</span>` : ''}
            ${model.keyPiece?.identity ? `<span class="analysis-chip">${escapeHtml(asText(model.keyPiece.identity))}</span>` : ''}
          </div>
        </article>
      </div>

      <article class="decision-engine__panel decision-engine__panel--flow">
        <div class="decision-engine__section-head">
          <p class="eyebrow">Iniciativa</p>
          <h4>Cuándo debes tomar la partida</h4>
        </div>
        <div class="decision-engine__flow">
          ${['Early', 'Mid', 'Late'].map((phase, index) => `
            <div class="decision-engine__flow-step ${index === 1 ? 'is-active' : 'is-inactive'}">
              <span>${phase}</span>
              <strong>${escapeHtml(index === 0 ? model.priorities[0].label : index === 1 ? model.priorities[1].label : model.priorities[2].label)}</strong>
            </div>
          `).join('')}
        </div>
        <p class="decision-engine__note">${escapeHtml(model.initiativeLabel)}</p>
      </article>

      <article class="decision-engine__panel decision-engine__panel--behind">
        <div class="decision-engine__section-head">
          <p class="eyebrow">Si vas por detrás</p>
          <h4>Plan de estabilización</h4>
        </div>
        <div class="analysis-chip-list analysis-chip-list--compact">
          ${model.behindPlan.map((step) => `<span class="analysis-chip">${escapeHtml(step)}</span>`).join('')}
        </div>
      </article>

      <article class="decision-engine__panel decision-engine__panel--question">
        <div class="decision-engine__section-head">
          <p class="eyebrow">Pregúntale a Rift</p>
          <h4>Respuestas rápidas y directas</h4>
        </div>
        <div class="decision-engine__question-row">
          ${QUESTION_BLUEPRINTS.map((question) => `<button class="decision-engine__question ${model.activeQuestion === question.key ? 'is-active' : ''}" type="button" data-question="${escapeHtml(question.key)}">${escapeHtml(question.label)}</button>`).join('')}
        </div>
        <div class="decision-engine__answer">
          <span class="decision-engine__answer-kicker">${escapeHtml(active.title)}</span>
          <strong>${escapeHtml(active.text)}</strong>
          <div class="analysis-chip-list analysis-chip-list--compact">
            ${active.chips.map((chip) => `<span class="analysis-chip">${escapeHtml(chip)}</span>`).join('')}
          </div>
        </div>
      </article>
    </section>
  `;
}

function renderEmptyState() {
  return `
    <section class="decision-engine decision-engine--empty">
      <div class="decision-engine__header">
        <div>
          <p class="eyebrow">Decision Engine</p>
          <h3>Selecciona cinco campeones para ver las prioridades de la composición</h3>
          <p class="decision-engine__detail">La app te dirá qué hacer, qué evitar y cuál es la pieza clave de tu plan.</p>
        </div>
      </div>
      <div class="decision-engine__empty-grid">
        <div class="decision-engine__empty-chip">Prioridades</div>
        <div class="decision-engine__empty-chip">Evitar</div>
        <div class="decision-engine__empty-chip">Pieza clave</div>
        <div class="decision-engine__empty-chip">Preguntas</div>
      </div>
    </section>
  `;
}

function renderSummary() {
  if (!els.root) return;
  const selectedChampions = collectSelectedChampions();
  if (!selectedChampions.length) {
    els.root.innerHTML = renderEmptyState();
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildDecisionModel(analysis, selectedChampions);
  els.root.innerHTML = renderDecisionEngine(model);
  bindQuestionActions();
}

function bindQuestionActions() {
  if (!els.root) return;
  els.root.querySelectorAll('[data-question]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeQuestion = button.dataset.question || 'priorities';
      renderSummary();
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
    renderSummary();
  });
}
