import { analyzeComposition } from './analyzer.js';

const DATA_MANIFEST_URL = './data/index.json';
const ROLE_FILES = [
  { key: 'top', label: 'Top', file: './data/top.json' },
  { key: 'jungle', label: 'Jungla', file: './data/jungle.json' },
  { key: 'mid', label: 'Mid', file: './data/mid.json' },
  { key: 'botline', label: 'Botline', file: './data/bot.json' },
  { key: 'support', label: 'Support', file: './data/support.json' },
];

const QUESTION_BLUEPRINTS = [
  { key: 'howWin', label: 'Cómo gano' },
  { key: 'whoStarts', label: 'Quién inicia' },
  { key: 'whatAvoid', label: 'Qué evitar' },
  { key: 'behind', label: 'Si voy por detrás' },
  { key: 'powerSpike', label: 'Mi pico' },
];

const state = {
  data: new Map(),
  dataLoaded: false,
  patchScheduled: false,
  activeQuestion: 'howWin',
};

init().catch((error) => console.error(error));

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
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const joined = value.map((item) => asText(item, '')).filter(Boolean).join(' · ');
    return joined || fallback;
  }
  if (typeof value === 'object') {
    return asText(
      value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.detail ?? value.summary ?? value.reason ?? value.description ?? value.champion ?? value.item ?? '',
      fallback
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

function normalizeEntry(item) {
  const label = asText(item?.label ?? item?.name ?? item?.title ?? item?.text ?? item?.value ?? item?.champion ?? item, 'Sin definir');
  const detail = asText(item?.detail ?? item?.summary ?? item?.description ?? item?.reason ?? item?.note ?? item?.explanation ?? item?.message ?? '', '');
  return { label, detail };
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

  try {
    const manifestResponse = await fetch(DATA_MANIFEST_URL, { cache: 'reload' });
    if (!manifestResponse.ok) return;

    const manifest = await manifestResponse.json();
    if (!Array.isArray(manifest?.files) || !manifest.files.length) return;

    const loaded = await Promise.all(
      ROLE_FILES.map(async ({ key, file }) => {
        const response = await fetch(file, { cache: 'reload' });
        if (!response.ok) throw new Error(`No se pudo leer ${file}`);
        return [key, await response.json()];
      })
    );

    loaded.forEach(([key, rows]) => state.data.set(key, Array.isArray(rows) ? rows : []));
  } catch {
    ROLE_FILES.forEach(({ key }) => state.data.set(key, []));
  }
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
    const values = [
      champion.champion,
      champion.identity,
      champion.function,
      champion.tempo,
      ...asArray(champion.strengths),
      ...asArray(champion.weaknesses),
    ];
    return values.some((value) => tags.some((tag) => normalizeText(asText(value)).includes(normalizeText(tag))));
  });
}

function buildDecisionModel(analysis, selectedChampions) {
  const strengths = asArray(analysis?.strengths).slice(0, 3).map(normalizeEntry);
  const risks = asArray(analysis?.weaknesses).slice(0, 3).map(normalizeEntry);
  const coach = analysis?.coach || analysis?.assistant || {};
  const advisor = analysis?.advisor || analysis?.assistant || {};
  const tempo = analysis?.tempoDetail?.label || analysis?.tempo || 'tu ventana natural de poder';
  const phases = asArray(analysis?.tempoDetail?.phases).slice(0, 3).map((phase) => asText(phase));
  const gamePlan = asArray(analysis?.gamePlan).slice(0, 3).map((step) => asText(step));
  const engager = findChampionByTags(selectedChampions, ['engage', 'iniciación', 'iniciacion', 'frontline', 'start']);
  const carry = findChampionByTags(selectedChampions, ['adc', 'carry', 'hypercarry', 'escalado']);
  const protector = findChampionByTags(selectedChampions, ['peel', 'protect', 'shield']);
  const frontline = findChampionByTags(selectedChampions, ['frontline', 'tanque', 'front', 'defensa']);
  const keyPiece = carry || engager || protector || frontline || selectedChampions[0] || null;
  const score = Number.isFinite(Number(analysis?.coherence?.score)) ? Math.round(Number(analysis.coherence.score)) : 0;
  const priorityOne = carry
    ? `Protege a ${carry.champion}`
    : 'Protege a tu carry principal';
  const priorityTwo = `Juega a ${tempo}`;
  const priorityThree = analysis?.winCondition?.label || 'Lucha por objetivos con ventaja de visión';

  const priorities = [
    {
      label: priorityOne,
      detail: carry
        ? `Si ${carry.champion} vive, tu composición gana mucho valor. No lo expongas antes de tiempo.`
        : 'La pieza que más escale o aporte daño necesita espacio y visión a su alrededor.',
    },
    {
      label: priorityTwo,
      detail: phases.length ? `Tu plan real pasa por ${phases[0] || tempo}.` : 'Respeta tu ventana natural de fuerza y no fuerces peleas fuera de ella.',
    },
    {
      label: priorityThree,
      detail: gamePlan[1] || 'Convierte tu prioridad en dragón, visión o una pelea favorable antes de cerrar la partida.',
    },
  ];

  const avoid = uniqueValues([
    risks[0]?.label || 'Iniciar sin visión',
    risks[1]?.label || 'Dividir el mapa sin necesidad',
    risks[2]?.label || 'Forzar peleas antes del pico de poder',
  ].filter(Boolean)).slice(0, 3);

  const initiativeLabel =
    (phases[0] && `Early: ${phases[0]}`) ||
    (phases[1] && `Mid: ${phases[1]}`) ||
    (phases[2] && `Late: ${phases[2]}`) ||
    'Tu iniciativa aparece en mid game';

  const behindPlan = [
    advisor?.loseConditions?.[0] ? asText(advisor.loseConditions[0]) : 'No fuerces todos los objetivos.',
    'Busca picks y peleas cortas.',
    'Mantén el oro cerca y evita 5v5 abiertos.',
  ];

  const answers = {
    howWin: {
      title: 'Cómo ganas',
      text: analysis?.winCondition?.detail || 'Ganas jugando a tu identidad y forzando la pelea correcta en tu ventana de poder.',
      chips: uniqueValues([analysis?.primaryIdentity, analysis?.winCondition?.label, analysis?.tempoDetail?.label || analysis?.tempo, ...gamePlan].filter(Boolean)).slice(0, 4),
    },
    whoStarts: {
      title: 'Quién inicia',
      text: engager ? `${engager.champion} debería marcar la entrada cuando tengas visión y seguimiento.` : 'No hay iniciador clarísimo; juega a contraengage y protege la posición.',
      chips: uniqueValues([engager?.champion, engager?.identity, engager?.function, 'contraengage'].filter(Boolean)).slice(0, 4),
    },
    whatAvoid: {
      title: 'Qué evitar',
      text: avoid.join(' · '),
      chips: avoid,
    },
    behind: {
      title: 'Si vas por detrás',
      text: behindPlan.join(' '),
      chips: behindPlan.slice(0, 3),
    },
    powerSpike: {
      title: 'Tu pico',
      text: `Tu mejor momento suele estar en ${tempo}. Ahí la composición empieza a ejecutar su plan con más claridad.`,
      chips: uniqueValues([tempo, ...phases].filter(Boolean)).slice(0, 4),
    },
  };

  return {
    score,
    priorities,
    avoid,
    keyPiece,
    initiativeLabel,
    behindPlan,
    strengths,
    risks,
    coach,
    answers,
    activeQuestion: state.activeQuestion,
  };
}

