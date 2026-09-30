import { analyzeComposition } from '../js/analyzer.js';
import { formatKnowledgeReport, PATTERN_RULES, DEPENDENCY_RULES, validateKnowledgeLayer } from '../knowledge/index.js';

const FIXTURE_FILES = [
  'empty.json',
  'single-shen.json',
  'front-to-back.json',
  'pick.json',
  'poke.json',
  'dive.json',
  'splitpush.json',
  'protect-carry.json',
  'hybrid-front-pick.json',
  'incoherent.json',
  'wombo-combo.json',
  'siege.json',
  'triple-carry.json',
  'global-pressure.json',
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function includesAll(text, terms = []) {
  const normalizedText = normalizeText(text);
  return terms.every((term) => normalizedText.includes(normalizeText(term)));
}

function includesAnyLabel(items = [], expected = []) {
  const labels = items.map((item) => normalizeText(item?.label || item));
  return expected.every((term) => labels.some((label) => label.includes(normalizeText(term)) || normalizeText(term).includes(label)));
}

function matchPattern(pattern, selectedChampions = []) {
  const matchedChampions = selectedChampions.filter((champion) => {
    const text = [
      champion?.champion,
      champion?.displayName,
      champion?.identity,
      champion?.function,
      champion?.tempo,
      ...(Array.isArray(champion?.strengths) ? champion.strengths : []),
      ...(Array.isArray(champion?.weaknesses) ? champion.weaknesses : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (pattern.categories || []).some((category) => {
      const normalizedCategory = normalizeText(category);
      return text.includes(normalizedCategory);
    });
  });

  if (matchedChampions.length < Number(pattern.minHits || 1)) return null;

  return {
    key: pattern.key,
    label: pattern.label,
    detail: pattern.detail,
    champions: matchedChampions.slice(0, 4).map((item) => item.champion || item.displayName || 'Sin definir'),
    score: matchedChampions.length,
  };
}

function detectPatterns(selectedChampions = []) {
  return PATTERN_RULES.map((pattern) => matchPattern(pattern, selectedChampions)).filter(Boolean);
}

function loadFixture(name) {
  return fetch(`./compositions/${name}`, { cache: 'no-store' }).then((response) => {
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${name}`);
    }
    return response.json();
  });
}

function compareFixture(fixture) {
  const analysis = analyzeComposition(fixture.selectedChampions || []);
  const patterns = detectPatterns(fixture.selectedChampions || []);
  const expectations = fixture.expectations || {};
  const checks = [];
  const dependencies = asArray(analysis.dependencies?.items);

  const pushCheck = (label, pass, expected, actual) => {
    checks.push({ label, pass, expected, actual });
  };

  if (expectations.primaryIdentity) {
    pushCheck(
      'Identidad principal',
      normalizeText(analysis.primaryIdentity) === normalizeText(expectations.primaryIdentity),
      expectations.primaryIdentity,
      analysis.primaryIdentity || 'Sin definir'
    );
  }

  if (expectations.dominance) {
    pushCheck(
      'Dominancia',
      normalizeText(analysis.dominance) === normalizeText(expectations.dominance),
      expectations.dominance,
      analysis.dominance || 'Sin definir'
    );
  }

  if (expectations.coherence) {
    pushCheck(
      'Coherencia',
      normalizeText(analysis.coherence?.label || '') === normalizeText(expectations.coherence),
      expectations.coherence,
      analysis.coherence?.label || 'Sin definir'
    );
  }

  if (expectations.winCondition) {
    pushCheck(
      'Condición de victoria',
      normalizeText(analysis.winCondition?.label || '') === normalizeText(expectations.winCondition),
      expectations.winCondition,
      analysis.winCondition?.label || 'Sin definir'
    );
  }

  if (asArray(expectations.tempoIncludes).length) {
    pushCheck(
      'Tempo',
      includesAll(analysis.tempoDetail?.label || analysis.tempo || '', expectations.tempoIncludes),
      expectations.tempoIncludes.join(' · '),
      analysis.tempoDetail?.label || analysis.tempo || 'Sin definir'
    );
  }

  if (asArray(expectations.synergiesInclude).length) {
    pushCheck(
      'Sinergias',
      includesAnyLabel(analysis.synergies, expectations.synergiesInclude),
      expectations.synergiesInclude.join(' · '),
      asArray(analysis.synergies).map((item) => item?.label || item).join(' · ') || 'Sin sinergias'
    );
  }

  if (asArray(expectations.patternsInclude).length) {
    pushCheck(
      'Patrones',
      includesAnyLabel(patterns, expectations.patternsInclude),
      expectations.patternsInclude.join(' · '),
      patterns.map((item) => item?.label || item).join(' · ') || 'Sin patrones'
    );
  }

  if (asArray(expectations.dependenciesInclude).length) {
    pushCheck(
      'Dependencias',
      includesAnyLabel(dependencies, expectations.dependenciesInclude),
      expectations.dependenciesInclude.join(' · '),
      dependencies.map((item) => item?.label || item).join(' · ') || 'Sin dependencias'
    );
  }

  if (Number.isFinite(Number(expectations.confidenceMin))) {
    const actualConfidence = Number(analysis.confidence) || 0;
    pushCheck(
      'Confianza mínima',
      actualConfidence >= Number(expectations.confidenceMin),
      `≥ ${expectations.confidenceMin}`,
      `${actualConfidence}`
    );
  }

  return {
    slug: fixture.slug,
    description: fixture.description,
    checks,
    pass: checks.every((item) => item.pass),
    patterns,
    dependencies,
    analysis,
  };
}

function renderChecks(checks) {
  return `
    <ul class="test-checks">
      ${checks
        .map(
          (check) => `
            <li class="test-check ${check.pass ? 'is-pass' : 'is-fail'}">
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

function renderReport(report) {
  const root = document.getElementById('app');
  if (!root) return;

  const passed = report.results.filter((item) => item.pass).length;
  const failed = report.results.length - passed;
  const coveredPatterns = report.coverage?.coveredPatterns?.length || 0;
  const totalPatterns = report.coverage?.totalPatterns || 0;
  const coveredDependencies = report.coverage?.coveredDependencies?.length || 0;
  const totalDependencies = report.coverage?.totalDependencies || 0;
  const durationMs = Number(report.timing?.durationMs) || 0;
  const averageMs = Number(report.timing?.averageMs) || 0;

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
      .report { display: grid; gap: 16px; }
      .card { background: #171b22; border: 1px solid #2a3240; border-radius: 16px; padding: 16px; }
      .card h2 { margin: 0 0 6px; font-size: 1.05rem; }
      .card p { margin: 0 0 12px; color: #c7cedb; }
      .test-checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
      .test-check { border: 1px solid #2a3240; border-radius: 12px; padding: 10px 12px; display: grid; gap: 4px; }
      .test-check.is-pass { border-color: #2f6f4e; }
      .test-check.is-fail { border-color: #8e3a3a; }
      .test-check span { color: #c7cedb; font-size: 0.95rem; }
      .knowledge { white-space: pre-wrap; }
      .badge { display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; padding: 6px 10px; background: #202634; border: 1px solid #2a3240; }
      .badge.is-ok { background: #18311f; border-color: #2f6f4e; }
      .badge.is-warn { background: #332b16; border-color: #8b6a1f; }
    </style>
    <div class="wrap">
      <section class="hero">
        <span class="badge ${report.summary.certified ? 'is-ok' : 'is-warn'}">${report.summary.certified ? 'CERTIFIED' : 'REVIEW'}</span>
        <h1>Core Engine test bank</h1>
        <p>Reference compositions used to detect regressions in identity, tempo, coherence, synergies, dependencies, patterns and win conditions.</p>
        <div class="stats">
          <div class="stat"><strong>${report.results.length}</strong><span>composiciones</span></div>
          <div class="stat"><strong>${passed}</strong><span>OK</span></div>
          <div class="stat"><strong>${failed}</strong><span>FAIL</span></div>
          <div class="stat"><strong>${coveredPatterns}/${totalPatterns}</strong><span>patrones</span></div>
          <div class="stat"><strong>${coveredDependencies}/${totalDependencies}</strong><span>dependencias</span></div>
          <div class="stat"><strong>${durationMs} ms</strong><span>total</span></div>
          <div class="stat"><strong>${averageMs.toFixed(1)} ms</strong><span>media</span></div>
          <div class="stat"><strong>${report.knowledge.valid ? 'OK' : 'WARN'}</strong><span>knowledge</span></div>
        </div>
      </section>

      <section class="card knowledge">
        <h2>Knowledge layer</h2>
        <p>${formatKnowledgeReport(report.knowledge)}</p>
        <p>${report.coverage?.missingPatterns?.length ? `Patrones sin cobertura: ${report.coverage.missingPatterns.join(' · ')}` : 'Cobertura de patrones completa.'}</p>
        <p>${report.coverage?.missingDependencies?.length ? `Dependencias sin cobertura: ${report.coverage.missingDependencies.join(' · ')}` : 'Cobertura de dependencias completa.'}</p>
      </section>

      <section class="report">
        ${report.results
          .map(
            (item) => `
              <article class="card">
                <h2>${item.pass ? '✓' : '✗'} ${item.slug}</h2>
                <p>${item.description || ''}</p>
                ${item.patterns?.length ? `<p><strong>Patrones:</strong> ${item.patterns.map((pattern) => pattern.label).join(' · ')}</p>` : ''}
                ${item.dependencies?.length ? `<p><strong>Dependencias:</strong> ${item.dependencies.map((dependency) => dependency.label).join(' · ')}</p>` : ''}
                ${renderChecks(item.checks)}
              </article>
            `
          )
          .join('')}
      </section>
    </div>
  `;
}

function measureNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export async function runEngineValidation() {
  const startedAt = measureNow();
  const knowledge = validateKnowledgeLayer();
  const fixtures = await Promise.all(FIXTURE_FILES.map(loadFixture));
  const results = fixtures.map(compareFixture);
  const coveredPatterns = [...new Set(results.flatMap((item) => item.patterns.map((pattern) => pattern.label)))];
  const coveredDependencies = [...new Set(results.flatMap((item) => item.dependencies.map((dependency) => dependency.label)))];
  const durationMs = Math.max(0, measureNow() - startedAt);
  const coverageComplete =
    coveredPatterns.length === PATTERN_RULES.length && coveredDependencies.length === DEPENDENCY_RULES.length;
  const certified = knowledge.valid && results.every((item) => item.pass) && coverageComplete;

  const report = {
    knowledge,
    results,
    coverage: {
      totalPatterns: PATTERN_RULES.length,
      coveredPatterns,
      missingPatterns: PATTERN_RULES.map((rule) => rule.label).filter((label) => !coveredPatterns.includes(label)),
      totalDependencies: DEPENDENCY_RULES.length,
      coveredDependencies,
      missingDependencies: DEPENDENCY_RULES.map((rule) => rule.label).filter((label) => !coveredDependencies.includes(label)),
    },
    timing: {
      durationMs: Math.round(durationMs),
      averageMs: Number((durationMs / Math.max(1, results.length)).toFixed(1)),
    },
    summary: {
      total: results.length,
      passed: results.filter((item) => item.pass).length,
      failed: results.filter((item) => !item.pass).length,
      certified,
    },
  };

  if (typeof window !== 'undefined') {
    window.__RIFT_ARCHITECT_ENGINE_TESTS__ = report;
  }

  return report;
}

async function boot() {
  try {
    const report = await runEngineValidation();
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
