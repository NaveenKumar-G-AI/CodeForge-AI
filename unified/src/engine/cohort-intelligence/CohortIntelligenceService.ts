/**
 * Cohort Intelligence Service - Feature 36
 * Main service facade for all cohort intelligence operations
 */

import {
  Cohort,
  Membership,
  CohortExecutiveOverview,
  CohortSkillAggregate,
  CohortRoleAggregate,
  CohortTrainingInsight,
  CohortSnapshotRecord,
  CohortKind,
  CohortDimension,
  CodeForgeIntelligencePorts,
  CoverageResult,
  GapPriority,
  InterventionCategory,
  CohortMasteryLevel,
  CohortReadinessState,
  SkillCoverageState,
  TrendDirection,
  FreshnessState,
  IntelligenceEventType,
} from '../../domain/types.js';
import { CohortRepository } from './CohortRepository.js';
import { AggregationService } from './AggregationService.js';
import { DashboardService } from './DashboardService.js';
import { ComparisonService } from './ComparisonService.js';
import { CohortService } from './CohortService.js';
import { SnapshotService } from './SnapshotService.js';
import { ExportService } from './ExportService.js';
import { EventHandlers } from './EventHandlers.js';
import { AiInsightService } from './AiInsightService.js';
import { createQueue, Queue } from './Queue.js';

// Dependencies (will be injected)
let cohortService: CohortService | null = null;
let aggregationService: AggregationService | null = null;
let dashboardService: DashboardService | null = null;
let comparisonService: ComparisonService | null = null;
let snapshotService: SnapshotService | null = null;
let exportService: ExportService | null = null;
let eventHandlers: EventHandlers | null = null;
let aiInsightService: AiInsightService | null = null;
let queue: Queue | null = null;

export function initializeCohortIntelligenceService(deps: {
  repo: CohortRepository;
  ports: CodeForgeIntelligencePorts;
  aiProvider?: { generate(prompt: string): Promise<string> } | null;
}): void {
  cohortService = new CohortService(deps.repo);
  aggregationService = new AggregationService(deps.repo, deps.ports);
  dashboardService = new DashboardService(deps.repo, deps.ports);
  comparisonService = new ComparisonService(deps.repo, dashboardService);
  snapshotService = new SnapshotService(deps.repo);
  exportService = new ExportService(deps.repo);
  eventHandlers = new EventHandlers(deps.repo, aggregationService, createQueue());
  aiInsightService = new AiInsightService(deps.aiProvider || null);
  queue = createQueue();
}

export const cohortIntelligenceService = {
  // Cohort CRUD
  async createCohort(input: {
    organizationId: string;
    name: string;
    kind: CohortKind;
    dimension: CohortDimension;
    parentCohortId?: string;
    attributes?: Record<string, string>;
  }): Promise<Cohort> {
    if (!cohortService) throw new Error('Cohort intelligence service not initialized');
    return cohortService.createCohort(input);
  },

  async getCohort(id: string, orgId: string): Promise<Cohort | null> {
    if (!cohortService) throw new Error('Cohort intelligence service not initialized');
    return cohortService.getCohort(id, orgId);
  },

  async listCohorts(orgId: string): Promise<Cohort[]> {
    if (!cohortService) throw new Error('Cohort intelligence service not initialized');
    return cohortService.listCohorts(orgId);
  },

  // Membership
  async addMember(cohortId: string, studentId: string, orgId: string): Promise<Membership> {
    if (!cohortService) throw new Error('Cohort intelligence service not initialized');
    return cohortService.addMember(cohortId, studentId, orgId);
  },

  async removeMember(cohortId: string, studentId: string, orgId: string): Promise<void> {
    if (!cohortService) throw new Error('Cohort intelligence service not initialized');
    return cohortService.removeMember(cohortId, studentId, orgId);
  },

  async listMembers(cohortId: string, orgId: string): Promise<Membership[]> {
    if (!cohortService) throw new Error('Cohort intelligence service not initialized');
    return cohortService.listMembers(cohortId, orgId);
  },

  // Aggregation
  async recomputeAll(orgId: string, cohortId: string): Promise<void> {
    if (!aggregationService) throw new Error('Cohort intelligence service not initialized');
    return aggregationService.recomputeAll(orgId, cohortId);
  },

  // Dashboards
  async getCohortExecutiveOverview(orgId: string, cohortId: string): Promise<CohortExecutiveOverview> {
    if (!dashboardService) throw new Error('Cohort intelligence service not initialized');
    return dashboardService.getCohortExecutiveOverview(orgId, cohortId);
  },

  async getCohortExecutiveOverviewWithNarrative(orgId: string, cohortId: string): Promise<{
    overview: CohortExecutiveOverview;
    narrative: string | null;
  }> {
    if (!dashboardService || !aiInsightService) throw new Error('Cohort intelligence service not initialized');
    const overview = await dashboardService.getCohortExecutiveOverview(orgId, cohortId);
    const narrative = await aiInsightService.generateExecutiveNarrative(overview);
    return { overview, narrative };
  },

  async getTpoDashboard(orgId: string): Promise<any> {
    if (!dashboardService) throw new Error('Cohort intelligence service not initialized');
    return dashboardService.getTpoDashboard(orgId);
  },

  async getTrainerDashboard(orgId: string, trainerId: string): Promise<any> {
    if (!dashboardService) throw new Error('Cohort intelligence service not initialized');
    return dashboardService.getTrainerDashboard(orgId, trainerId);
  },

  async getAdminDashboard(orgId: string): Promise<any> {
    if (!dashboardService) throw new Error('Cohort intelligence service not initialized');
    return dashboardService.getAdminDashboard(orgId);
  },

  // Comparison
  async compareCohorts(orgId: string, cohortIdA: string, cohortIdB: string): Promise<{
    comparable: boolean;
    reasons: string[];
    overviewA?: CohortExecutiveOverview;
    overviewB?: CohortExecutiveOverview;
  }> {
    if (!comparisonService) throw new Error('Cohort intelligence service not initialized');
    return comparisonService.compareCohorts(orgId, cohortIdA, cohortIdB);
  },

  // Snapshots
  async captureSnapshot(
    cohortId: string,
    periodLabel: string,
    periodStart: string,
    periodEnd: string,
    payload: Record<string, unknown>,
    scoringMethodologyVersion: string
  ): Promise<CohortSnapshotRecord> {
    if (!snapshotService) throw new Error('Cohort intelligence service not initialized');
    return snapshotService.captureSnapshot(cohortId, periodLabel, periodStart, periodEnd, payload, scoringMethodologyVersion);
  },

  async listSnapshots(cohortId: string): Promise<CohortSnapshotRecord[]> {
    if (!snapshotService) throw new Error('Cohort intelligence service not initialized');
    return snapshotService.listSnapshots(cohortId);
  },

  // Export
  async exportCohortReport(cohortId: string, format: 'json' | 'csv'): Promise<string> {
    if (!exportService) throw new Error('Cohort intelligence service not initialized');
    return exportService.exportCohortReport(cohortId, format);
  },

  // Events
  async ingestIntelligenceEvent(event: {
    sourceEventId: string;
    type: string;
    studentId: string;
    orgId: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    if (!eventHandlers) throw new Error('Cohort intelligence service not initialized');
    return eventHandlers.ingestIntelligenceEvent({
      ...event,
      type: event.type as IntelligenceEventType,
    });
  },
};
