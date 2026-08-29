/**
 * Event Handlers - Feature 36
 * Handles intelligence events and triggers aggregation
 */

import { IntelligenceEventType } from '../../domain/types.js';

export interface CohortRepository {
  listCohortIdsForStudent(studentId: string): Promise<string[]>;
}

export interface AggregationService {
  recomputeAll(orgId: string, cohortId: string): Promise<void>;
}

export interface Queue {
  enqueue(cohortId: string): Promise<void>;
}

export class EventHandlers {
  constructor(
    private readonly repo: CohortRepository,
    private readonly aggregation: AggregationService,
    private readonly queue: Queue
  ) {}

  /**
   * Ingest intelligence event and enqueue aggregation
   */
  async ingestIntelligenceEvent(event: {
    sourceEventId: string;
    type: IntelligenceEventType;
    studentId: string;
    orgId: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    // Find affected cohorts for this student
    const cohortIds = await this.repo.listCohortIdsForStudent(event.studentId);

    // Enqueue aggregation for each affected cohort
    for (const cohortId of cohortIds) {
      await this.queue.enqueue(cohortId);
    }
  }

  /**
   * Process aggregation queue (worker)
   */
  async registerAggregationWorker(): Promise<void> {
    // This would be called by a background worker
    // Implementation depends on queue type
  }
}