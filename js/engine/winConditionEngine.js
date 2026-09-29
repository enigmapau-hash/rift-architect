import { normalizeText } from './utils.js';

function toLabel(value) {
  if (!value) return '';
  return String(value);
}

function prioritize(items) {
  return [...new Set(items.filter(Boolean))].slice(0, 3);
}

function makeResult(label, detail, priorities, avoid) {
  return {
    label,
    detail,
    priorities: prioritize(priorities),
    avoid: prioritize(avoid),
  };
}

export function determineWinCondition({ identitySummary = null, tempoSummary = null, synergies = [], coherence = null } = {}) {
  const primary = normalizeText(identitySummary?.primary?.label || '');
  const tempo = normalizeText(tempoSummary?.label || '');
  const coherenceScore = Number(coherence?.score) || 0;
  const strongestSynergy = synergies[0]?.label ? toLabel(synergies[0].label) : '';

  if (primary.includes('splitpush')) {
    return makeResult(
      'Abrir mapa',
      'La composición quiere ensanchar la partida y ganar por presión lateral.',
      ['Side lanes', 'Presión', 'Visión'],
      ['Agruparse sin objetivo', '5v5 frontales']
    );
  }

  if (primary.includes('poke') || strongestSynergy.toLowerCase().includes('asedio')) {
    return makeResult(
      'Desgastar antes de entrar',
      'El equipo gana espacio antes de comprometer la pelea.',
      ['Visión', 'Asedio', 'Objetivos'],
      ['Dive frontal', 'Entradas aisladas']
    );
  }

  if (primary.includes('pick') || primary.includes('engage') || primary.includes('dive')) {
    const earlyTempo = tempo.includes('early') || tempo.includes('mid');
    return makeResult(
      earlyTempo ? 'Crear ventaja temprana' : 'Forzar peleas cortas',
      earlyTempo
        ? 'La composición debe convertir visión y pick en ventaja antes del mid game.'
        : 'La composición vive mejor en escaramuzas cortas y ventanas de castigo.',
      earlyTempo ? ['Visión', 'Picks', 'Objetivos'] : ['Forzar peleas cortas', 'Castigar errores', 'Presión de mapa'],
      ['Pelear tarde sin ventaja', 'Agruparse sin visión']
    );
  }

  if (primary.includes('protect') || primary.includes('fronttoback') || primary.includes('teamfight') || primary.includes('control')) {
    return makeResult(
      'Escalar y ganar 5v5',
      'La composición quiere llegar ordenada al cierre y pelear con front line y carry protegido.',
      ['Escalar', 'Agruparse', 'Proteger carry'],
      ['Peleas aisladas', 'Side lanes innecesarias']
    );
  }

  if (coherenceScore < 50) {
    return makeResult(
      'Unificar el plan',
      'La composición necesita definir una sola idea antes de forzar acciones.',
      ['Definir rol', 'Visión', 'Orden'],
      ['Mix de objetivos', 'Trades largos']
    );
  }

  return makeResult(
    'Jugar alrededor de la identidad',
    'La composición debe seguir su plan dominante y evitar improvisar.',
    ['Identidad', 'Objetivos', 'Ejecutar el plan'],
    ['Desorden', 'Pelear sin ventaja']
  );
}
