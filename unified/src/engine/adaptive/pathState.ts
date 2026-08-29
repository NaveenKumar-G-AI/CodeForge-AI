// Adaptive Challenge Engine — Path State Machine
import {
  PathStage,
  AdaptivePathState,
  AdaptivePathEvent,
  AdaptiveSkillState,
} from '../../domain/types.js';

export const STAGE_ORDER: PathStage[] = [
  'FOUNDATION',
  'PRACTICE',
  'VARIATION',
  'TRANSFER',
  'APPLICATION',
  'ADVANCED',
  'ROLE_ASSESSMENT',
];

const STAGE_TRANSITIONS: Record<PathStage, { next: PathStage[]; conditions: string[] }> = {
  FOUNDATION: { next: ['PRACTICE'], conditions: ['primary_skill >= PRACTICED'] },
  PRACTICE: { next: ['VARIATION', 'TRANSFER'], conditions: ['primary_skill >= PROFICIENT', 'has_transfer_evidence'] },
  VARIATION: { next: ['TRANSFER', 'APPLICATION'], conditions: ['transfer_skill >= DEVELOPING', 'multiple_contexts'] },
  TRANSFER: { next: ['APPLICATION', 'ADVANCED'], conditions: ['transfer_skill >= PRACTICED', 'application_skill >= DEVELOPING'] },
  APPLICATION: { next: ['ADVANCED', 'ROLE_ASSESSMENT'], conditions: ['application_skill >= PROFICIENT', 'role_skills >= DEVELOPING'] },
  ADVANCED: { next: ['ROLE_ASSESSMENT'], conditions: ['advanced_skills >= PROFICIENT', 'readiness >= 80'] },
  ROLE_ASSESSMENT: { next: [], conditions: [] },
};

/**
 * Initialize path state for a new student
 */
export function initializePathState(studentId: string): AdaptivePathState {
  return {
    studentId,
    currentStage: 'FOUNDATION',
    history: [
      {
        stage: 'FOUNDATION',
        enteredAt: new Date().toISOString(),
        reason: 'Initial placement for new student',
      },
    ],
  };
}

/**
 * Evaluate if student should advance to next stage
 */
export function evaluateStageTransition(
  currentState: AdaptivePathState,
  skills: Record<string, AdaptiveSkillState>,
  completedChallenges: any[]
): { shouldAdvance: boolean; nextStage: PathStage | null; reason: string } {
  const currentStage = currentState.currentStage;
  const transitions = STAGE_TRANSITIONS[currentStage];

  // Check each possible next stage
  for (const nextStage of transitions.next) {
    const conditions = STAGE_TRANSITIONS[nextStage]?.conditions || [];
    let allMet = true;
    const reasons: string[] = [];

    for (const condition of conditions) {
      const met = checkCondition(condition, skills, completedChallenges);
      if (!met) {
        allMet = false;
        reasons.push(`Not met: ${condition}`);
      }
    }

    if (allMet) {
      return { shouldAdvance: true, nextStage, reason: `Stage conditions met: ${reasons.join(', ')}` };
    }
  }

  return { shouldAdvance: false, nextStage: null, reason: 'Stage conditions not yet met' };
}

function checkCondition(
  condition: string,
  skills: Record<string, AdaptiveSkillState>,
  completedChallenges: any[]
): boolean {
  // Parse conditions like "primary_skill >= PRACTICED"
  const match = condition.match(/(\w+)\s*([><=]+)\s*(\w+)/);
  if (!match) return false;

  const [, metric, operator, threshold] = match;

  switch (metric) {
    case 'primary_skill': {
      // Would need context about which skill is primary
      return true; // Simplified
    }
    case 'transfer_skill':
      return Object.values(skills).some((s) => s.level === 'DEVELOPING' || s.level === 'PRACTICED');
    case 'multiple_contexts':
      return Object.values(skills).some((s) => s.distinctContexts >= 2);
    case 'application_skill':
      return Object.values(skills).some((s) => s.level === 'DEVELOPING' || s.level === 'PRACTICED');
    case 'role_skills':
      return Object.values(skills).some((s) => s.level !== 'UNKNOWN' && s.level !== 'INTRODUCED');
    case 'advanced_skills':
      return Object.values(skills).some((s) => s.level === 'PROFICIENT' || s.level === 'MASTERED');
    case 'readiness':
      return true; // Would compute from role readiness engine
    case 'has_transfer_evidence':
      return completedChallenges.some((c) => c.transferGroup !== 'none');
    default:
      return false;
  }
}

