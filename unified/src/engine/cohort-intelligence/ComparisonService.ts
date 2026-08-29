/**
 * Comparison Service - Feature 36
 * Compares two cohorts for benchmarking
 */

import { CohortExecutiveOverview, CoverageResult } from '../../domain/types.js';
import { DashboardService } from './DashboardService.js';
import { PrivacyGuard } from './PrivacyGuard.js';

export interface CohortRepository {
  getCohort(id: string): Promise<{ id: string; organizationId: string; name: string } | null>;
  getSkillAggregates(cohortId: string): Promise<any[]>;
  getRoleAggregates(cohortId: string): Promise<any[]>;
  getTrainingInsights(cohortId: string): Promise<any[]>;
  getCohortSize(cohortId: string): Promise<number>;
  getPrivacyPolicy(orgId: string): Promise<{ minCohortSize: number; minCoverageForClaim: number }>;
}

export class ComparisonService {
  constructor(
    private readonly repo: CohortRepository,
    private readonly dashboardService: DashboardService
  ) {}

  /**
   * Compare two cohorts
   */
  async compareCohorts(orgId: string, cohortIdA: string, cohortIdB: string): Promise<{
    comparable: boolean;
    reasons: string[];
    overviewA?: CohortExecutiveOverview;
    overviewB?: CohortExecutiveOverview;
  }> {
    const [cohortA, cohortB] = await Promise.all([
      this.repo.getCohort(cohortIdA),
      this.repo.getCohort(cohortIdB),
    ]);

    if (!cohortA || !cohortB) {
      throw new Error('One or both cohorts not found');
    }

    // Check if cohorts are comparable
    const skillAggsA = await this.repo.getSkillAggregates(cohortIdA);
    const skillAggsB = await this.repo.getSkillAggregates(cohortIdB);
    const roleAggsA = await this.repo.getRoleAggregates(cohortIdA);
    const roleAggsB = await this.repo.getRoleAggregates(cohortIdB);

    const comparison = PrivacyGuard.assertComparable(
      {
        roleModelVersion: '1.0', // Would come from metadata
        assessmentSchemaVersion: '1.0',
        coveragePct: this.avgCoverage(skillAggsA),
        cohortSize: await this.repo.getCohortSize(cohortIdA),
      },
      {
        roleModelVersion: '1.0',
        assessmentSchemaVersion: '1.0',
        coveragePct: this.avgCoverage(skillAggsB),
        cohortSize: await this.repo.getCohortSize(cohortIdB),
      }
    );

    if (!comparison.comparable) {
      return { comparable: false, reasons: comparison.reasons };
    }

    const [overviewA, overviewB] = await Promise.all([
      this.dashboardService.getCohortExecutiveOverview(orgId, cohortIdA),
      this.dashboardService.getCohortExecutiveOverview(orgId, cohortIdB),
    ]);

    return { comparable: true, reasons: [], overviewA, overviewB };
  }

  private avgCoverage(aggs: any[]): number {
    if (aggs.length === 0) return 0;
    return aggs.reduce((sum, a) => sum + a.coveragePct, 0) / aggs.length;
  }
}
