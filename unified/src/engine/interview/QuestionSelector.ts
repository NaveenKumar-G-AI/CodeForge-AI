/**
 * Question Selector - Feature 35
 * Selects next topic and question type per spec §13, §14
 */

import {
  TechnicalInterviewBlueprint as InterviewBlueprint,
  InterviewSessionState as SessionState,
  InterviewMode,
  QuestionType,
  SkillImportance,
  InterviewDifficultyLevel as DifficultyLevel,
  RoleSkillRequirement,
  DepthLevel,
  CandidateEvidenceBundle,
  EvidenceArtifactRef,
} from '../../domain/types.js';

export interface TopicCandidate {
  skill: string;
  importance: SkillImportance;
  evidenceExists: boolean;
  recentDistance: number; // Distance from last asked (higher = not asked recently)
}

export interface SessionProgress {
  perSkill: Record<string, {
    questionsAsked: number;
    highestConfidence: 'LOW' | 'MODERATE' | 'HIGH' | null;
    supportingEvaluationIds: string[];
  }>;
  recentSkills: string[]; // Most recent first
  currentTopic: {
    skill: string;
    depthLevel: DepthLevel;
    rootQuestionId: string;
    followUpsSoFar: number;
    retriesAtCurrentDepth: number;
  } | null;
}

export class QuestionSelector {
  // Importance weights per spec
  private static readonly IMPORTANCE_WEIGHT: Record<SkillImportance, number> = {
    CORE: 4,
    IMPORTANT: 3,
    SUPPORTING: 2,
    OPTIONAL: 1,
  };

  private static readonly COVERAGE_URGENCY = {
    UNASSESSED: 3,
    PARTIALLY_ASSESSED: 1,
    SUFFICIENTLY_ASSESSED: -Infinity,
  };

  /**
   * Select next topic per spec §13
   * Returns highest-value topic or null if all skills SUFFICIENTLY_ASSESSED or already rooted
   */
  static selectNextTopic(
    blueprint: InterviewBlueprint,
    progress: SessionProgress
  ): TopicCandidate | null {
    const { targetSkills, questionStrategy } = blueprint;
    const { perSkill, recentSkills } = progress;

    // Build candidates for each target skill
    const candidates: TopicCandidate[] = targetSkills
      .filter(skillReq => {
        // Skip if already SUFFICIENTLY_ASSESSED
        const skillProgress = perSkill[skillReq.skill];
        if (skillProgress && this.meetsThreshold(skillProgress.highestConfidence, blueprint.coverageRules.sufficientEvidenceThreshold)) {
          return false;
        }
        // Skip if already has a root question (we don't want duplicate roots)
        if (skillProgress && skillProgress.questionsAsked > 0) {
          return false;
        }
        return true;
      })
      .map(skillReq => {
        const skillProgress = perSkill[skillReq.skill] || { questionsAsked: 0, highestConfidence: null, supportingEvaluationIds: [] };
        const evidenceExists = !!blueprint.evidenceSourcesUsed.some(src =>
          progress.perSkill[skillReq.skill]?.supportingEvaluationIds.length
        );

        // Calculate recent distance for diversity penalty
        const recentIndex = recentSkills.indexOf(skillReq.skill);
        const recentDistance = recentIndex >= 0 ? questionStrategy.diversityWindow - recentIndex : questionStrategy.diversityWindow + 1;

        return {
          skill: skillReq.skill,
          importance: skillReq.importance,
          evidenceExists,
          recentDistance: Math.max(0, recentDistance),
        };
      });

    if (candidates.length === 0) {
      return null; // All skills covered
    }

    // Score candidates
    const scored = candidates.map(c => {
      const baseScore = this.IMPORTANCE_WEIGHT[c.importance];
      const urgencyScore = this.COVERAGE_URGENCY[c.recentDistance > 0 ? 'UNASSESSED' : 'PARTIALLY_ASSESSED'];
      const diversityBonus = Math.max(0, c.recentDistance) * 0.5;
      const evidenceBonus = c.evidenceExists ? 1 : 0; // §14: boost if evidence exists

      return { ...c, score: baseScore + urgencyScore + diversityBonus + evidenceBonus };
    });

    // Return highest scoring
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  /**
   * Pick question type based on mode and available evidence per spec
   */
  static pickQuestionType(
    mode: InterviewMode,
    skill: string,
    evidence: CandidateEvidenceBundle
  ): QuestionType {
    // Mode-driven defaults
    switch (mode) {
      case 'DEBUGGING_INTERVIEW':
        return 'DEBUGGING';
      case 'ARCHITECTURE_INTERVIEW':
        return 'ARCHITECTURE';
      case 'SCENARIO_INTERVIEW':
        return 'SCENARIO';
      case 'GAP_VERIFICATION':
        return 'VERIFICATION';
      case 'PROJECT_DEFENSE':
        // Prefer PROJECT_BASED if project evidence exists
        return evidence.bySkill[skill]?.some(e => e.sourceType === 'PROJECT_SUBMISSION') ? 'PROJECT_BASED' : 'CONCEPTUAL';
      case 'CODE_DEFENSE':
        // Prefer CODE_BASED if code evidence exists
        return evidence.bySkill[skill]?.some(e => e.sourceType === 'CODING_SUBMISSION') ? 'CODE_BASED' : 'CONCEPTUAL';
      default: {
        // Evidence-driven for TECHNICAL_SCREENING, SKILL_VERIFICATION, DEEP_TECHNICAL
        const sources = evidence.bySkill[skill] || [];
        if (sources.some(e => e.sourceType === 'DEBUGGING_EVIDENCE')) return 'DEBUGGING';
        if (sources.some(e => e.sourceType === 'REASONING_EVIDENCE')) return 'APPLIED';
        if (sources.some(e => e.sourceType === 'CODING_SUBMISSION')) return 'CODE_BASED';
        if (sources.some(e => e.sourceType === 'PROJECT_SUBMISSION')) return 'PROJECT_BASED';
        return 'CONCEPTUAL';
      }
    }
  }

  /**
   * Check if confidence meets threshold
   */
  static meetsThreshold(band: 'LOW' | 'MODERATE' | 'HIGH' | null, threshold: 'LOW' | 'MODERATE' | 'HIGH'): boolean {
    if (!band) return false;
    const ranks = { LOW: 0, MODERATE: 1, HIGH: 2 };
    return ranks[band] >= ranks[threshold];
  }

  /**
   * Get next depth level per §27 progressive depth ladder
   */
  static nextRung(current: DepthLevel): DepthLevel | null {
    const ladder: DepthLevel[] = ['DEFINITION', 'APPLICATION', 'REASONING', 'TRADE_OFF', 'FAILURE_SCENARIO'];
    const idx = ladder.indexOf(current);
    if (idx >= 0 && idx < ladder.length - 1) {
      return ladder[idx + 1];
    }
    return null;
  }
}
