/**
 * Aggregation Service - Feature 36
 * Main pipeline for recomputing cohort aggregates
 */

import {
  CohortSkillAggregate,
  CohortRoleAggregate,
  CohortTrainingInsight,
  CoverageState,
  CohortMasteryLevel,
  CohortReadinessState,
  GapPriority,
  InterventionCategory,
  CodeForgeIntelligencePorts,
} from '../../domain/types.js';
import { CoverageEngine } from './CoverageEngine.js';
import { DistributionEngine } from './DistributionEngine.js';
import { PrioritizationEngine } from './PrioritizationEngine.js';

export interface CohortRepository {
  getCohort(id: string): Promise<{ id: string; organizationId: string; name: string; kind: string } | null>;
  listMembers(cohortId: string): Promise<Array<{ studentId: string }>>;
  upsertSkillAggregate(agg: CohortSkillAggregate): Promise<void>;
  upsertRoleAggregate(agg: CohortRoleAggregate): Promise<void>;
  upsertTrainingInsight(insight: CohortTrainingInsight): Promise<void>;
}

export class AggregationService {
  constructor(
    private readonly repo: CohortRepository,
    private readonly ports: CodeForgeIntelligencePorts
  ) {}

  /**
   * Recompute all aggregates for a cohort
   */
  async recomputeAll(orgId: string, cohortId: string): Promise<void> {
    await Promise.all([
      this.recomputeCohortSkills(orgId, cohortId),
      this.recomputeCohortRoles(orgId, cohortId),
      this.recomputeTrainingInsights(orgId, cohortId),
    ]);
  }

  /**
   * Recompute skill aggregates
   */
  private async recomputeCohortSkills(orgId: string, cohortId: string): Promise<void> {
    const studentIds = await this.listCohortMemberIds(cohortId);
    if (studentIds.length === 0) return;

    const knownSkills = await this.ports.skillSignal.listKnownSkills(orgId);
    const signals = await this.ports.skillSignal.getSkillSignalsForStudents(orgId, studentIds, knownSkills);

    // Group signals by skill
    const bySkill = new Map<string, typeof signals[0][]>();
    for (const s of signals) {
      if (!bySkill.has(s.skillId)) bySkill.set(s.skillId, []);
      bySkill.get(s.skillId)!.push(s);
    }

    // Compute for each skill
    for (const skillId of knownSkills) {
      const skillSignals = bySkill.get(skillId) || [];
      const individualLevels: CohortMasteryLevel[] = skillSignals.map(s => s.masteryLevel);

      const distribution = DistributionEngine.buildMasteryDistribution(individualLevels);
      const eligibleStudents = studentIds.length;
      const studentsWithEvidence = skillSignals.length;

      const coverage = CoverageEngine.computeCoverage(eligibleStudents, studentsWithEvidence);
      const dominant = DistributionEngine.dominantLevel(distribution, coverage.coverageState);

      // Get previous for trend (would query historical data)
      const trend = { direction: 'STABLE' as const, deltaPct: 0 };

      const aggregate: CohortSkillAggregate = {
        cohortId,
        skillId,
        distribution,
        dominantLevel: dominant || 'NOT_ASSESSED',
        trend: trend.direction,
        coveragePct: coverage.coveragePct,
        coverageState: coverage.coverageState,
        confidence: coverage.coveragePct,
        sourceVersion: Date.now(), // Would be actual version from source
        computedAt: new Date().toISOString(),
      };

      await this.repo.upsertSkillAggregate(aggregate);
    }
  }

  /**
   * Recompute role aggregates
   */
  private async recomputeCohortRoles(orgId: string, cohortId: string): Promise<void> {
    const studentIds = await this.listCohortMemberIds(cohortId);
    if (studentIds.length === 0) return;

    const supportedRoles = await this.ports.roleReadiness.listSupportedRoles(orgId);
    const readiness = await this.ports.roleReadiness.getRoleReadinessForStudents(orgId, studentIds, supportedRoles);

    // Get skill gaps for each role
    const skillGapsMap = new Map<string, string[]>();
    for (const roleId of supportedRoles) {
      // Would get gaps from skill gap port
      skillGapsMap.set(roleId, []);
    }

    // Group by role
    const byRole = new Map<string, typeof readiness[0][]>();
    for (const r of readiness) {
      if (!byRole.has(r.roleId)) byRole.set(r.roleId, []);
      byRole.get(r.roleId)!.push(r);
    }

    for (const roleId of supportedRoles) {
      const roleReadiness = byRole.get(roleId) || [];
      const individualStates: CohortReadinessState[] = roleReadiness.map(r => r.readiness);

      const readinessDistribution = DistributionEngine.buildReadinessDistribution(individualStates);
      const requiredSkillGaps = skillGapsMap.get(roleId) || [];

      // Compute gap priorities
      const gapsWithPriority = requiredSkillGaps.map(skillId => ({
        skillId,
        priority: DistributionEngine.classifyGapPriority({
          roleImportance: 0.8, // Would come from role skill model
          observedProficiencyShare: 0.3, // Would be computed
          placementRelevance: 0.7,
          affectedStudents: studentIds.length,
          coverage: 'MEDIUM' as CoverageState,
        }),
        affectedStudents: studentIds.length,
      }));

      const aggregate: CohortRoleAggregate = {
        cohortId,
        roleId,
        readinessDistribution,
        requiredSkillGaps: gapsWithPriority,
        trend: { direction: 'STABLE', deltaPct: 0 },
        coverage: { eligibleStudents: studentIds.length, studentsWithEvidence: roleReadiness.length },
        computedAt: new Date().toISOString(),
      };

      await this.repo.upsertRoleAggregate(aggregate);
    }
  }

  /**
   * Recompute training insights
   */
  private async recomputeTrainingInsights(orgId: string, cohortId: string): Promise<void> {
    const studentIds = await this.listCohortMemberIds(cohortId);
    if (studentIds.length === 0) return;

    const nextBestActions = await this.ports.nextBestAction.getRecommendedFocusAreas(orgId, studentIds);

    // Get skill aggregates for priority scoring
    // This would query the skill aggregates we just computed
    const priorityInputs = nextBestActions.map(action => ({
      skill: action.skillId,
      gapPriority: 'MODERATE' as GapPriority, // Would be derived from role aggregates
      roleImportance: 0.7,
      trainingImpactPotential: action.trainingImpactPotential,
      coverage: 'MEDIUM' as CoverageState,
    }));

    const ranked = PrioritizationEngine.rankTrainingPriorities(priorityInputs);

    for (const p of ranked) {
      const interventions = PrioritizationEngine.classifyInterventions({
        distribution: { NOT_ASSESSED: 0, EMERGING: 0, DEVELOPING: 0, PROFICIENT: 0, STRONG: 0 },
        interviewVerificationRate: 0.6,
        roleSpecificGap: true,
      });

      const insight: CohortTrainingInsight = {
        cohortId,
        skillId: p.skill,
        label: `Improve ${p.skill}`,
        gapPriority: p.gapPriority,
        interventionCategories: interventions,
        affectedStudents: studentIds.length,
        rationale: p.rationale,
        priorityRank: ranked.indexOf(p) + 1,
        computedAt: new Date().toISOString(),
      };

      await this.repo.upsertTrainingInsight(insight);
    }
  }

  private async listCohortMemberIds(cohortId: string): Promise<string[]> {
    const members = await this.repo.listMembers(cohortId);
    return members.map(member => member.studentId);
  }
}
