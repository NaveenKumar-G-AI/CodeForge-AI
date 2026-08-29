/**
 * Coverage Engine - Feature 36
 * Computes coverage metrics per spec
 */

import { CoverageResult, CoverageState } from '../../domain/types.js';

export interface CoverageThresholds {
  low: number;
  medium: number;
  high: number;
}

export class CoverageEngine {
  static readonly DEFAULT_THRESHOLDS: CoverageThresholds = {
    low: 0.3,
    medium: 0.5,
    high: 0.75,
  };

  static readonly DEFAULT_MIN_COHORT_SIZE = 10;

  /**
   * Compute coverage result
   */
  static computeCoverage(
    eligibleStudents: number,
    studentsWithEvidence: number,
    thresholds: CoverageThresholds = this.DEFAULT_THRESHOLDS
  ): CoverageResult {
    const coveragePct = eligibleStudents > 0 ? studentsWithEvidence / eligibleStudents : 0;
    let coverageState: CoverageState = 'INSUFFICIENT';

    if (coveragePct >= thresholds.high) coverageState = 'HIGH';
    else if (coveragePct >= thresholds.medium) coverageState = 'MEDIUM';
    else if (coveragePct >= thresholds.low) coverageState = 'LOW';

    return {
      eligibleStudents,
      studentsWithEvidence,
      studentsWithoutEvidence: eligibleStudents - studentsWithEvidence,
      coveragePct,
      coverageState,
    };
  }

  /**
   * Check if strength claim can be made
   */
  static canMakeStrengthClaim(coverage: CoverageResult): boolean {
    return coverage.coverageState !== 'INSUFFICIENT';
  }

  /**
   * Apply privacy threshold
   */
  static applyPrivacyThreshold(
    cohortSize: number,
    policy: { minCohortSize: number; minCoverageForClaim: number }
  ): { restricted: boolean; reason: string } {
    if (cohortSize < policy.minCohortSize) {
      return { restricted: true, reason: 'COHORT_TOO_SMALL' };
    }
    return { restricted: false, reason: '' };
  }
}