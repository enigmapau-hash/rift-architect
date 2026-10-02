import { normalizeText } from '../js/engine/utils.js';
import {
  STYLE_KNOWLEDGE_V3,
  summarizeKnowledgeV3Context,
  findKnowledgeStyle,
  findKnowledgeMatchup,
} from './knowledge-v3.js?v=94';

export { IDENTITY_RELATIONS } from './identity-relations.js';
export { DIRECT_SYNERGY_RULES, MACRO_SYNERGY_RULES } from './synergies.js';
export { PATTERN_RULES } from './patterns.js';
export { DEPENDENCY_RULES } from './dependencies.js';
export { CONFLICT_RULES } from './conflicts.js';
export { WIN_CONDITION_RULES } from './win-conditions.js';
export {
  STRATEGIC_PROFILES_V2,
  STRATEGIC_PROFILE_INDEX,
  buildStrategicProfileIndex,
  findStrategicProfile,
  summarizeStrategicProfile,
} from './strategy-profiles.js';
export {
  BAN_PROFILE_RULES,
  BAN_PROFILE_INDEX,
  buildBanProfileIndex,
  findBanProfile,
  summarizeBanProfile,
} from './ban-profiles.js';
export {
  PICK_PROFILE_RULES,
  PICK_PROFILE_INDEX,
  buildPickProfileIndex,
  findPickProfile,
  summarizePickProfile,
} from './pick-profiles.js';
export {
  STYLE_KNOWLEDGE_V3,
  summarizeKnowledgeV3Context,
  findKnowledgeStyle,
  findKnowledgeMatchup,
} from './knowledge-v3.js?v=94';
export { buildKnowledgeV3Context, summarizeKnowledgeV3Context as summarizeKnowledgeV3ContextV3 } from './knowledge-v3-context.js?v=94';
export { validateKnowledgeLayer, formatKnowledgeReport } from './validator.js';