/**
 * Advance to next stage
 */
export function advanceStage(
  state: AdaptivePathState,
  nextStage: PathStage,
  reason: string,
  challengeId?: string
): AdaptivePathState {
  const newState = { ...state };
  newState.currentStage = nextStage;
  newState.history = [
    ...state.history,
    {
      stage: nextStage,
      enteredAt: new Date().toISOString(),
      reason,
      challengeId,
    },
  ];
  return newState;
}

/**
 * Get current stage info
 */
export function getStageInfo(stage: PathStage): {
  name: string;
  description: string;
  focus: string;
  typicalDuration: string;
} {
  const info: Record<PathStage, any> = {
    FOUNDATION: {
      name: 'Foundation',
      description: 'Building core concepts and basic proficiency',
      focus: 'Learn fundamental algorithms, data structures, and syntax',
      typicalDuration: '2-4 weeks',
    },
    PRACTICE: {
      name: 'Practice',
      description: 'Reinforcing core skills through varied exercises',
      focus: 'Solve problems applying core concepts in different contexts',
      typicalDuration: '3-6 weeks',
    },
    VARIATION: {
      name: 'Variation',
      description: 'Applying skills to variations and extensions',
      focus: 'Tackle problems with modified constraints and new edge cases',
      typicalDuration: '2-4 weeks',
    },
    TRANSFER: {
      name: 'Transfer',
      description: 'Applying known skills to novel contexts',
      focus: 'Solve problems in unfamiliar domains using familiar techniques',
      typicalDuration: '2-3 weeks',
    },
    APPLICATION: {
      name: 'Application',
      description: 'Real-world problem solving and project work',
      focus: 'Build complete features/projects integrating multiple skills',
      typicalDuration: '3-5 weeks',
    },
    ADVANCED: {
      name: 'Advanced',
      description: 'Deep specialization and optimization',
      focus: 'Complex algorithms, system design, performance optimization',
      typicalDuration: '4-8 weeks',
    },
    ROLE_ASSESSMENT: {
      name: 'Role Assessment',
      description: 'Demonstrating role readiness',
      focus: 'Complete role-specific assessments and interview simulations',
      typicalDuration: '2-4 weeks',
    },
  };
  return info[stage];
}

/**
 * Get recommended challenge characteristics for current stage
 */
export function getStageChallengeProfile(stage: PathStage): {
  difficultyRange: [number, number];
  familyTiers: string[];
  transferGroups: string[];
  isDiagnostic: boolean;
} {
  const profiles: Record<PathStage, any> = {
    FOUNDATION: { difficultyRange: [0.1, 0.4], familyTiers: ['BASIC'], transferGroups: ['none'], isDiagnostic: true },
    PRACTICE: { difficultyRange: [0.3, 0.6], familyTiers: ['BASIC', 'INTERMEDIATE'], transferGroups: ['none'], isDiagnostic: false },
    VARIATION: { difficultyRange: [0.4, 0.7], familyTiers: ['INTERMEDIATE'], transferGroups: ['none', 'variation'], isDiagnostic: false },
    TRANSFER: { difficultyRange: [0.4, 0.7], familyTiers: ['INTERMEDIATE', 'TRANSFER'], transferGroups: ['transfer'], isDiagnostic: false },
    APPLICATION: { difficultyRange: [0.5, 0.8], familyTiers: ['ADVANCED', 'TRANSFER'], transferGroups: ['application'], isDiagnostic: false },
    ADVANCED: { difficultyRange: [0.6, 0.9], familyTiers: ['ADVANCED'], transferGroups: ['advanced'], isDiagnostic: false },
    ROLE_ASSESSMENT: { difficultyRange: [0.5, 0.8], familyTiers: ['ADVANCED', 'TRANSFER'], transferGroups: ['role'], isDiagnostic: false },
  };
  return profiles[stage];
}