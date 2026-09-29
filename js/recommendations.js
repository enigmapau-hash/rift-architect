import { analyzeComposition } from './analyzer.js';

const DATA_MANIFEST_URL = './data/index.json';
const WORKBOOK_URL = './Draft%20Pool.xlsx';

const ROLE_SOURCES = [
  { key: 'top', label: 'Top', file: './data/top.json', sheet: 'Tabla Top' },
  { key: 'jungle', label: 'Jungla', file: './data/jungle.json', sheet: 'Tabla Jungla' },
  { key: 'mid', label: 'Mid', file: './data/mid.json', sheet: 'Tabla Mid' },
  { key: 'botline', label: 'Botline', file: './data/bot.json', sheet: 'Tabla Botline' },
  { key: 'support', label: 'Support', file: './data/support.json', sheet: 'Tabla Support' },
];

const ROLE_ORDER = ROLE_SOURCES.map(({ key }) => key);
const ROLE_LABELS = Object.fromEntries(ROLE_SOURCES.map(({ key, label }) => [key, label]));

const RECOMMENDATION_TERMS = {
  frontline: ['frontline', 'tank', 'tanque', 'peel', 'bruiser', 'juggernaut', 'warden', 'sustain', 'vanguard'],
  engage: ['engage', 'pick', 'hook', 'dive', 'flank', 'initiate', 'catch', 'inici'],
  control: ['control', 'cc', 'vision', 'waveclear', 'zone control', 'anti-engage', 'anti engage'],
  scaling: ['scaling', 'escalado', 'late', 'late game', 'hypercarry'],
  objective: ['objective', 'objectives', 'dragon', 'nashor', 'herald', 'zone control'],
  poke: ['poke', 'siege', 'artillery'],
  splitpush: ['splitpush', 'split', 'side lane', 'duel', 'dueling', '1v1'],
  pick: ['pick', 'catch', 'hook', 'flank', 'dive'],
  mobility: ['mobility', 'movilidad', 'dash', 'roam', 'mobile'],
};

const DAMAGE_TERMS = {
  ap: ['mage', 'battlemage', 'artillery', 'enchanter', 'burst', 'magic'],
  ad: ['marksman', 'fighter', 'bruiser', 'assassin', 'duelist', 'ad'],
};

const REASON_LABELS = {
  frontline: 'añade frontline',
  engage: 'facilita engage',
  control: 'mejora control',
  scaling: 'mejora el escalado',
  objective: 'ayuda en objetivos',
  poke: 'da más asedio',
  splitpush: 'mejor side lane',
  pick: 'da más picks',
  mobility: 'da más movilidad',
  damage_ap: 'cubre daño AP',
  damage_ad: 'cubre daño AD',
  general: 'encaja con el draft',
};

const state = {
  data: null,
  loading: false,
};

let refreshQueued = false;
let observer = null;

init().catch(() => {});

async function init() {
  await loadData();
  observeDraftChanges();
  scheduleRefresh();
}

function observeDraftChanges() {
  if (observer) return;

  const compositionGrid = document.getElementById('compositionGrid');
  const analysisSummary = document.getElementById('analysisSummary');
  if (!compositionGrid || !analysisSummary) {
    window.requestAnimationFrame(observeDraftChanges);
    return;
  }

  observer = new MutationObserver(() => scheduleRefresh());
  observer.observe(compositionGrid, { childList: true, subtree: true, characterData: true });
  observer.observe(analysisSummary, { childList: true, subtree: true, characterData: true });
}

function scheduleRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;

  window.requestAnimationFrame(() => {
    refreshQueued = false;
    refreshRecommendations();
  });
}

