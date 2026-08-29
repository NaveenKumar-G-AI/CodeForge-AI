/**
 * Evidence Extractor - Feature 35
 * Extracts skill evidence from evaluations per spec §11, §29
 */

import {
  EvidenceState,
  ConfidenceBand,
  SkillEvidenceRecord,
  StructuredEvaluation,
  SkillCoverageState,
} from '../../domain/types.js';

export interface SkillProgress {
  skill: string;
  questionsAsked: number;
  highestConfidence: ConfidenceBand | null;
  supportingEvaluationIds: string[];
}

export class EvidenceExtractor {
  /**
   * Map confidence band to evidence state per §11
   */
  static evidenceStateFor(confidence: ConfidenceBand | null): EvidenceState {
    switch (confidence) {
      case 'HIGH': return 'VERIFIED';
      case 'MODERATE': return 'PARTIALLY_VERIFIED';
      case 'LOW': return 'UNCERTAIN';
      default: return 'UNASSESSED';
    }
  }

  /**
   * Extract skill evidence records from session progress per §29
   * Skips skills with 0 questions asked
   */
  static extractSkillEvidence(
    progress: Record<string, SkillProgress>,
    evaluations: StructuredEvaluation[]
  ): SkillEvidenceRecord[] {
    const records: SkillEvidenceRecord[] = [];

    for (const [skill, skillProgress] of Object.entries(progress)) {
      if (skillProgress.questionsAsked === 0) {
        continue; // §11/§29: no questions asked → no evidence record
      }

      const highestConfidence = skillProgress.highestConfidence || 'LOW';
      const evidenceState = this.evidenceStateFor(highestConfidence);

      records.push({
        skill,
        evidenceState,
        confidence: highestConfidence,
        supportingEvaluationIds: skillProgress.supportingEvaluationIds,
      });
    }

    return records;
  }

  /**
   * Compute skill coverage state per §28-29
   */
  static computeSkillCoverage(
    skill: string,
    progress: SkillProgress,
    importance: 'CORE' | 'IMPORTANT' | 'SUPPORTING' | 'OPTIONAL',
    blueprint: {
      coverageRules: {
        sufficientEvidenceThreshold: ConfidenceBand;
        minQuestionsPerCoreSkill: number;
      };
    }
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
   */
  static buildCoverageReport(
    blueprint: any,
    perSkillProgress: Record<string, SkillProgress>
  ): {
    requiredSkills: string[];
    perSkill: Record<string, SkillCoverageState>;
    sufficientlyAssessed: string[];
    partiallyAssessed: string[];
    unassessed: string[];
    isComplete: boolean;
  } {
    const requiredSkills = blueprint.targetSkills.map((s: any) => s.skill);
    const perSkill: Record<string, SkillCoverageState> = {};
    const sufficientlyAssessed: string[] = [];
    const partiallyAssessed: string[] = [];
    const unassessed: string[] = [];

    for (const skill of requiredSkills) {
      const progress = perSkillProgress[skill] || { questionsAsked: 0, highestConfidence: null, supportingEvaluationIds: [] };
      const importance = blueprint.targetSkills.find((s: any) => s.skill === skill)?.importance || 'OPTIONAL';

      const coverage = this.computeSkillCoverage(skill, progress, importance, blueprint);
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

  private static meetsThreshold(band: ConfidenceBand | null, threshold: ConfidenceBand): boolean {
    if (!band) return false;
    const ranks = { LOW: 0, MODERATE: 1, HIGH: 2 };
    return ranks[band] >= ranks[threshold];
  }
}
