import { compareCompositions } from '../js/analyzer.js';

const COMPARISON_CASES = [
  { label: 'Front to Back vs Dive', before: 'front-to-back', after: 'dive' },
  { label: 'Poke vs Siege', before: 'poke', after: 'siege' },
  { label: 'Protect Carry vs Global Pressure', before: 'protect-carry', after: 'global-pressure' },
  { label: 'Split Push vs Wombo Combo', before: 'splitpush', after: 'wombo-combo' },
  { label: 'Triple Carry vs Front to Back', before: 'triple-carry', after: 'front-to-back' },
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function loadFixture(slug) {
  return fetch(`./compositions/${slug}.json`, { cache: 'no-store' }).then((response) => {
    if (!response.ok) throw new Error(`No se pudo cargar ${slug}.json`);
    return response.json();
  });
}

function buildCaseReport(definition, beforeFixture, afterFixture) {
  const comparison = compareCompositions(beforeFixture.selectedChampions || [], afterFixture.selectedChampions || []);
  const reverse = compareCompositions(afterFixture.selectedChampions || [], beforeFixture.selectedChampions || []);
  const summary = comparison.summary || {};
  const impact = comparison.impact || {};
  const confidenceDelta = Number(summary.confidenceDelta ?? comparison.confidence?.delta ?? 0);
  const reverseConfidenceDelta = Number(reverse.summary?.confidenceDelta ?? reverse.confidence?.delta ?? 0);
  const symmetric = confidenceDelta + reverseConfidenceDelta === 0;
  const changedFields = asArray(comparison.changedFields);
  const highlights = asArray(comparison.highlights);

  const checks = [
    {
      label: 'Cambios detectados',
      pass: changedFields.length > 0,
      expected: 'Al menos un campo diferente',
      actual: changedFields.join(' · ') || 'Sin cambios',
    },
    {
      label: 'Resumen completo',
      pass: Boolean(summary.verdict && summary.reason && summary.keyGain && summary.keyLoss),
      expected: 'verdict · reason · gain · loss',
      actual: [summary.verdict, summary.reason, summary.keyGain, summary.keyLoss].filter(Boolean).join(' · ') || 'Sin resumen',
    },
    {
      label: 'Simetría de confianza',
      pass: symmetric,
      expected: 'Delta inverso al comparar en sentido contrario',
      actual: `${confidenceDelta} / ${reverseConfidenceDelta}`,
    },
    {
      label: 'Highlights',
      pass: highlights.length > 0,
      expected: 'Al menos un highlight',
      actual: highlights.join(' · ') || 'Sin highlights',
    },
  ];

  return {
    label: definition.label,
    before: beforeFixture.description || definition.before,
    after: afterFixture.description || definition.after,
    comparison,
    reverse,
    confidenceDelta,
    pass: checks.every((item) => item.pass) && Boolean(impact.verdict),
    checks,
  };
}

function renderBadge(pass) {
  return `<span class="badge ${pass ? 'is-ok' : 'is-warn'}">${pass ? 'OK' : 'WARN'}</span>`;
}

function renderChecks(checks) {
  return `
    <ul class="checks">
      ${checks
        .map(
          (check) => `
            <li class="check ${check.pass ? 'is-pass' : 'is-fail'}">
              <strong>${check.pass ? '✓' : '✗'} ${check.label}</strong>
              <span>Esperado: ${String(check.expected)}</span>
              <span>Obtenido: ${String(check.actual)}</span>
            </li>
          `
        )
        .join('')}
    </ul>
  `;
}

function renderCase(item) {
  const verdict = item.comparison.summary?.verdict || item.comparison.impact?.verdict || 'Neutro';
  const reason = item.comparison.summary?.reason || item.comparison.impact?.reason || 'Sin motivo';
  const gain = item.comparison.summary?.keyGain || item.comparison.impact?.gain || 'Sin ganancia clara';
  const loss = item.comparison.summary?.keyLoss || item.comparison.impact?.loss || 'Sin pérdida clara';
  const changes = asArray(item.comparison.changedFields);
  const highlights = asArray(item.comparison.highlights);

  return `
    <article class="card ${item.pass ? 'is-pass' : 'is-fail'}">
      <div class="card-head">
        <div>
          <h2>${item.pass ? '✓' : '✗'} ${item.label}</h2>
          <p>${item.before} → ${item.after}</p>
        </div>
        ${renderBadge(item.pass)}
      </div>
      <div class="meta">
        <span><strong>Veredicto:</strong> ${verdict}</span>
        <span><strong>Δ Confianza:</strong> ${item.confidenceDelta >= 0 ? '+' : ''}${item.confidenceDelta}</span>
      </div>
      <p><strong>Ganancia:</strong> ${gain}</p>
      <p><strong>Pérdida:</strong> ${loss}</p>
      <p><strong>Razón:</strong> ${reason}</p>
      <p><strong>Cambios:</strong> ${changes.join(' · ') || 'Sin cambios'}</p>
      <p><strong>Highlights:</strong> ${highlights.join(' · ') || 'Sin highlights'}</p>
      ${renderChecks(item.checks)}
    </article>
  `;
}

function renderReport(report) {
  const root = document.getElementById('app');
  if (!root) return;

  const passed = report.results.filter((item) => item.pass).length;
  const failed = report.results.length - passed;
  const averageDelta = report.results.length
    ? report.results.reduce((sum, item) => sum + Number(item.confidenceDelta || 0), 0) / report.results.length
    : 0;

  root.innerHTML = `
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #0f1115; color: #f5f7fb; }
      .wrap { max-width: 1100px; margin: 0 auto; }
      .hero { display: grid; gap: 12px; margin-bottom: 24px; }
      .hero h1 { margin: 0; font-size: 2rem; }
      .hero p { margin: 0; color: #c7cedb; }
      .stats { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
      .stat { background: #171b22; border: 1px solid #2a3240; border-radius: 12px; padding: 12px 14px; min-width: 150px; }
      .stat strong { display: block; font-size: 1.2rem; }
      .grid { display: grid; gap: 16px; }
      .card { background: #171b22; border: 1px solid #2a3240; border-radius: 16px; padding: 16px; }
      .card.is-pass { border-color: #2f6f4e; }
      .card.is-fail { border-color: #8e3a3a; }
      .card-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
      .card-head h2 { margin: 0 0 6px; font-size: 1.05rem; }
      .card-head p { margin: 0; color: #c7cedb; }
      .meta { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0; color: #c7cedb; }
      .checks { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 10px; }
      .check { border: 1px solid #2a3240; border-radius: 12px; padding: 10px 12px; display: grid; gap: 4px; }
      .check.is-pass { border-color: #2f6f4e; }
      .check.is-fail { border-color: #8e3a3a; }
      .check span { color: #c7cedb; font-size: 0.95rem; }
      .badge { display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; padding: 6px 10px; border: 1px solid #2a3240; }
      .badge.is-ok { background: #18311f; border-color: #2f6f4e; }
      .badge.is-warn { background: #332b16; border-color: #8b6a1f; }
    </style>
    <div class="wrap">
      <section class="hero">
        <span class="badge ${report.summary.certified ? 'is-ok' : 'is-warn'}">${report.summary.certified ? 'CERTIFIED' : 'REVIEW'}</span>
        <h1>Draft comparison validation</h1>
        <p>Checks compare engine symmetry, summary quality and the stability of the comparison output across representative draft pairs.</p>
        <div class="stats">
          <div class="stat"><strong>${report.results.length}</strong><span>comparaciones</span></div>
          <div class="stat"><strong>${passed}</strong><span>OK</span></div>
          <div class="stat"><strong>${failed}</strong><span>FAIL</span></div>
          <div class="stat"><strong>${averageDelta >= 0 ? '+' : ''}${averageDelta.toFixed(1)}</strong><span>Δ confianza media</span></div>
          <div class="stat"><strong>${report.summary.certified ? 'YES' : 'NO'}</strong><span>certified</span></div>
        </div>
      </section>

      <section class="grid">
        ${report.results.map(renderCase).join('')}
      </section>
    </div>
  `;
}

async function loadAll() {
  const uniqueSlugs = [...new Set(COMPARISON_CASES.flatMap((item) => [item.before, item.after]))];
  const fixtures = await Promise.all(uniqueSlugs.map(async (slug) => [slug, await loadFixture(slug)]));
  const fixtureMap = new Map(fixtures);

  const results = COMPARISON_CASES.map((item) => {
    const before = fixtureMap.get(item.before);
    const after = fixtureMap.get(item.after);

    if (!before || !after) {
      return {
        label: item.label,
        before: item.before,
        after: item.after,
        comparison: { summary: {}, impact: {}, changedFields: [], highlights: [] },
        confidenceDelta: 0,
        pass: false,
        checks: [
          {
            label: 'Carga de fixture',
            pass: false,
            expected: 'Los dos fixtures deben cargarse',
            actual: `before=${Boolean(before)} after=${Boolean(after)}`,
          },
        ],
      };
    }

    return buildCaseReport(item, before, after);
  });

  return {
    results,
    summary: {
      certified: results.every((item) => item.pass),
    },
  };
}

async function boot() {
  try {
    const report = await loadAll();
    renderReport(report);
  } catch (error) {
    const root = document.getElementById('app');
    if (root) {
      root.innerHTML = `<pre style="white-space:pre-wrap;color:#f5f7fb;background:#0f1115;padding:24px;">${String(error?.stack || error)}</pre>`;
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', boot);
}
