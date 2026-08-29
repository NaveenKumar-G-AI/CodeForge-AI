/**
 * Dashboard Service - Feature 36
 * Provides executive overviews and role-specific dashboards
 */

import {
  CohortExecutiveOverview,
  CohortSkillAggregate,
  CohortRoleAggregate,
  CohortTrainingInsight,
  CohortMasteryLevel,
  CohortReadinessState,
  SkillCoverageState,
  TrendDirection,
  FreshnessState,
  CodeForgeIntelligencePorts,
  CoverageResult,
  GapPriority,
} from '../../domain/types.js';
import { CoverageEngine } from './CoverageEngine.js';
import { DistributionEngine } from './DistributionEngine.js';

export interface CohortRepository {
  getCohort(id: string): Promise<{ id: string; organizationId: string; name: string } | null>;
  getSkillAggregates(cohortId: string): Promise<CohortSkillAggregate[]>;
  getRoleAggregates(cohortId: string): Promise<CohortRoleAggregate[]>;
  getTrainingInsights(cohortId: string): Promise<CohortTrainingInsight[]>;
  getCohortSize(cohortId: string): Promise<number>;
  getPrivacyPolicy(orgId: string): Promise<{ minCohortSize: number; minCoverageForClaim: number }>;
}

export class DashboardService {
  constructor(
    private readonly repo: CohortRepository,
    private readonly ports: CodeForgeIntelligencePorts
  ) {}

  /**
   * Get executive overview for a cohort
   */
  async getCohortExecutiveOverview(orgId: string, cohortId: string): Promise<CohortExecutiveOverview> {
    const cohort = await this.repo.getCohort(cohortId);
    if (!cohort) throw new Error('Cohort not found');

    // Privacy guard
    const policy = await this.repo.getPrivacyPolicy(orgId);
    const cohortSize = await this.repo.getCohortSize(cohortId);
    const privacy = CoverageEngine.applyPrivacyThreshold(cohortSize, policy);
    if (privacy.restricted) {
      return {
        strongestAreas: [],
        priorityGaps: [],
        highestImpactRoleGap: null,
        trainingPriorities: [],
        evidenceCoverageSummary: CoverageEngine.computeCoverage(cohortSize, 0),
        observedGrowth: [],
        restricted: true,
      };
    }

    const [skillAggs, roleAggs, trainingInsights] = await Promise.all([
      this.repo.getSkillAggregates(cohortId),
      this.repo.getRoleAggregates(cohortId),
      this.repo.getTrainingInsights(cohortId),
    ]);

    // Strongest areas: PROFICIENT/STRONG skills
    const strongestAreas = skillAggs
      .filter(s => s.dominantLevel === 'PROFICIENT' || s.dominantLevel === 'STRONG')
      .map(s => s.skillId);

    // Priority gaps: HIGH/MODERATE gap priorities
    const priorityGaps: Array<{ skillId: string; roleId: string; priority: GapPriority }> = [];
    for (const role of roleAggs) {
      for (const gap of role.requiredSkillGaps) {
        if (gap.priority === 'HIGH' || gap.priority === 'MODERATE') {
          priorityGaps.push({ skillId: gap.skillId, roleId: role.roleId, priority: gap.priority });
        }
      }
    }

    // Highest impact role gap
    let highestImpactRoleGap: { roleId: string; gapCount: number } | null = null;
    let maxGaps = 0;
    for (const role of roleAggs) {
      const highGaps = role.requiredSkillGaps.filter(g => g.priority === 'HIGH').length;
      if (highGaps > maxGaps) {
        maxGaps = highGaps;
        highestImpactRoleGap = { roleId: role.roleId, gapCount: highGaps };
      }
    }

    // Training priorities
    const trainingPriorities = trainingInsights
      .sort((a, b) => a.priorityRank - b.priorityRank)
      .slice(0, 5)
      .map(t => ({ skillId: t.skillId, label: t.label, gapPriority: t.gapPriority, priorityRank: t.priorityRank }));

    // Evidence coverage summary
    const totalStudents = cohortSize;
    const totalWithEvidence = Math.max(...skillAggs.map(s => s.coverageState === 'INSUFFICIENT' ? 0 : s.coveragePct * totalStudents), 0);
    const evidenceCoverageSummary: CoverageResult = CoverageEngine.computeCoverage(totalStudents, totalWithEvidence);

    // Observed growth: skills with IMPROVING trend
    const observedGrowth = skillAggs
      .filter(s => s.trend === 'IMPROVING')
      .map(s => ({ skillId: s.skillId, trend: s.trend }));

    // Freshness (would check against source data timestamps)
    // Simplified: assume updated recently if computed within 24h
    // const freshness: FreshnessState = 'UPDATED_RECENTLY';

    return {
      strongestAreas,
      priorityGaps,
      highestImpactRoleGap,
      trainingPriorities,
      evidenceCoverageSummary,
      observedGrowth,
      restricted: false,
    };
  }

  /**
   * Get TPO dashboard (multi-cohort view)
   */
  async getTpoDashboard(orgId: string): Promise<any> {
    // Would aggregate across all cohorts in organization
    return { overview: 'TPO Dashboard', orgId };
  }

  /**
   * Get Trainer dashboard (assigned cohorts)
   */
  async getTrainerDashboard(orgId: string, trainerId: string): Promise<any> {
    // Would filter cohorts by trainer assignment
    return { overview: 'Trainer Dashboard', orgId, trainerId };
  }

  /**
   * Get Admin dashboard (org-wide)
   */
  async getAdminDashboard(orgId: string): Promise<any> {
    return { overview: 'Admin Dashboard', orgId };
  }
}
