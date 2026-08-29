/**
 * Prioritization Engine - Feature 36
 * Scores and ranks training priorities per spec
 */

import {
  GapPriority,
  InterventionCategory,
  CoverageState,
} from '../../domain/types.js';

export interface TrainingPriorityInput {
  skill: string;
  gapPriority: GapPriority;
  roleImportance: number; // 0-1
  trainingImpactPotential: number; // 0-1
  coverage: CoverageState;
}

export interface ScoredPriority extends TrainingPriorityInput {
  score: number;
  rationale: string[];
}

export class PrioritizationEngine {
  private static readonly GAP_WEIGHT: Record<GapPriority, number> = {
    HIGH: 3,
    MODERATE: 2,
    EMERGING: 1,
    INSUFFICIENT_EVIDENCE: 0,
  };

  /**
   * Score training priority
   */
  static scoreTrainingPriority(input: TrainingPriorityInput): ScoredPriority {
    const rationale: string[] = [];

    if (input.coverage === 'INSUFFICIENT' || input.coverage === 'LOW') {
      return {
        ...input,
        score: 0,
        rationale: ['Evidence coverage insufficient'],
      };
    }

    const gapScore = this.GAP_WEIGHT[input.gapPriority];
    const score = gapScore * 0.5 +
      input.roleImportance * 0.25 +
      input.trainingImpactPotential * 0.25;

    if (gapScore > 0) {
      rationale.push(`Gap priority: ${input.gapPriority} (weight ${gapScore})`);
    }
    rationale.push(`Role importance: ${Math.round(input.roleImportance * 100)}%`);
    rationale.push(`Training impact potential: ${Math.round(input.trainingImpactPotential * 100)}%`);

    return { ...input, score, rationale };
  }

  /**
   * Rank priorities by score descending
   */
  static rankTrainingPriorities(inputs: TrainingPriorityInput[]): ScoredPriority[] {
    return inputs
      .map(this.scoreTrainingPriority)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Classify intervention categories based on distribution and gaps
   */
  static classifyInterventions(input: {
    distribution: Record<'NOT_ASSESSED' | 'EMERGING' | 'DEVELOPING' | 'PROFICIENT' | 'STRONG', number>;
    interviewVerificationRate: number; // 0-1
    roleSpecificGap: boolean;
  }): InterventionCategory[] {
    const interventions: InterventionCategory[] = [];

    const total = Object.values(input.distribution).reduce((a, b) => a + b, 0);
    const assessed = total - input.distribution.NOT_ASSESSED;
    const proficientPlus = input.distribution.PROFICIENT + input.distribution.STRONG;
    const proficientShare = assessed > 0 ? proficientPlus / assessed : 0;

    // Heuristic rules
    if (proficientShare < 0.3) {
      interventions.push('NEEDS_FOUNDATION_SUPPORT');
    }
    if (proficientShare >= 0.3 && proficientShare < 0.7) {
      interventions.push('NEEDS_PRACTICE');
    }
    if (proficientShare >= 0.7) {
      interventions.push('NEEDS_ADVANCED_CHALLENGES');
    }
    if (input.interviewVerificationRate < 0.5) {
      interventions.push('NEEDS_INTERVIEW_VERIFICATION');
    }
    if (input.roleSpecificGap) {
      interventions.push('NEEDS_ROLE_SPECIFIC_PREPARATION');
    }

    return interventions;
  }
}
