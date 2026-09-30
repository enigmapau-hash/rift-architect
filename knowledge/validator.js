import { CATEGORY_TERMS, normalizeText } from '../js/engine/utils.js';
import { IDENTITY_RELATIONS } from './identity-relations.js';
import { DIRECT_SYNERGY_RULES, MACRO_SYNERGY_RULES } from './synergies.js';
import { PATTERN_RULES } from './patterns.js';
import { DEPENDENCY_RULES } from './dependencies.js';
import { CONFLICT_RULES } from './conflicts.js';
import { WIN_CONDITION_RULES } from './win-conditions.js';

const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_TERMS));
const KNOWN_IDENTITY_LABELS = new Set(IDENTITY_RELATIONS.map((rule) => normalizeText(rule.label)));
const KNOWN_PATTERN_LABELS = new Set(PATTERN_RULES.map((rule) => normalizeText(rule.label)));

function pushIssue(issues, severity, scope, message, path = '') {
  issues.push({ severity, scope, path, message });
}

function hasDuplicates(values) {
  const seen = new Set();
  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    if (seen.has(normalized)) return true;
    seen.add(normalized);
  }
  return false;
}

function validateCategories(issues, scope, path, categories = []) {
  if (!Array.isArray(categories) || !categories.length) {
    pushIssue(issues, 'error', scope, 'Debe incluir al menos una categoría.', path);
    return;
  }

  categories.forEach((category, index) => {
    const normalized = normalizeText(category);
    if (!normalized) {
      pushIssue(issues, 'error', scope, 'La categoría no puede estar vacía.', `${path}[${index}]`);
      return;
    }

    if (!VALID_CATEGORIES.has(normalized)) {
      pushIssue(issues, 'warning', scope, `Categoría no reconocida: ${category}`, `${path}[${index}]`);
    }
  });
}

function validateTextList(issues, scope, path, values = [], required = true) {
  if (!Array.isArray(values)) {
    pushIssue(issues, 'error', scope, 'Debe ser un array.', path);
    return;
  }

  if (required && !values.length) {
    pushIssue(issues, 'error', scope, 'Debe incluir al menos un valor.', path);
    return;
  }

  values.forEach((value, index) => {
    if (!normalizeText(value)) {
      pushIssue(issues, 'error', scope, 'Los valores no pueden estar vacíos.', `${path}[${index}]`);
    }
  });
}

function validateIdentityRelations(issues) {
  if (!Array.isArray(IDENTITY_RELATIONS) || !IDENTITY_RELATIONS.length) {
    pushIssue(issues, 'error', 'identity-relations', 'No hay identidades definidas.', 'IDENTITY_RELATIONS');
    return;
  }

  const keys = [];
  const labels = [];

  IDENTITY_RELATIONS.forEach((rule, index) => {
    const path = `IDENTITY_RELATIONS[${index}]`;
    if (!rule?.key) pushIssue(issues, 'error', 'identity-relations', 'Falta la clave de identidad.', `${path}.key`);
    if (!rule?.label) pushIssue(issues, 'error', 'identity-relations', 'Falta la etiqueta de identidad.', `${path}.label`);

    keys.push(rule?.key);
    labels.push(rule?.label);

    validateCategories(issues, 'identity-relations', `${path}.categories`, rule?.categories);
    if (!Array.isArray(rule?.tempoBias) || !rule.tempoBias.length) {
      pushIssue(issues, 'warning', 'identity-relations', 'La identidad no declara sesgo de tempo.', `${path}.tempoBias`);
    }
  });

  if (hasDuplicates(keys)) pushIssue(issues, 'error', 'identity-relations', 'Hay claves de identidad duplicadas.', 'IDENTITY_RELATIONS');
  if (hasDuplicates(labels)) pushIssue(issues, 'warning', 'identity-relations', 'Hay etiquetas de identidad duplicadas.', 'IDENTITY_RELATIONS');
}

