import { formatKnowledgeReport, validateKnowledgeLayer } from '../knowledge/index.js';

(() => {
  const keysToClear = ['rift-architect:draft-v2', 'rift-architect:draft'];

  try {
    keysToClear.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage errors
  }

  try {
    const report = validateKnowledgeLayer();
    window.__RIFT_ARCHITECT_KNOWLEDGE__ = report;

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
