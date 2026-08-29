// Role Skill Gap Analysis Engine
export {
  analyzeSkillGaps,
  computeOverallReadiness,
  identifyBlockersAndStrengths,
  buildGapProfile,
  generateGapRecommendations,
  type RoleSkillRequirement,
  type StudentSkillSignal,
} from './analyzer.js';

export { SignalSkillState, SignalTrend } from '../../domain/types.js';