function renderDecisionEngine(model) {
  const active = model.answers[model.activeQuestion] || model.answers.howWin;
  const keyPieceTitle = model.keyPiece?.champion || 'Pieza clave no definida';
  const keyPieceDetail = model.keyPiece
    ? model.keyPiece.function || model.keyPiece.identity || 'La composición gira a su alrededor.'
    : 'La composición aún no tiene una pieza clave clara.';

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
          ${['Early', 'Mid', 'Late'].map((phase, index) => {
            const activePhase = index === 0 ? 'is-active' : index === 1 ? 'is-active' : 'is-inactive';
            return `
              <div class="decision-engine__flow-step ${activePhase}">
                <span>${phase}</span>
                <strong>${escapeHtml(index === 0 ? model.priorities[0].label : index === 1 ? model.priorities[1].label : model.priorities[2].label)}</strong>
              </div>
            `;
          }).join('')}
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
          ${QUESTION_BLUEPRINTS.map((question) => `
            <button class="decision-engine__question ${model.activeQuestion === question.key ? 'is-active' : ''}" type="button" data-question="${escapeHtml(question.key)}">
              ${escapeHtml(question.label)}
            </button>
          `).join('')}
        </div>
        <div class="decision-engine__answer">
          <span class="decision-engine__answer-kicker">${escapeHtml(active.title)}</span>
          <strong>${escapeHtml(active.text)}</strong>
          <div class="analysis-chip-list analysis-chip-list--compact">
            ${asArray(active.chips).slice(0, 4).map((chip) => `<span class="analysis-chip">${escapeHtml(chip)}</span>`).join('')}
          </div>
        </div>
      </article>
    </section>
  `;
}

function renderEmptyState() {
  return `
    <section class="decision-engine decision-engine--empty">
      <p class="eyebrow">Decision Engine</p>
      <h3>Selecciona cinco campeones para ver las prioridades de la composición</h3>
      <p class="analysis-note">La app te dirá qué hacer, qué evitar y cuál es la pieza clave de tu plan.</p>
      <div class="decision-engine__empty-grid">
        <div class="decision-engine__empty-chip">Prioridades</div>
        <div class="decision-engine__empty-chip">Evitar</div>
        <div class="decision-engine__empty-chip">Pieza clave</div>
        <div class="decision-engine__empty-chip">Preguntas</div>
      </div>
    </section>
  `;
}

function bindInteractions(root) {
  if (!root) return;
  root.querySelectorAll('[data-question]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeQuestion = button.dataset.question || 'howWin';
      renderSummary();
    });
  });
}

function renderSummary() {
  const root = document.getElementById('decisionView');
  if (!root) return;

  const selectedChampions = collectSelectedChampions();
  if (!selectedChampions.length) {
    root.innerHTML = renderEmptyState();
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const model = buildDecisionModel(analysis, selectedChampions);
  root.innerHTML = renderDecisionEngine(model);
  bindInteractions(root);
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

async function init() {
  await loadRoleData();
  observeComposition();
  renderSummary();
  window.setInterval(renderSummary, 1500);
}
