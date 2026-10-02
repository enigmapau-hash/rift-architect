import { formatKnowledgeReport, validateKnowledgeLayer } from '../knowledge/index.js?v=94';

const ENABLE_SIMULATION = new URLSearchParams(window.location.search).has('debug');

(async () => {
  try {
    const report = validateKnowledgeLayer();
    window.__RIFT_ARCHITECT_KNOWLEDGE__ = report;

    if (ENABLE_SIMULATION) {
      const {
        compareAnalyses,
        compareCompositions,
        simulateChampionSwap,
        simulateDraftChange,
      } = await import('../analyzer.js');

      window.__RIFT_ARCHITECT_SIMULATION__ = {
        simulateChampionSwap,
        simulateDraftChange,
        compareAnalyses,
        compareCompositions,
      };
    }

    if (!report.valid) {
      console.warn('[Rift Architect] Knowledge layer validation failed');
      console.warn(report.issues);
    } else {
      console.info(`[Rift Architect] ${formatKnowledgeReport(report)}`);
    }
  } catch (error) {
    console.warn('[Rift Architect] Knowledge layer validation unavailable', error);
  }
})();

async function loadBuildInfo() {
  const badge = document.getElementById('buildBadge');
  if (!badge) return;

  try {
    const response = await fetch('./version.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('version.json unavailable');

    const build = await response.json();
    const version = String(build?.version || 'Build').trim();
    const stage = String(build?.stage || '').trim();
    const date = String(build?.date || '').trim();

    const parts = [version];
    if (stage) parts.push(stage);
    if (date) parts.push(date);

    badge.textContent = parts.join(' · ');
    badge.title = `Build metadata${build?.cache ? ` · ${build.cache}` : ''}`;
  } catch {
    badge.textContent = 'Build no disponible';
  }
}

loadBuildInfo().catch(() => {});