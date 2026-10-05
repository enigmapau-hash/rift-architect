import { createCard } from './card-factory.js';
import { createSection } from './section-factory.js';

export function renderDashboardV2(contract = {}, mount = null) {
  if (!mount) return;

  const sections = buildSections(contract);
  mount.innerHTML = '';

  if (!sections.length) {
    mount.appendChild(createEmptyState('Dashboard v2 listo para conectar al contrato.'));
    return;
  }

  const shell = document.createElement('div');
  shell.className = 'dashboard-v2';
  sections.forEach((section) => shell.appendChild(section));
  mount.appendChild(shell);
}

function buildSections(contract) {
  return [
    createSection({
      title: 'Executive Summary',
      cards: [
        createCard({
          title: contract.title || 'Sin título',
          subtitle: contract.scoreBadge || 'Resumen',
          body: createSummaryBody(contract),
          footer: createTokenFooter(contract.summaryTokens),
        }),
      ],
    }),
  ];
}

function createSummaryBody(contract) {
  return `
    <p class="dashboard-card__paragraph">${escapeHtml(contract.summaryText || 'Sin resumen disponible.')}</p>
    <dl class="dashboard-card__metrics">
      ${metricRow('Score', contract.confidence != null ? `${contract.confidence}%` : '—')}
      ${metricRow('Grado', contract.grade || '—')}
      ${metricRow('Rol', contract.targetRoleLabel || contract.targetRole || '—')}
    </dl>
  `;
}

function createTokenFooter(tokens = []) {
  const values = Array.isArray(tokens) ? tokens.filter(Boolean).slice(0, 6) : [];
  if (!values.length) return '';
  return `<div class="dashboard-card__tokens">${values.map((token) => `<span class="dashboard-token">${escapeHtml(token)}</span>`).join('')}</div>`;
}

function metricRow(label, value) {
  return `<div class="dashboard-card__metric"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function createEmptyState(message) {
  const shell = document.createElement('section');
  shell.className = 'dashboard-v2 dashboard-v2--empty';
  shell.innerHTML = `
    <div class="dashboard-v2__empty-card">
      <p class="dashboard-v2__eyebrow">Dashboard v2</p>
      <h3>Infraestructura preparada</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
  return shell;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
