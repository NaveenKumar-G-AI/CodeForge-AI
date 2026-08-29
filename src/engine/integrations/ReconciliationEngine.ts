/**
 * Reconciliation Engine - Handles divergence detection and fix between CodeForge and PrepVista
 */

import {
  Integration,
  SyncRecord,
  SyncAction,
  SyncRecordStatus,
  IntegrationEvent,
  UUID,
  ISO8601,
} from '../../domain/types.js';

export interface ReconciliationRepository {
  getIntegration(integrationId: string): Promise<Integration | null>;
  getSyncRecords(integrationId: string, options?: { since?: Date }): Promise<SyncRecord[]>;
  createIntegrationEvent(event: Omit<IntegrationEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationEvent>;
}

export interface PrepVistaClient {
  fetchStudentProfile(externalStudentId: string): Promise<any>;
  fetchOrganizationStudents(externalOrgId: string): Promise<any[]>;
}

export interface ProfileBuilder {
  buildTechnicalProfile(studentId: string, integrationId: string): Promise<any>;
}

export interface ReconciliationResult {
  divergencesFound: number;
  divergencesFixed: number;
  errors: Array<{ studentId: string; error: string }>;
}

export class ReconciliationEngine {
  constructor(
    private readonly repo: ReconciliationRepository,
    private readonly prepVistaClient: PrepVistaClient,
    private readonly profileBuilder: ProfileBuilder
  ) {}

  async triggerReconciliation(integrationId: string): Promise<ReconciliationResult> {
    const integration = await this.repo.getIntegration(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const orgMapping = await this.getOrganizationMapping(integrationId);
    if (!orgMapping) {
      throw new Error('Organization mapping not found');
    }

    const result: ReconciliationResult = {
      divergencesFound: 0,
      divergencesFixed: 0,
      errors: [],
    };

    // Fetch students from PrepVista
    const prepVistaStudents = await this.prepVistaClient.fetchOrganizationStudents(orgMapping.externalOrgId);

    // Get sync records to compare
    const syncRecords = await this.repo.getSyncRecords(integrationId);

    for (const pvStudent of prepVistaStudents) {
      const syncRecord = syncRecords.find(r => r.externalId === pvStudent.id);
      const identityMapping = await this.getIdentityMappingByExternalId(integrationId, pvStudent.id);

      if (!identityMapping) {
        // Student exists in PrepVista but not mapped in CodeForge
        result.divergencesFound++;
        await this.createReconciliationEvent(integrationId, 'UNMAPPED_STUDENT_IN_PREPVISTA', {
          externalStudentId: pvStudent.id,
          externalEmail: pvStudent.email,
        });
        continue;
      }

      if (identityMapping.status !== 'VERIFIED') {
        result.divergencesFound++;
        await this.createReconciliationEvent(integrationId, 'UNVERIFIED_IDENTITY_MAPPING', {
          codeforgeStudentId: identityMapping.codeforgeStudentId,
          externalStudentId: identityMapping.externalStudentId,
        });
        continue;
      }

      // Compare profiles
      const codeforgeProfile = await this.profileBuilder.buildTechnicalProfile(
        identityMapping.codeforgeStudentId,
        integrationId
      );

      const divergence = this.compareProfiles(codeforgeProfile, pvStudent.profile);
      if (divergence.hasDivergence) {
        result.divergencesFound++;
        await this.createReconciliationEvent(integrationId, 'PROFILE_DIVERGENCE', {
          codeforgeStudentId: identityMapping.codeforgeStudentId,
          externalStudentId: pvStudent.id,
          divergence: divergence.details,
        });

        // Attempt auto-fix if configured
        if (divergence.canAutoFix) {
          await this.fixDivergence(integrationId, identityMapping, codeforgeProfile, pvStudent);
          result.divergencesFixed++;
        }
      }
    }

    // Check for students in CodeForge not in PrepVista
    const codeforgeStudents = await this.getCodeForgeStudents(integrationId);
    for (const cfStudent of codeforgeStudents) {
      const hasMapping = await this.getIdentityMappingByCodeForgeId(integrationId, cfStudent.id);
      if (!hasMapping) {
        result.divergencesFound++;
        await this.createReconciliationEvent(integrationId, 'STUDENT_MISSING_IN_PREPVISTA', {
          codeforgeStudentId: cfStudent.id,
        });
      }
    }

    return result;
  }

  async getReconciliationStatus(integrationId: string): Promise<{
    lastReconciliationAt: Date | null;
    lastStatus: 'COMPLETED' | 'FAILED' | 'PARTIAL' | null;
    pendingDivergences: number;
  }> {
    // This would query the latest reconciliation events
    return {
      lastReconciliationAt: null,
      lastStatus: null,
      pendingDivergences: 0,
    };
  }

  private compareProfiles(cfProfile: any, pvProfile: any): { hasDivergence: boolean; canAutoFix: boolean; details: any } {
    // Compare key profile fields
    const details: any = {};

    // Compare skills
    if (JSON.stringify(cfProfile.profile?.skills) !== JSON.stringify(pvProfile?.skills)) {
      details.skills = { codeforge: cfProfile.profile?.skills, prepvista: pvProfile?.skills };
    }

    // Compare assessments
    if (JSON.stringify(cfProfile.profile?.assessments) !== JSON.stringify(pvProfile?.assessments)) {
      details.assessments = { codeforge: cfProfile.profile?.assessments, prepvista: pvProfile?.assessments };
    }

    // Compare readiness
    if (JSON.stringify(cfProfile.profile?.readiness) !== JSON.stringify(pvProfile?.readiness)) {
      details.readiness = { codeforge: cfProfile.profile?.readiness, prepvista: pvProfile?.readiness };
    }

    const hasDivergence = Object.keys(details).length > 0;
    // Can auto-fix if CodeForge is the source of truth and divergence is simple
    const canAutoFix = hasDivergence && true; // Would be configurable

    return { hasDivergence, canAutoFix, details };
  }

  private async fixDivergence(
    integrationId: string,
    identityMapping: any,
    cfProfile: any,
    pvStudent: any
  ): Promise<void> {
    // Send updated profile to PrepVista
    await this.prepVistaClient.fetchStudentProfile(identityMapping.externalStudentId); // Placeholder for update
  }

  private async createReconciliationEvent(
    integrationId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    await this.repo.createIntegrationEvent({
      integrationId,
      eventType,
      payload,
      studentId: null,
      idempotencyKey: `reconcile-${integrationId}-${eventType}-${Date.now()}`,
      status: 'QUEUED',
      attempts: 0,
      lastAttemptAt: null,
      nextRetryAt: null,
      error: null,
      source: 'SCHEDULED',
    });
  }

  private async getOrganizationMapping(integrationId: string): Promise<{ externalOrgId: string } | null> {
    // Would query the organization mapping
    return { externalOrgId: 'external-org-id' };
  }

  private async getIdentityMappingByExternalId(integrationId: string, externalStudentId: string): Promise<any> {
    // Would query identity mappings
    return null;
  }

  private async getIdentityMappingByCodeForgeId(integrationId: string, codeforgeStudentId: string): Promise<any> {
    // Would query identity mappings
    return null;
  }

  private async getCodeForgeStudents(integrationId: string): Promise<Array<{ id: string }>> {
    // Would query students in the college
    return [];
  }
}
