/**
 * Snapshot Service - Feature 36
 * Captures historical cohort snapshots
 */

import { CohortSnapshotRecord } from '../../domain/types.js';

export interface CohortRepository {
  createSnapshot(snapshot: CohortSnapshotRecord): Promise<void>;
  listSnapshots(cohortId: string): Promise<CohortSnapshotRecord[]>;
}

export class SnapshotService {
  constructor(private readonly repo: CohortRepository) {}

  /**
   * Capture cohort snapshot
   */
  async captureSnapshot(
    cohortId: string,
    periodLabel: string,
    periodStart: string,
    periodEnd: string,
    payload: Record<string, unknown>,
    scoringMethodologyVersion: string
  ): Promise<CohortSnapshotRecord> {
    const snapshot: CohortSnapshotRecord = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      cohortId,
      periodLabel,
      periodStart,
      periodEnd,
      payload,
      scoringMethodologyVersion,
      createdAt: new Date().toISOString(),
    };

    await this.repo.createSnapshot(snapshot);
    return snapshot;
  }

  /**
   * List snapshots for a cohort
   */
  async listSnapshots(cohortId: string): Promise<CohortSnapshotRecord[]> {
    return this.repo.listSnapshots(cohortId);
  }
}