async function refreshRecommendations() {
  const recommendationsEl = document.getElementById('recommendations');
  if (!recommendationsEl) return;

  const data = await loadData();
  if (!data) {
    recommendationsEl.innerHTML = `
      <h3>Recomendación</h3>
      <p class="muted">No he podido cargar los datos de campeones.</p>
    `;
    return;
  }

  const selectedSlots = getSelectedSlots();
  if (!selectedSlots.length) {
    recommendationsEl.innerHTML = `
      <h3>Recomendación</h3>
      <p class="muted">Completa la composición para ver una sugerencia clara.</p>
    `;
    return;
  }

  const selectedChampions = resolveSelectedChampions(selectedSlots, data);
  if (!selectedChampions.length) {
    recommendationsEl.innerHTML = `
      <h3>Recomendación</h3>
      <p class="muted">Todavía no tengo suficientes datos para sugerir picks.</p>
    `;
    return;
  }

  const analysis = analyzeComposition(selectedChampions);
  const targetRole = getTargetRole(selectedSlots);
  const rolePool = data[targetRole] || [];
  const picks = buildRecommendations(selectedChampions, rolePool, analysis).slice(0, 3);
  const roleLabel = ROLE_LABELS[targetRole] || 'el próximo rol';

  recommendationsEl.innerHTML = `
    <h3>Recomendación para ${escapeHtml(roleLabel)}</h3>
    ${picks.length ? renderRecommendationBoard(picks) : '<p class="muted">No he encontrado opciones claras para este hueco.</p>'}
  `;
}