function validateSynergyRules(issues) {
  const allKeys = new Set();

  DIRECT_SYNERGY_RULES.forEach((rule, index) => {
    const path = `DIRECT_SYNERGY_RULES[${index}]`;
    if (!rule?.key) pushIssue(issues, 'error', 'synergies', 'Falta la clave de sinergia directa.', `${path}.key`);
    if (!rule?.label) pushIssue(issues, 'error', 'synergies', 'Falta la etiqueta de sinergia directa.', `${path}.label`);
    if (!rule?.detail) pushIssue(issues, 'warning', 'synergies', 'La sinergia directa no tiene detalle.', `${path}.detail`);

    if (allKeys.has(rule?.key)) pushIssue(issues, 'error', 'synergies', `Clave de sinergia duplicada: ${rule?.key}`, `${path}.key`);
    allKeys.add(rule?.key);

    if (!Array.isArray(rule?.champions) || !rule.champions.length) {
      pushIssue(issues, 'error', 'synergies', 'La sinergia directa debe declarar campeones.', `${path}.champions`);
    } else {
      rule.champions.forEach((group, groupIndex) => {
        if (!Array.isArray(group) || !group.length) {
          pushIssue(issues, 'error', 'synergies', 'Cada grupo de campeones debe tener al menos un término.', `${path}.champions[${groupIndex}]`);
        }
      });
    }

    validateCategories(issues, 'synergies', `${path}.categories`, rule?.categories);
  });

  MACRO_SYNERGY_RULES.forEach((rule, index) => {
    const path = `MACRO_SYNERGY_RULES[${index}]`;
    if (!rule?.key) pushIssue(issues, 'error', 'synergies', 'Falta la clave de sinergia macro.', `${path}.key`);
    if (!rule?.label) pushIssue(issues, 'error', 'synergies', 'Falta la etiqueta de sinergia macro.', `${path}.label`);
    if (!rule?.detail) pushIssue(issues, 'warning', 'synergies', 'La sinergia macro no tiene detalle.', `${path}.detail`);

    if (allKeys.has(rule?.key)) pushIssue(issues, 'error', 'synergies', `Clave de sinergia duplicada: ${rule?.key}`, `${path}.key`);
    allKeys.add(rule?.key);

    if (!Number.isInteger(rule?.minHits) || rule.minHits < 1) {
      pushIssue(issues, 'error', 'synergies', 'minHits debe ser un entero positivo.', `${path}.minHits`);
    }

    validateCategories(issues, 'synergies', `${path}.categories`, rule?.categories);
  });
}

function validatePatterns(issues) {
  const keys = [];

  PATTERN_RULES.forEach((rule, index) => {
    const path = `PATTERN_RULES[${index}]`;
    if (!rule?.key) pushIssue(issues, 'error', 'patterns', 'Falta la clave del patrón.', `${path}.key`);
    if (!rule?.label) pushIssue(issues, 'error', 'patterns', 'Falta la etiqueta del patrón.', `${path}.label`);
    if (!rule?.detail) pushIssue(issues, 'warning', 'patterns', 'El patrón no tiene detalle.', `${path}.detail`);

    keys.push(rule?.key);

    if (!Number.isInteger(rule?.minHits) || rule.minHits < 1) {
      pushIssue(issues, 'error', 'patterns', 'minHits debe ser un entero positivo.', `${path}.minHits`);
    }

    validateCategories(issues, 'patterns', `${path}.categories`, rule?.categories);
  });

  if (hasDuplicates(keys)) pushIssue(issues, 'error', 'patterns', 'Hay claves de patrón duplicadas.', 'PATTERN_RULES');
}

function validateDependencies(issues) {
  const keys = [];

  DEPENDENCY_RULES.forEach((rule, index) => {
    const path = `DEPENDENCY_RULES[${index}]`;
    if (!rule?.key) pushIssue(issues, 'error', 'dependencies', 'Falta la clave de dependencia.', `${path}.key`);
    if (!rule?.label) pushIssue(issues, 'error', 'dependencies', 'Falta la etiqueta de dependencia.', `${path}.label`);
    if (!rule?.kind) pushIssue(issues, 'error', 'dependencies', 'Falta el tipo de dependencia.', `${path}.kind`);
    if (!rule?.detail) pushIssue(issues, 'warning', 'dependencies', 'La dependencia no tiene detalle.', `${path}.detail`);

    keys.push(rule?.key);

    if (!['identity', 'pattern'].includes(rule?.kind)) {
      pushIssue(issues, 'error', 'dependencies', 'kind debe ser identity o pattern.', `${path}.kind`);
    }

    validateCategories(issues, 'dependencies', `${path}.match`, rule?.match);
    validateTextList(issues, 'dependencies', `${path}.needs`, rule?.needs, true);
    validateTextList(issues, 'dependencies', `${path}.wants`, rule?.wants, false);
    validateTextList(issues, 'dependencies', `${path}.avoids`, rule?.avoids, false);
    validateTextList(issues, 'dependencies', `${path}.evidence`, rule?.evidence, false);

    if (rule?.kind === 'pattern' && !KNOWN_PATTERN_LABELS.has(normalizeText(rule?.label))) {
      pushIssue(issues, 'warning', 'dependencies', `El patrón no está reconocido: ${rule?.label}`, `${path}.label`);
    }
  });

  if (hasDuplicates(keys)) pushIssue(issues, 'error', 'dependencies', 'Hay claves de dependencia duplicadas.', 'DEPENDENCY_RULES');
}

