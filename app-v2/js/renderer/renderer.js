import { buildExecutiveSummaryContract } from '../shared/contract.js';

export function renderDashboard(contract = {}, mount = null) {
  if (!mount) return;

  const executiveSummary = buildExecutiveSummaryContract(contract);
  mount.innerHTML = '';

  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <header class="card__header">
      <p class="card__eyebrow">${escapeHtml(executiveSummary.title)}</p>
      <h2 class="card__title">${escapeHtml(executiveSummary.verdict)}</h2>
    </header>
    <div class="card__body">
      <p class="card__text">${escapeHtml(executiveSummary.summary)}</p>
      <p class="card__meta">Tempo: ${escapeHtml(executiveSummary.tempo)}</p>
      <p class="card__meta">Confidence: ${escapeHtml(String(executiveSummary.confidence))}%</p>
    </div>
  `;

  mount.appendChild(card);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
