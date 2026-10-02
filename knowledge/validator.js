import { CATEGORY_TERMS, normalizeText } from '../js/engine/utils.js';
import { IDENTITY_RELATIONS } from './identity-relations.js';
import { DIRECT_SYNERGY_RULES, MACRO_SYNERGY_RULES } from './synergies.js';
import { PATTERN_RULES } from './patterns.js';
import { DEPENDENCY_RULES } from './dependencies.js';
import { CONFLICT_RULES } from './conflicts.js';
import { WIN_CONDITION_RULES } from './win-conditions.js';
import { STRATEGIC_PROFILES_V2 } from './strategy-profiles.js';
import { BAN_PROFILE_RULES } from './ban-profiles.js';
import { PICK_PROFILE_RULES } from './pick-profiles.js';
import { STYLE_KNOWLEDGE_V3 } from './knowledge-v3.js';

const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_TERMS));

function pushIssue(issues, severity, scope, message, path = '') {
  issues.push({ severity, scope, path, message });
}

function hasDuplicates(values = []) {
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
  const keys = [];
  const labels = [];

  IDENTITY_RELATIONS.forEach((rule, index) => {
    const path = `IDENTITY_RELATIONS[${index}]`;
    if (!rule?.key) pushIssue(issues, 'error', 'identity-relations', 'Falta la clave de identidad.', `${path}.key`);
    if (!rule?.label) pushIssue(issues, 'error', 'identity-relations', 'Falta la etiqueta de identidad.', `${path}.label`);
    keys.push(rule?.key);
    labels.push(rule?.label);
    validateCategories(issues, 'identity-relations', `${path}.categories`, rule?.categories);
    validateTextList(issues, 'identity-relations', `${path}.tempoBias`, rule?.tempoBias, true);
  });

  if (hasDuplicates(keys)) pushIssue(issues, 'error', 'identity-relations', 'Hay claves de identidad duplicadas.', 'IDENTITY_RELATIONS');
  if (hasDuplicates(labels)) pushIssue(issues, 'warning', 'identity-relations', 'Hay etiquetas de identidad duplicadas.', 'IDENTITY_RELATIONS');
}

function validateStrategicProfiles(issues) {
  const keys = [];
  const labels = [];
  let identityProfiles = 0;
  let patternProfiles = 0;

  STRATEGIC_PROFILES_V2.forEach((profile, index) => {
    const path = `STRATEGIC_PROFILES_V2[${index}]`;
    const kind = String(profile?.kind || '').trim();
    if (!profile?.key) pushIssue(issues, 'error', 'strategic-profiles', 'Falta la clave del perfil estratégico.', `${path}.key`);
    if (!profile?.label) pushIssue(issues, 'error', 'strategic-profiles', 'Falta la etiqueta del perfil estratégico.', `${path}.label`);
    if (!kind) pushIssue(issues, 'error', 'strategic-profiles', 'Falta el tipo del perfil estratégico.', `${path}.kind`);
    if (!profile?.summary) pushIssue(issues, 'error', 'strategic-profiles', 'Falta el resumen narrativo del perfil.', `${path}.summary`);
    keys.push(profile?.key);
    labels.push(profile?.label);
    if (kind === 'identity') identityProfiles += 1;
    if (kind === 'pattern') patternProfiles += 1;
    validateCategories(issues, 'strategic-profiles', `${path}.categories`, profile?.categories);
    validateTextList(issues, 'strategic-profiles', `${path}.winsAgainst`, profile?.winsAgainst, true);
    validateTextList(issues, 'strategic-profiles', `${path}.losesAgainst`, profile?.losesAgainst, true);
    validateTextList(issues, 'strategic-profiles', `${path}.needs`, profile?.needs, true);
    validateTextList(issues, 'strategic-profiles', `${path}.avoids`, profile?.avoids, true);
    validateTextList(issues, 'strategic-profiles', `${path}.timings`, profile?.timings, true);
    validateTextList(issues, 'strategic-profiles', `${path}.macro`, profile?.macro, true);
    validateTextList(issues, 'strategic-profiles', `${path}.objectives`, profile?.objectives, true);
    validateTextList(issues, 'strategic-profiles', `${path}.mistakes`, profile?.mistakes, true);
  });

  if (hasDuplicates(keys)) pushIssue(issues, 'error', 'strategic-profiles', 'Hay claves de perfil estratégico duplicadas.', 'STRATEGIC_PROFILES_V2');
  if (hasDuplicates(labels)) pushIssue(issues, 'warning', 'strategic-profiles', 'Hay etiquetas de perfil estratégico duplicadas.', 'STRATEGIC_PROFILES_V2');
  if (!identityProfiles) pushIssue(issues, 'error', 'strategic-profiles', 'Debe existir al menos un perfil de identidad.', 'STRATEGIC_PROFILES_V2');
  if (!patternProfiles) pushIssue(issues, 'error', 'strategic-profiles', 'Debe existir al menos un perfil de patrón.', 'STRATEGIC_PROFILES_V2');
}

