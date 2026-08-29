/**
 * Coverage Tracker - Feature 35
 * Tracks per-skill coverage and makes stopping decisions per spec §28-29, §30
 */

import {
  SkillCoverageState,
  ConfidenceBand,
  TechnicalInterviewBlueprint as InterviewBlueprint,
  RoleSkillRequirement,
} from '../../domain/types.js';

export interface SkillProgress {
  skill: string;
  questionsAsked: number;
  highestConfidence: ConfidenceBand | null;
  supportingEvaluationIds: string[];
}

export interface StoppingDecision {
  shouldStop: boolean;
  reason: 'COVERAGE_COMPLETE' | 'MAX_QUESTIONS_REACHED' | 'MAX_DURATION_REACHED' | 'CONTINUE';
}

export class CoverageTracker {
  /**
   * Check if confidence meets threshold
   */
  static meetsThreshold(band: ConfidenceBand | null, threshold: ConfidenceBand): boolean {
    if (!band) return false;
    const ranks = { LOW: 0, MODERATE: 1, HIGH: 2 };
    return ranks[band] >= ranks[threshold];
  }

  /**
   * Compute per-skill coverage state per §28-29
   */
  static computeSkillCoverage(
    progress: SkillProgress,
    importance: RoleSkillRequirement['importance'],
    blueprint: InterviewBlueprint
  ): SkillCoverageState {
    if (progress.questionsAsked === 0) {
      return 'UNASSESSED';
    }

    const minQuestions = importance === 'CORE' ? blueprint.coverageRules.minQuestionsPerCoreSkill : 1;
    const enoughQuestions = progress.questionsAsked >= minQuestions;
    const confidentEnough = this.meetsThreshold(progress.highestConfidence, blueprint.coverageRules.sufficientEvidenceThreshold);

    if (enoughQuestions && confidentEnough) {
      return 'SUFFICIENTLY_ASSESSED';
    }
    return 'PARTIALLY_ASSESSED';
  }

  /**
   * Build complete coverage report per §29
   * isComplete reflects reality - never silently reported as full when it wasn't
   */
  static buildCoverageReport(
    blueprint: InterviewBlueprint,
    perSkillProgress: Record<string, SkillProgress>
  ): {
    requiredSkills: string[];
    perSkill: Record<string, SkillCoverageState>;
    sufficientlyAssessed: string[];
    partiallyAssessed: string[];
    unassessed: string[];
    isComplete: boolean;
  } {
    const requiredSkills = blueprint.targetSkills.map(s => s.skill);
    const perSkill: Record<string, SkillCoverageState> = {};
    const sufficientlyAssessed: string[] = [];
    const partiallyAssessed: string[] = [];
    const unassessed: string[] = [];

    for (const skill of requiredSkills) {
      const progress = perSkillProgress[skill] || { questionsAsked: 0, highestConfidence: null, supportingEvaluationIds: [] };
      const importance = blueprint.targetSkills.find(s => s.skill === skill)?.importance || 'OPTIONAL';

      const coverage = this.computeSkillCoverage(progress, importance, blueprint);
      perSkill[skill] = coverage;

      switch (coverage) {
        case 'SUFFICIENTLY_ASSESSED':
          sufficientlyAssessed.push(skill);
          break;
        case 'PARTIALLY_ASSESSED':
          partiallyAssessed.push(skill);
          break;
        case 'UNASSESSED':
          unassessed.push(skill);
          break;
      }
    }

    // §29: honest about incomplete coverage
    const isComplete = sufficientlyAssessed.length === requiredSkills.length;

    return {
      requiredSkills,
      perSkill,
      sufficientlyAssessed,
      partiallyAssessed,
      unassessed,
      isComplete,
    };
  }

  /**
   * Decide whether to stop the interview per §30
   */
  static decideStop(
    blueprint: InterviewBlueprint,
    coverage: ReturnType<typeof CoverageTracker.buildCoverageReport>,
    questionsAsked: number,
    elapsedMinutes: number
  ): StoppingDecision {
    // Coverage complete - all required skills sufficiently assessed
    if (coverage.isComplete) {
      return { shouldStop: true, reason: 'COVERAGE_COMPLETE' };
    }

    // Max questions reached - but coverage stays honest
    if (questionsAsked >= blueprint.timeConfig.maxQuestions) {
      return { shouldStop: true, reason: 'MAX_QUESTIONS_REACHED' };
    }

    // Max duration reached - but coverage stays honest
    if (elapsedMinutes >= blueprint.timeConfig.maxDurationMinutes) {
      return { shouldStop: true, reason: 'MAX_DURATION_REACHED' };
    }

    return { shouldStop: false, reason: 'CONTINUE' };
  }
}
