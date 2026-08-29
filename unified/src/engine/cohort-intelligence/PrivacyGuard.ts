/**
 * Privacy Guard - Feature 36
 * Enforces privacy thresholds per spec
 */

import { NotFoundError } from '../../domain/types.js';

export interface PrivacyPolicy {
  minCohortSize: number;
  minCoverageForClaim: number;
}

export class PrivacyGuard {
  /**
   * Check if cohort passes privacy threshold
   */
  static checkPrivacy(
    cohortSize: number,
    policy: PrivacyPolicy
  ): { restricted: boolean; reason: string } {
    if (cohortSize < policy.minCohortSize) {
      return { restricted: true, reason: 'COHORT_TOO_SMALL' };
    }
    return { restricted: false, reason: '' };
  }

  /**
   * Assert entity belongs to organization (tenant isolation)
   * Throws NotFoundError (404, not 403) to avoid ID enumeration
   */
  static assertBelongsToOrganization<T extends { organizationId: string }>(
    entity: T,
    organizationId: string,
    entityName: string
  ): void {
    if (entity.organizationId !== organizationId) {
      throw new NotFoundError(`${entityName} not found`);
    }
  }

  /**
   * Assert two entities are comparable
   */
  static assertComparable(
    a: { roleModelVersion: string; assessmentSchemaVersion: string; coveragePct: number; cohortSize: number },
    b: { roleModelVersion: string; assessmentSchemaVersion: string; coveragePct: number; cohortSize: number },
    options: { minCoverage?: number; minCohortSize?: number } = {}
  ): { comparable: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (a.roleModelVersion !== b.roleModelVersion) {
      reasons.push('Role model version mismatch');
    }
    if (a.assessmentSchemaVersion !== b.assessmentSchemaVersion) {
      reasons.push('Assessment schema version mismatch');
    }
    if (a.coveragePct < (options.minCoverage || 0.3) || b.coveragePct < (options.minCoverage || 0.3)) {
      reasons.push('Insufficient coverage for comparison');
    }
    if (a.cohortSize < (options.minCohortSize || 10) || b.cohortSize < (options.minCohortSize || 10)) {
      reasons.push('Cohort too small for comparison');
    }

    return {
      comparable: reasons.length === 0,
      reasons,
    };
  }
}