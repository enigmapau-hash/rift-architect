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
  const sections = [];

  sections.push(
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
    })
  );

  sections.push(
    createSection({
      title: 'Composition',
      cards: [
        createCard({
          title: contract.primaryIdentity || 'Identidad no definida',
          subtitle: contract.tempo || 'Tempo pendiente',
          body: createListBody([
            ['Plan', contract.coreTheme],
            ['Dominancia', contract.dominance],
            ['Win label', contract.winLabel],
            ['Secundarias', contract.secondaryIdentities?.join(', ')],
          ]),
          footer: createTokenFooter(contract.identityTokens),
        }),
      ],
    })
  );

  sections.push(
    createSection({
      title: 'Strategic Engine',
      cards: [
        createCard({
          title: contract.strategic?.focus || contract.coreTheme || 'Lectura estratégica',
          subtitle: contract.strategic?.headline || 'Razonamiento',
          body: createListBody([
            ['Resumen', contract.strategic?.summary],
            ['Ventana dominante', contract.strategic?.dominantWindow],
            ['Ejecución', contract.strategic?.execution?.label],
            ['Robustez', contract.strategic?.robustnessSummary?.label],
            ['Flexibilidad', contract.strategic?.flexibilitySummary?.label],
            ['Contingencia', contract.strategic?.contingency?.label],
            ['Adaptación', contract.strategic?.adaptation?.label],
          ]),
          footer: createTokenFooter(contract.strategicTokens),
        }),
      ],
    })
  );

  sections.push(
    createSection({
      title: 'Knowledge Layer',
      cards: [
        createCard({
          title: contract.knowledge?.style?.label || contract.knowledge?.primaryStyle?.label || 'Knowledge Layer',
          subtitle: contract.knowledge?.matchup?.label || 'Contexto',
          body: createListBody([
            ['Macro', contract.knowledge?.macro?.detail || contract.knowledge?.macro?.label],
            ['Visión', contract.knowledge?.vision?.detail || contract.knowledge?.vision?.label],
            ['Tempo', contract.knowledge?.tempo?.detail || contract.knowledge?.tempo?.label],
            ['Objetivos', contract.knowledge?.objectives?.detail || contract.knowledge?.objectives?.label],
            ['Victoria', contract.knowledge?.victory?.detail || contract.knowledge?.victory?.label],
            ['Derrota', contract.knowledge?.defeat?.detail || contract.knowledge?.defeat?.label],
            ['Error', contract.knowledge?.mistake?.detail || contract.knowledge?.mistake?.label],
          ]),
          footer: createTokenFooter(contract.knowledgeTokens),
        }),
      ],
    })
  );

  sections.push(
    createSection({
      title: 'Strengths',
      cards: [
        createCard({
          title: 'Fortalezas principales',
          subtitle: 'Apoya el plan',
          body: createListBody(contract.strengths),
          footer: createTokenFooter(contract.synergies),
        }),
      ],
    })
  );

  sections.push(
    createSection({
      title: 'Weaknesses',
      cards: [
        createCard({
          title: 'Debilidades principales',
          subtitle: 'A vigilar',
          body: createListBody(contract.weaknesses),
          footer: createTokenFooter(contract.risks),
        }),
      ],
    })
  );

  sections.push(
    createSection({
      title: 'Timeline',
      cards: [
        createCard({
          title: 'Lectura temporal',
          subtitle: contract.tempo || 'Fases',
          body: createListBody((contract.phases || []).map((phase) => [phase.label, phase.detail])),
          footer: createTokenFooter(contract.dependencyClaims || contract.signalTokens),
        }),
      ],
    })
  );

  sections.push(
    createSection({
      title: 'Bans',
      cards: [
        createCard({
          title: contract.banFocus || 'Bans prioritarios',
          subtitle: contract.banSummary || 'Plan de bans',
          body: createListBody((contract.bans || []).map((ban) => [ban.champion, ban.reason || ban.priority])),
          footer: createTokenFooter(contract.bans?.flatMap((ban) => ban.tags || [])),
        }),
      ],
    })
  );

  sections.push(
    createSection({
      title: 'Last Pick',
      cards: [
        createCard({
          title: contract.bestPick?.champion || contract.targetRoleLabel || 'Último pick',
          subtitle: contract.bestPick?.reason || contract.focus || 'Cierre de draft',
          body: createListBody([
            ['Rol', contract.targetRoleLabel || contract.targetRole],
            ['Objetivo', contract.bestPick?.problem || contract.focus],
            ['Score', contract.bestPick?.score != null ? `${contract.bestPick.score}%` : undefined],
          ]),
          footer: createTokenFooter(contract.alternatives?.map((pick) => pick.champion)),
        }),
      ],
    })
  );

  return sections;
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

function createListBody(rows = []) {
  const items = rows
    .filter((item) => Array.isArray(item) && item[1])
    .map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`)
    .join('');

  return `<ul class="dashboard-card__list">${items || '<li>Sin datos.</li>'}</ul>`;
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