function validateKnowledgeV3(issues) {
  const keys = [];
  STYLE_KNOWLEDGE_V3.forEach((profile, index) => {
    const path = `STYLE_KNOWLEDGE_V3[${index}]`;
    if (!profile?.key) pushIssue(issues, 'error', 'knowledge-v3', 'Falta la clave de conocimiento.', `${path}.key`);
    if (!profile?.label) pushIssue(issues, 'error', 'knowledge-v3', 'Falta la etiqueta de conocimiento.', `${path}.label`);
    if (!profile?.summary) pushIssue(issues, 'error', 'knowledge-v3', 'Falta el resumen del estilo.', `${path}.summary`);
    keys.push(profile?.key);
    validateTextList(issues, 'knowledge-v3', `${path}.macro`, profile?.macro, true);
    validateTextList(issues, 'knowledge-v3', `${path}.vision`, profile?.vision, true);
    validateTextList(issues, 'knowledge-v3', `${path}.objectives`, profile?.objectives, true);
    validateTextList(issues, 'knowledge-v3', `${path}.tempo`, profile?.tempo, true);
    validateTextList(issues, 'knowledge-v3', `${path}.mistakes`, profile?.mistakes, true);
    validateTextList(issues, 'knowledge-v3', `${path}.matchups`, profile?.matchups?.map((item) => item?.label), true);
    profile?.matchups?.forEach((matchup, matchupIndex) => {
      const matchupPath = `${path}.matchups[${matchupIndex}]`;
      if (!matchup?.against) pushIssue(issues, 'error', 'knowledge-v3', 'Cada matchup debe indicar el estilo contrario.', `${matchupPath}.against`);
      if (!matchup?.label) pushIssue(issues, 'error', 'knowledge-v3', 'Cada matchup debe tener etiqueta.', `${matchupPath}.label`);
      if (!matchup?.detail) pushIssue(issues, 'warning', 'knowledge-v3', 'Cada matchup debería tener detalle.', `${matchupPath}.detail`);
    });
  });
  if (hasDuplicates(keys)) pushIssue(issues, 'error', 'knowledge-v3', 'Hay claves duplicadas en Knowledge Layer v3.', 'STYLE_KNOWLEDGE_V3');
}

function validateSimpleRuleSet(issues, scope, rules, requiredFields = []) {
  if (!Array.isArray(rules) || !rules.length) {
    pushIssue(issues, 'error', scope, 'No hay reglas definidas.', scope.toUpperCase());
    return;
  }

  const keys = [];
  rules.forEach((rule, index) => {
    const path = `${scope}[${index}]`;
    keys.push(rule?.key);
    requiredFields.forEach((field) => {
      if (!rule?.[field]) {
        pushIssue(issues, 'error', scope, `Falta ${field}.`, `${path}.${field}`);
      }
    });
  });
  if (hasDuplicates(keys)) pushIssue(issues, 'error', scope, 'Hay claves duplicadas.', scope.toUpperCase());
}