function validateConflicts(issues) {
  const keys = [];

  CONFLICT_RULES.forEach((rule, index) => {
    const path = `CONFLICT_RULES[${index}]`;
    if (!rule?.key) pushIssue(issues, 'error', 'conflicts', 'Falta la clave de conflicto.', `${path}.key`);
    if (!rule?.detail) pushIssue(issues, 'warning', 'conflicts', 'El conflicto no tiene detalle.', `${path}.detail`);

    keys.push(rule?.key);

    if (!Array.isArray(rule?.labels) || rule.labels.length !== 2) {
      pushIssue(issues, 'error', 'conflicts', 'Cada conflicto debe comparar exactamente dos identidades.', `${path}.labels`);
      return;
    }

    rule.labels.forEach((label, labelIndex) => {
      const normalized = normalizeText(label);
      if (!normalized) {
        pushIssue(issues, 'error', 'conflicts', 'La identidad del conflicto no puede estar vacía.', `${path}.labels[${labelIndex}]`);
      }
      if (!KNOWN_IDENTITY_LABELS.has(normalized)) {
        pushIssue(issues, 'warning', 'conflicts', `Identidad no reconocida en conflicto: ${label}`, `${path}.labels[${labelIndex}]`);
      }
    });

    if (!Number.isInteger(rule?.penalty) || rule.penalty <= 0) {
      pushIssue(issues, 'error', 'conflicts', 'La penalización debe ser un entero positivo.', `${path}.penalty`);
    }
  });

  if (hasDuplicates(keys)) pushIssue(issues, 'error', 'conflicts', 'Hay claves de conflicto duplicadas.', 'CONFLICT_RULES');
}

function validateWinConditions(issues) {
  const keys = [];
  let fallbackCount = 0;

  WIN_CONDITION_RULES.forEach((rule, index) => {
    const path = `WIN_CONDITION_RULES[${index}]`;
    if (!rule?.key) pushIssue(issues, 'error', 'win-conditions', 'Falta la clave de win condition.', `${path}.key`);
    if (!rule?.label) pushIssue(issues, 'error', 'win-conditions', 'Falta la etiqueta de win condition.', `${path}.label`);
    if (!rule?.detail) pushIssue(issues, 'warning', 'win-conditions', 'La win condition no tiene detalle.', `${path}.detail`);

    keys.push(rule?.key);

    if (rule?.key === 'fallback') fallbackCount += 1;

    if (!Array.isArray(rule?.match)) {
      pushIssue(issues, 'error', 'win-conditions', 'match debe ser un array.', `${path}.match`);
    } else if (rule.key !== 'fallback' && !rule.match.length) {
      pushIssue(issues, 'error', 'win-conditions', 'Las win conditions principales deben tener al menos una coincidencia.', `${path}.match`);
    }

    if (!Array.isArray(rule?.priorities) || !rule.priorities.length) {
      pushIssue(issues, 'error', 'win-conditions', 'Debe incluir prioridades.', `${path}.priorities`);
    }

    if (!Array.isArray(rule?.avoid) || !rule.avoid.length) {
      pushIssue(issues, 'warning', 'win-conditions', 'Conviene declarar qué evitar.', `${path}.avoid`);
    }
  });

  if (hasDuplicates(keys)) pushIssue(issues, 'error', 'win-conditions', 'Hay claves de win condition duplicadas.', 'WIN_CONDITION_RULES');
  if (fallbackCount !== 1) pushIssue(issues, 'error', 'win-conditions', 'Debe existir exactamente una win condition de fallback.', 'WIN_CONDITION_RULES');
}

export function validateKnowledgeLayer() {
  const issues = [];

  validateIdentityRelations(issues);
  validateSynergyRules(issues);
  validatePatterns(issues);
  validateDependencies(issues);
  validateConflicts(issues);
  validateWinConditions(issues);

  const errors = issues.filter((item) => item.severity === 'error').length;
  const warnings = issues.length - errors;

  return {
    valid: errors === 0,
    errors,
    warnings,
    issues,
    summary: {
      identities: IDENTITY_RELATIONS.length,
      directSynergies: DIRECT_SYNERGY_RULES.length,
      macroSynergies: MACRO_SYNERGY_RULES.length,
      patterns: PATTERN_RULES.length,
      dependencies: DEPENDENCY_RULES.length,
      conflicts: CONFLICT_RULES.length,
      winConditions: WIN_CONDITION_RULES.length,
    },
  };
}

export function formatKnowledgeReport(report) {
  if (!report) return 'Knowledge layer no disponible.';

  const lines = [
    `Knowledge layer: ${report.valid ? 'OK' : 'Con incidencias'}`,
    `Errors: ${report.errors ?? 0}`,
    `Warnings: ${report.warnings ?? 0}`,
  ];

  return lines.join(' · ');
}
