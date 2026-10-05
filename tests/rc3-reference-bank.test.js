import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

import { buildAnalysisReportContract } from '../js/analysis/report-contract.js?v=118';

const BANK_PATH = path.resolve(process.cwd(), 'tests/reference-comps.json');
const bank = JSON.parse(fs.readFileSync(BANK_PATH, 'utf8'));

function buildStoryFromComposition(champions) {
  return {
    composition: {
      selectedChampions: champions.map((champion, index) => ({
        role: ['top', 'jungle', 'mid', 'botline', 'support'][index] || `slot-${index + 1}`,
        champion,
        identity: champion,
        function: champion,
        tempo: 'tempo medio',
        strengths: [],
        weaknesses: [],
      })),
    },
    identity: {
      primaryIdentity: champions.join(' / '),
      summaryText: champions.join(' / '),
      tempo: 'Tempo medio',
      dominance: 'Sin definir',
    },
    score: {
      value: 68,
      badge: 'Sólido',
      grade: 'B',
    },
    executiveSummary: {
      text: champions.join(' / '),
      title: 'Executive Summary',
    },
    winConditions: [{ label: 'Jugar a tu plan', detail: '' }],
    strategic: {
      focus: 'Plan por fases',
      headline: 'Plan por fases',
      summary: 'Lectura estratégica base para validación',
      claims: [
        { label: 'Plan por fases', detail: 'Leer el juego por fases y ejecutar la condición de victoria principal.' },
      ],
      dependencies: [{ label: 'Coordinación', detail: 'Necesita seguir el plan' }],
      risks: [{ label: 'Riesgo base', detail: 'Si se fuerza el tempo antes de tiempo' }],
      signals: ['Señal base'],
      execution: { label: 'Ejecutar plan' },
    },
    knowledgeV3: {
      summary: 'Lectura de conocimiento base',
      lead: 'Lead base',
      primaryStyle: { label: 'front-to-back' },
      style: { label: 'front-to-back' },
      matchup: { label: 'matchup estable' },
      macro: { label: 'macro estable' },
      vision: { label: 'visión estándar' },
      tempo: { label: 'tempo medio' },
      objectives: { label: 'objetivos estables' },
      victory: { label: 'victoria por ejecución' },
      defeat: { label: 'derrota por mala ejecución' },
      mistake: { label: 'forzar de más' },
      tags: ['conocimiento base'],
    },
    bans: {
      focus: 'Ban base',
      summary: 'Ban base',
      bans: [{ champion: 'Ban base', reason: 'Base' }],
    },
    bestPick: {
      champion: 'Base pick',
      role: 'support',
      roleLabel: 'support',
      reason: 'Base',
      score: 72,
      fit: 'Bueno',
    },
    alternatives: [{ label: 'Alt base', detail: 'Base', score: 58 }],
    profile: {
      needs: ['Base'],
    },
    tags: ['base'],
  };
}

function readTokens(contract) {
  return new Set([
    ...(contract.summaryTokens || []),
    ...(contract.identityTokens || []),
    ...(contract.strategicTokens || []),
    ...(contract.knowledgeTokens || []),
    ...(contract.signalTokens || []),
    ...(contract.tags || []),
  ].map((value) => String(value).toLowerCase()));
}

for (const entry of bank.compositions) {
  const story = buildStoryFromComposition(entry.champions);
  const contract = buildAnalysisReportContract(story, 'analysis');
  const tokens = readTokens(contract);

  for (const expected of entry.expectedSignals) {
    const needle = String(expected).toLowerCase();
    assert(
      Array.from(tokens).some((value) => value.includes(needle)),
      `Expected signal "${expected}" for ${entry.id}`,
    );
  }

  assert(contract.sections.some((section) => section.id === 'summary'), `Missing summary section for ${entry.id}`);
  assert(contract.sections.some((section) => section.id === 'identity'), `Missing identity section for ${entry.id}`);
  assert(contract.sections.some((section) => section.id === 'plan'), `Missing plan section for ${entry.id}`);
  assert(contract.sections.some((section) => section.id === 'knowledge'), `Missing knowledge section for ${entry.id}`);
  assert(contract.sections.some((section) => section.id === 'bans'), `Missing bans section for ${entry.id}`);
  assert(contract.sections.some((section) => section.id === 'timeline'), `Missing timeline section for ${entry.id}`);
}

console.log(`RC3 reference bank validated: ${bank.compositions.length} compositions.`);
