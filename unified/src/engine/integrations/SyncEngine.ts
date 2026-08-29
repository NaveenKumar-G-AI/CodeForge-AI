/**
 * Sync Engine - Handles synchronization jobs with PrepVista
 */

import {
  SyncJob,
  SyncJobType,
  SyncScope,
  SyncJobStatus,
  SyncRecord,
  SyncAction,
  SyncRecordStatus,
  SyncResult,
  IntegrationEvent,
  UUID,
  ISO8601,
} from '../../domain/types.js';

export interface SyncRepository {
  getSyncJob(id: string): Promise<SyncJob | null>;
  updateSyncJobStatus(id: string, status: SyncJobStatus, updates?: Partial<SyncJob>): Promise<SyncJob>;
  createSyncRecords(records: Omit<SyncRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SyncRecord[]>;
  getSyncRecords(syncJobId: string): Promise<SyncRecord[]>;
  updateSyncRecord(id: string, updates: Partial<SyncRecord>): Promise<SyncRecord>;
  createIntegrationEvent(event: Omit<IntegrationEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationEvent>;
}

export interface ProfileBuilder {
  buildTechnicalProfile(studentId: string, integrationId: string): Promise<any>;
  filterProfileByScope(profile: any, scope: any): any;
}

export interface PrepVistaClient {
  sendProfile(profile: any): Promise<{ success: boolean; externalId?: string; error?: string }>;
  healthCheck(): Promise<{ status: 'OK' | 'FAIL'; latencyMs: number }>;
}

export class SyncEngine {
  constructor(
    private readonly repo: SyncRepository,
    private readonly profileBuilder: ProfileBuilder,
    private readonly prepVistaClient: PrepVistaClient
  ) {}

  async executeSyncJob(syncJobId: string): Promise<SyncResult> {
    const syncJob = await this.repo.getSyncJob(syncJobId);
    if (!syncJob) {
      throw new Error(`Sync job ${syncJobId} not found`);
    }

    await this.repo.updateSyncJobStatus(syncJobId, 'RUNNING', { startedAt: new Date() });

    const results: SyncResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Get student IDs to sync
      const studentIds = syncJob.studentIds.length > 0
        ? syncJob.studentIds
        : await this.getStudentIdsForScope(syncJob.integrationId, syncJob.scope);

      // Update total students
      await this.repo.updateSyncJobStatus(syncJobId, 'RUNNING', { totalStudents: studentIds.length });

      for (const studentId of studentIds) {
        try {
          const profile = await this.profileBuilder.buildTechnicalProfile(studentId, syncJob.integrationId);
          const filteredProfile = this.profileBuilder.filterProfileByScope(profile, 'STANDARD'); // Default scope

          // Send to PrepVista
          const response = await this.prepVistaClient.sendProfile(filteredProfile);

          // Record sync result
          const record = await this.repo.createSyncRecords([{
            syncJobId,
            studentId,
            resourceType: 'technical_profile',
            resourceId: studentId,
            action: response.success ? 'UPDATED' : 'ERROR',
            status: response.success ? 'SYNCED' : 'FAILED',
            externalId: response.externalId || null,
            error: response.error || null,
            requestPayload: filteredProfile,
            responsePayload: response,
          }]);

          if (response.success) {
            results.processed++;
          } else {
            results.failed++;
            results.errors.push({ studentId, error: response.error || 'Unknown error' });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({ studentId, error: error instanceof Error ? error.message : 'Unknown error' });

          await this.repo.createSyncRecords([{
            syncJobId,
            studentId,
            resourceType: 'technical_profile',
            resourceId: studentId,
            action: 'ERROR',
            status: 'FAILED',
            externalId: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestPayload: null,
            responsePayload: null,
          }]);
        }
      }

      // Update job status
      const finalStatus = results.failed === 0 ? 'COMPLETED' : (results.processed > 0 ? 'PARTIAL' : 'FAILED');
      await this.repo.updateSyncJobStatus(syncJobId, finalStatus, {
        completedAt: new Date(),
        processedStudents: results.processed,
        failedStudents: results.failed,
        errorSummary: results.errors.length > 0 ? results.errors.map(e => e.error).join('; ') : null,
      });

      // Create integration event
      await this.repo.createIntegrationEvent({
        integrationId: syncJob.integrationId,
        eventType: 'SYNC_COMPLETED',
        payload: { syncJobId, results },
        studentId: null,
        idempotencyKey: `sync-${syncJobId}-${Date.now()}`,
        status: 'QUEUED',
        attempts: 0,
        lastAttemptAt: null,
        nextRetryAt: null,
        error: null,
        source: 'SYNC',
      });

      return results;
    } catch (error) {
      await this.repo.updateSyncJobStatus(syncJobId, 'FAILED', {
        completedAt: new Date(),
        errorSummary: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async processPendingSyncJobs(): Promise<void> {
    // This would be called by the worker to process queued jobs
    // Implementation depends on the repository's ability to list pending jobs
  }

  private async getStudentIdsForScope(integrationId: string, scope: SyncScope): Promise<string[]> {
    // This would query the database for students matching the scope
    // For now, return empty array - would be implemented with actual DB queries
    return [];
  }
}