function renderRecommendationBoard(picks) {
  const [main, ...alternatives] = picks;
  const mainReasons = main.reasons.slice(0, 2).map(formatReasonText).filter(Boolean);

  return `
    <div class="recommendation-board">
      <article class="recommendation-primary">
        <div class="recommendation-kicker">Principal</div>
        <h4>${escapeHtml(main.champion)}</h4>
        <p class="recommendation-summary">${escapeHtml(main.summary)}</p>
        <div class="recommendation-reasons">
          ${mainReasons.map((reason) => `<span class="recommendation-reason">${escapeHtml(reason)}</span>`).join('')}
        </div>
      </article>
      ${alternatives.length ? `
        <div class="recommendation-alternatives">
          <div class="recommendation-kicker">Alternativas</div>
          <ul>
            ${alternatives.map((pick) => {
              const reason = formatReasonText(pick.reasons[0] || 'general');
              return `<li><strong>${escapeHtml(pick.champion)}</strong><span>${escapeHtml(reason)}</span></li>`;
            }).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}

async function loadData() {
  if (state.data || state.loading) return state.data;

  state.loading = true;
  try {
    const jsonData = await loadJsonData();
    if (jsonData) {
      state.data = jsonData;
      return state.data;
    }

    const workbookData = await loadWorkbookData();
    state.data = workbookData;
    return state.data;
  } catch {
    state.data = null;
    return null;
  } finally {
    state.loading = false;
  }
}

async function loadJsonData() {
  try {
    const response = await fetch(DATA_MANIFEST_URL, { cache: 'reload' });
    if (!response.ok) return null;

    const manifest = await response.json();
    if (!Array.isArray(manifest?.files) || !manifest.files.length) return null;

    const loaded = await Promise.all(
      ROLE_SOURCES.map(async ({ key, file }) => {
        const fileResponse = await fetch(file, { cache: 'reload' });
        if (!fileResponse.ok) throw new Error(`No se pudo leer ${file}`);
        return [key, await fileResponse.json()];
      })
    );

    return Object.fromEntries(loaded);
  } catch {
    return null;
  }
}

async function loadWorkbookData() {
  if (!window.XLSX) return null;

  const response = await fetch(WORKBOOK_URL, { cache: 'reload' });
  if (!response.ok) return null;

  const workbook = window.XLSX.read(await response.arrayBuffer(), { type: 'array' });
  const dataset = {};

  ROLE_SOURCES.forEach(({ key, sheet }) => {
    dataset[key] = worksheetToRows(workbook.Sheets[sheet]);
  });

  return dataset;
}

function worksheetToRows(worksheet) {
  if (!worksheet) return [];

  const rows = window.XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

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

function buildRecommendations(selectedChampions, candidates, analysis) {
  const selectedNames = new Set(selectedChampions.map((champion) => champion.champion.toLowerCase()));
  const weakMetrics = [...analysis.metrics]
    .filter((metric) => metric.score < 5)
    .sort((a, b) => a.score - b.score);
  const needsAP = analysis.damageSplit.ap === 0 && analysis.damageSplit.hybrid === 0;
  const needsAD = analysis.damageSplit.ad === 0 && analysis.damageSplit.hybrid === 0;

  return candidates
    .filter((candidate) => !selectedNames.has(candidate.champion.toLowerCase()))
    .map((candidate) => scoreCandidate(candidate, weakMetrics, needsAP, needsAD))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.champion.localeCompare(b.champion, 'es'));
}

function scoreCandidate(candidate, weakMetrics, needsAP, needsAD) {
  const text = buildCandidateText(candidate);
  let score = 0;
  const reasons = [];

  for (const metric of weakMetrics) {
    const terms = RECOMMENDATION_TERMS[metric.key] || [];
    if (terms.some((term) => hasTerm(text, term))) {
      const boost = Math.max(1, 5 - metric.score) * 10;
      score += boost;
      reasons.push(metric.key);
    }
  }

  if (needsAP && DAMAGE_TERMS.ap.some((term) => hasTerm(text, term))) {
    score += 12;
    reasons.push('damage_ap');
  }

  if (needsAD && DAMAGE_TERMS.ad.some((term) => hasTerm(text, term))) {
    score += 12;
    reasons.push('damage_ad');
  }

  if (!reasons.length && /flex|utility|teamfight|front-to-back|peel|engage|control/i.test(text)) {
    score += 2;
    reasons.push('general');
  }

  const uniqueReasons = [...new Set(reasons)];

  return {
    champion: candidate.champion,
    score,
    reasons: uniqueReasons,
    summary: formatSummary(uniqueReasons),
  };
}

function formatSummary(reasons) {
  if (!reasons.length) return 'encaja con el draft';

  const phrases = reasons.map(formatReasonText).filter(Boolean).slice(0, 2);
  if (!phrases.length) return 'encaja con el draft';
  return phrases.join(' · ');
}

function formatReasonText(reason) {
  return REASON_LABELS[reason] || '';
}

function buildCandidateText(candidate) {
  return [
    candidate.champion,
    candidate.identity,
    candidate.function,
    candidate.tempo,
    ...(candidate.strengths || []),
    ...(candidate.weaknesses || []),
  ]
    .join(' ')
    .toLowerCase();
}

function hasTerm(text, term) {
  return text.includes(String(term).toLowerCase());
}

function getSelectedSlots() {
  return [...document.querySelectorAll('#compositionGrid .slot.filled')]
    .map((button) => ({
      role: normalizeRole(button.dataset.role),
      champion: button.querySelector('strong')?.textContent?.trim() || '',
    }))
    .filter((slot) => slot.role && slot.champion);
}

function resolveSelectedChampions(selectedSlots, data) {
  return selectedSlots
    .map((slot) => {
      const champion = (data[slot.role] || []).find(
        (entry) => entry.champion.toLowerCase() === slot.champion.toLowerCase()
      );
      return champion ? { role: slot.role, ...champion } : null;
    })
    .filter(Boolean);
}

function getTargetRole(selectedSlots) {
  const label = document.getElementById('pickerRoleLabel')?.textContent?.trim();
  if (label) {
    const matchingRole = ROLE_SOURCES.find(({ label: roleLabel }) => roleLabel === label)?.key;
    if (matchingRole) return matchingRole;
  }

  const selectedRoles = new Set(selectedSlots.map((slot) => slot.role));
  return ROLE_ORDER.find((role) => !selectedRoles.has(role)) || ROLE_ORDER[0];
}

function normalizeRole(role) {
  return ROLE_ORDER.includes(role) ? role : 'top';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
