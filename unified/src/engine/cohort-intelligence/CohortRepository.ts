/**
 * Cohort Repository - Feature 36
 * Port interfaces for data persistence and external integrations
 */

import {
  Cohort,
  Membership,
  CohortSkillAggregate,
  CohortRoleAggregate,
  CohortTrainingInsight,
  CohortSnapshotRecord,
  CohortKind,
  CohortDimension,
  StudentSkillSignal,
  StudentRoleReadiness,
  StudentGrowthSample,
  RecommendedAction,
  CohortMasteryLevel,
  CohortReadinessState,
  SkillCoverageState,
  GapPriority,
  InterventionCategory,
  FreshnessState,
} from '../../domain/types.js';

export interface CohortRepository {
  // Cohort CRUD
  createCohort(input: {
    organizationId: string;
    name: string;
    kind: CohortKind;
    dimension: CohortDimension;
    parentCohortId?: string;
    attributes?: Record<string, string>;
  }): Promise<Cohort>;

  getCohort(id: string): Promise<Cohort | null>;
  listCohorts(orgId: string): Promise<Cohort[]>;
  updateCohort(id: string, updates: Partial<Cohort>): Promise<Cohort>;
  deleteCohort(id: string): Promise<void>;

  // Membership
  addMember(cohortId: string, studentId: string): Promise<Membership>;
  removeMember(cohortId: string, studentId: string): Promise<void>;
  listMembers(cohortId: string): Promise<Membership[]>;
  getMember(cohortId: string, studentId: string): Promise<Membership | null>;
  listCohortIdsForStudent(studentId: string): Promise<string[]>;

  // Skill Aggregates
  upsertSkillAggregate(agg: CohortSkillAggregate): Promise<void>;
  getSkillAggregates(cohortId: string): Promise<CohortSkillAggregate[]>;

  // Role Aggregates
  upsertRoleAggregate(agg: CohortRoleAggregate): Promise<void>;
  getRoleAggregates(cohortId: string): Promise<CohortRoleAggregate[]>;

  // Training Insights
  upsertTrainingInsight(insight: CohortTrainingInsight): Promise<void>;
  getTrainingInsights(cohortId: string): Promise<CohortTrainingInsight[]>;

  // Snapshots
  createSnapshot(snapshot: CohortSnapshotRecord): Promise<void>;
  listSnapshots(cohortId: string): Promise<CohortSnapshotRecord[]>;

  // Utility
  getCohortSize(cohortId: string): Promise<number>;
  getPrivacyPolicy(orgId: string): Promise<{ minCohortSize: number; minCoverageForClaim: number }>;
}

// ============================================================================
// Integration Ports (for existing CodeForge systems)
// Feature 36 NEVER computes mastery/readiness/growth - only consumes
// ============================================================================

export interface SkillSignalPort {
  listKnownSkills(organizationId: string): Promise<string[]>;
  getSkillSignalsForStudents(
    organizationId: string,
    studentIds: string[],
    skillIds: string[]
  ): Promise<StudentSkillSignal[]>;
}

export interface RoleReadinessPort {
  listSupportedRoles(organizationId: string): Promise<string[]>;
  getRoleReadinessForStudents(
    organizationId: string,
    studentIds: string[],
    roleIds: string[]
  ): Promise<StudentRoleReadiness[]>;
}

export interface GrowthTrackingPort {
  getGrowthSamples(
    organizationId: string,
    studentIds: string[],
    skillId: string,
    periodLabels: string[]
  ): Promise<StudentGrowthSample[]>;
}

export interface NextBestActionPort {
  getRecommendedFocusAreas(
    organizationId: string,
    studentIds: string[]
  ): Promise<RecommendedAction[]>;
}

export interface CodeForgeIntelligencePorts {
  skillSignal: SkillSignalPort;
  roleReadiness: RoleReadinessPort;
  growthTracking: GrowthTrackingPort;
  nextBestAction: NextBestActionPort;
}