function validateSynergyRules(issues) {
  validateSimpleRuleSet(issues, 'synergies.direct', DIRECT_SYNERGY_RULES, ['key', 'label', 'detail']);
  validateSimpleRuleSet(issues, 'synergies.macro', MACRO_SYNERGY_RULES, ['key', 'label', 'detail']);
  DIRECT_SYNERGY_RULES.forEach((rule, index) => validateCategories(issues, 'synergies', `DIRECT_SYNERGY_RULES[${index}].categories`, rule?.categories));
  MACRO_SYNERGY_RULES.forEach((rule, index) => validateCategories(issues, 'synergies', `MACRO_SYNERGY_RULES[${index}].categories`, rule?.categories));
}

function validatePatterns(issues) {
  validateSimpleRuleSet(issues, 'patterns', PATTERN_RULES, ['key', 'label', 'detail']);
  PATTERN_RULES.forEach((rule, index) => validateCategories(issues, 'patterns', `PATTERN_RULES[${index}].categories`, rule?.categories));
}

function validateDependencies(issues) {
  validateSimpleRuleSet(issues, 'dependencies', DEPENDENCY_RULES, ['key', 'label', 'kind', 'detail']);
  DEPENDENCY_RULES.forEach((rule, index) => validateCategories(issues, 'dependencies', `DEPENDENCY_RULES[${index}].match`, rule?.match));
}

function validateConflicts(issues) {
  validateSimpleRuleSet(issues, 'conflicts', CONFLICT_RULES, ['key', 'detail']);
  CONFLICT_RULES.forEach((rule, index) => {
    const path = `CONFLICT_RULES[${index}]`;
    if (!Array.isArray(rule?.labels) || rule.labels.length !== 2) {
      pushIssue(issues, 'error', 'conflicts', 'Cada conflicto debe comparar exactamente dos identidades.', `${path}.labels`);
    }
  });
}

function validateWinConditions(issues) {
  validateSimpleRuleSet(issues, 'win-conditions', WIN_CONDITION_RULES, ['key', 'label', 'detail']);
}

function validateBanProfiles(issues) {
  validateSimpleRuleSet(issues, 'ban-profiles', BAN_PROFILE_RULES, ['key', 'label']);
  BAN_PROFILE_RULES.forEach((rule, index) => validateTextList(issues, 'ban-profiles', `BAN_PROFILE_RULES[${index}].bans`, rule?.bans, true));
}

function validatePickProfiles(issues) {
  validateSimpleRuleSet(issues, 'pick-profiles', PICK_PROFILE_RULES, ['key', 'label']);
}

export function validateKnowledgeLayer() {
  const issues = [];

  validateIdentityRelations(issues);
  validateStrategicProfiles(issues);
  validateKnowledgeV3(issues);
  validateSynergyRules(issues);
  validatePatterns(issues);
  validateDependencies(issues);
  validateConflicts(issues);
  validateWinConditions(issues);
  validateBanProfiles(issues);
  validatePickProfiles(issues);

  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
    summary: {
      identities: IDENTITY_RELATIONS.length,
      strategicProfiles: STRATEGIC_PROFILES_V2.length,
      knowledgeV3Styles: STYLE_KNOWLEDGE_V3.length,
      directSynergies: DIRECT_SYNERGY_RULES.length,
      macroSynergies: MACRO_SYNERGY_RULES.length,
      patterns: PATTERN_RULES.length,
      dependencies: DEPENDENCY_RULES.length,
      conflicts: CONFLICT_RULES.length,
      winConditions: WIN_CONDITION_RULES.length,
      bans: BAN_PROFILE_RULES.length,
      picks: PICK_PROFILE_RULES.length,
    },
  };
}

export function formatKnowledgeReport(report) {
  const summary = report?.summary || {};
  const totalIssues = Array.isArray(report?.issues) ? report.issues.length : 0;
  return `Knowledge layer ${report?.valid ? 'OK' : 'CHECK'} · ${summary.strategicProfiles || 0} perfiles · ${summary.knowledgeV3Styles || 0} estilos v3 · ${totalIssues} incidencias`;
}
