/**
 * Distribution Engine - Feature 36
 * Computes mastery/readiness distributions and trends per spec
 */

import {
  CohortMasteryLevel,
  CohortReadinessState,
  TrendDirection,
  CoverageState,
} from '../../domain/types.js';

export class DistributionEngine {
  /**
   * Build mastery distribution from individual levels
   */
  static buildMasteryDistribution(individualLevels: CohortMasteryLevel[]): Record<CohortMasteryLevel, number> {
    const distribution: Record<CohortMasteryLevel, number> = {
      NOT_ASSESSED: 0,
      EMERGING: 0,
      DEVELOPING: 0,
      PROFICIENT: 0,
      STRONG: 0,
    };

    for (const level of individualLevels) {
      if (Object.prototype.hasOwnProperty.call(distribution, level)) {
        distribution[level]++;
      }
    }

    return distribution;
  }

  /**
   * Get dominant mastery level (mode among assessed students)
   * Only claims if coverage clears bar
   */
  static dominantLevel(
    distribution: Record<CohortMasteryLevel, number>,
    coverage: CoverageState
  ): CohortMasteryLevel | null {
    if (coverage === 'INSUFFICIENT' || coverage === 'LOW') {
      return null;
    }

    // Filter out NOT_ASSESSED
    const assessed: Partial<Record<CohortMasteryLevel, number>> = { ...distribution };
    delete assessed.NOT_ASSESSED;

    let maxLevel: CohortMasteryLevel | null = null;
    let maxCount = 0;

    for (const [level, count] of Object.entries(assessed)) {
      if (count > maxCount) {
        maxCount = count;
        maxLevel = level as CohortMasteryLevel;
      }
    }

    return maxLevel;
  }

  /**
   * Build readiness distribution
   */
  static buildReadinessDistribution(individualStates: CohortReadinessState[]): Record<CohortReadinessState, number> {
    const distribution: Record<CohortReadinessState, number> = {
      READY: 0,
      NEAR_READY: 0,
      DEVELOPING: 0,
      NEEDS_SIGNIFICANT_PREPARATION: 0,
      INSUFFICIENT_EVIDENCE: 0,
    };

    for (const state of individualStates) {
      if (Object.prototype.hasOwnProperty.call(distribution, state)) {
        distribution[state]++;
      }
    }

    return distribution;
  }

  /**
   * Compute trend direction per spec
   * Stable band: ±5pp
   * Only claims trend when BOTH periods have sufficient coverage
   */
  static computeTrend(input: {
    previousProficientShare: number;
    currentProficientShare: number;
    previousCoverage: CoverageState;
    currentCoverage: CoverageState;
  }): { direction: TrendDirection; deltaPct: number } {
    const deltaPct = input.currentProficientShare - input.previousProficientShare;

    // Only claim trend if both periods have sufficient coverage
    if (input.previousCoverage === 'INSUFFICIENT' || input.previousCoverage === 'LOW' ||
        input.currentCoverage === 'INSUFFICIENT' || input.currentCoverage === 'LOW') {
      return { direction: 'INSUFFICIENT_EVIDENCE', deltaPct };
    }

    if (deltaPct >= 0.05) return { direction: 'IMPROVING', deltaPct };
    if (deltaPct <= -0.05) return { direction: 'DECLINING', deltaPct };
    return { direction: 'STABLE', deltaPct };
  }

  /**
   * Classify gap priority per spec
   * Score = gapSeverity*0.45 + roleImportance*0.3 + placementRelevance*0.15 + min(affected/50,1)*0.1
   */
  static classifyGapPriority(input: {
    roleImportance: number; // 0-1
    observedProficiencyShare: number; // 0-1
    placementRelevance: number; // 0-1
    affectedStudents: number;
    coverage: CoverageState;
  }): 'HIGH' | 'MODERATE' | 'EMERGING' | 'INSUFFICIENT_EVIDENCE' {
    if (input.coverage === 'INSUFFICIENT' || input.coverage === 'LOW') {
      return 'INSUFFICIENT_EVIDENCE';
    }

    const gapSeverity = 1 - input.observedProficiencyShare;
    const score = gapSeverity * 0.45 +
      input.roleImportance * 0.3 +
      input.placementRelevance * 0.15 +
      Math.min(input.affectedStudents / 50, 1) * 0.1;

    if (score >= 0.6) return 'HIGH';
    if (score >= 0.35) return 'MODERATE';
    return 'EMERGING';
  }
}
