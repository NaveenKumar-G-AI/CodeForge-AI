/**
 * Integration Engine - Core integration management
 * Handles CRUD operations for integrations, credentials, mappings, and policies
 */

import {
  Integration,
  IntegrationConfig,
  IntegrationStatus,
  IntegrationCredential,
  CredentialType,
  CredentialStatus,
  OrganizationMapping,
  MappingStatus,
  IdentityMapping,
  IdentityMappingMethod,
  SharingPolicy,
  SharingScope,
  SyncJob,
  SyncJobType,
  SyncScope,
  SyncJobStatus,
  SyncRecord,
  SyncAction,
  SyncRecordStatus,
  IntegrationEvent,
  EventStatus,
  EventSource,
  WebhookDelivery,
  IntegrationError,
  IntegrationErrorCategory,
  ErrorSeverity,
  ErrorStatus,
  IntegrationAudit,
  AuditActorType,
  TechnicalProfile,
  IntegrationHealth,
  CreateIntegrationInput,
  UpdateIntegrationInput,
  CredentialInput,
  OrganizationMappingInput,
  IdentityMappingInput,
  SharingPolicyInput,
  SyncJobInput,
  EventDeliveryResult,
  SyncResult,
  UUID,
  ISO8601,
} from '../../domain/types.js';

export interface IntegrationRepository {
  // Integration CRUD
  createIntegration(input: CreateIntegrationInput): Promise<Integration>;
  getIntegration(id: string): Promise<Integration | null>;
  getIntegrationsByCollege(collegeId: string): Promise<Integration[]>;
  updateIntegration(id: string, input: UpdateIntegrationInput): Promise<Integration>;
  deleteIntegration(id: string): Promise<void>;

  // Credentials
  createCredential(integrationId: string, input: CredentialInput): Promise<IntegrationCredential>;
  getCredentials(integrationId: string): Promise<IntegrationCredential[]>;
  getCredential(id: string): Promise<IntegrationCredential | null>;
  rotateCredential(id: string, newValue: string): Promise<IntegrationCredential>;
  revokeCredential(id: string): Promise<IntegrationCredential>;

  // Organization mappings
  createOrganizationMapping(integrationId: string, input: OrganizationMappingInput): Promise<OrganizationMapping>;
  getOrganizationMappings(integrationId: string): Promise<OrganizationMapping[]>;
  verifyOrganizationMapping(id: string): Promise<OrganizationMapping>;

  // Identity mappings
  createIdentityMapping(integrationId: string, input: IdentityMappingInput): Promise<IdentityMapping>;
  getIdentityMappings(integrationId: string, filters?: { status?: MappingStatus; studentId?: string }): Promise<IdentityMapping[]>;
  verifyIdentityMapping(id: string): Promise<IdentityMapping>;
  revokeIdentityMapping(id: string, reason: string): Promise<IdentityMapping>;

  // Sharing policy
  createSharingPolicy(integrationId: string, input: SharingPolicyInput): Promise<SharingPolicy>;
  getSharingPolicy(integrationId: string): Promise<SharingPolicy | null>;
  updateSharingPolicy(integrationId: string, input: Partial<SharingPolicyInput>): Promise<SharingPolicy>;

  // Sync jobs
  createSyncJob(input: SyncJobInput): Promise<SyncJob>;
  getSyncJob(id: string): Promise<SyncJob | null>;
  listSyncJobs(integrationId: string, options?: { status?: SyncJobStatus; limit?: number; offset?: number }): Promise<{ jobs: SyncJob[]; total: number }>;
  updateSyncJobStatus(id: string, status: SyncJobStatus, updates?: Partial<SyncJob>): Promise<SyncJob>;

  // Sync records
  createSyncRecords(records: Omit<SyncRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SyncRecord[]>;
  getSyncRecords(syncJobId: string): Promise<SyncRecord[]>;
  updateSyncRecord(id: string, updates: Partial<SyncRecord>): Promise<SyncRecord>;

  // Events
  createIntegrationEvent(event: Omit<IntegrationEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationEvent>;
  getIntegrationEvents(integrationId: string, options?: { status?: EventStatus; limit?: number; offset?: number }): Promise<{ events: IntegrationEvent[]; total: number }>;
  updateEventStatus(id: string, status: EventStatus, error?: string): Promise<IntegrationEvent>;

  // Webhook deliveries
  recordWebhookDelivery(delivery: Omit<WebhookDelivery, 'id' | 'createdAt'>): Promise<WebhookDelivery>;

  // Errors
  createIntegrationError(error: Omit<IntegrationError, 'id' | 'createdAt'>): Promise<IntegrationError>;
  getIntegrationErrors(integrationId: string, options?: { status?: ErrorStatus; limit?: number }): Promise<IntegrationError[]>;
  resolveError(id: string, resolvedBy: string): Promise<IntegrationError>;

  // Audit
  recordAudit(audit: Omit<IntegrationAudit, 'id' | 'createdAt'>): Promise<IntegrationAudit>;
  getAuditLog(integrationId: string, options?: { limit?: number; offset?: number }): Promise<{ audits: IntegrationAudit[]; total: number }>;
}

export interface EncryptionService {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

export interface ProfileBuilder {
  buildTechnicalProfile(studentId: string, integrationId: string): Promise<TechnicalProfile>;
  filterProfileByScope(profile: TechnicalProfile, scope: SharingScope): TechnicalProfile;
}

export interface EventDeliveryEngine {
  deliverEvent(event: IntegrationEvent): Promise<EventDeliveryResult>;
  retryDeadLetter(eventId: string): Promise<EventDeliveryResult>;
  processPendingEvents(integrationId: string): Promise<void>;
}

export interface SyncEngine {
  executeSyncJob(syncJobId: string): Promise<SyncResult>;
  processPendingSyncJobs(): Promise<void>;
}

export class IntegrationEngine {
  constructor(
    private readonly repo: IntegrationRepository,
    private readonly encryption: EncryptionService,
    private readonly cache: CacheService,
    private readonly profileBuilder: ProfileBuilder,
    private readonly eventDelivery: EventDeliveryEngine,
    private readonly syncEngine: SyncEngine
  ) {}

  // Integration CRUD
  async createIntegration(input: CreateIntegrationInput): Promise<Integration> {
    return this.repo.createIntegration(input);
  }

  async getIntegration(id: string): Promise<Integration | null> {
    return this.repo.getIntegration(id);
  }

  async getIntegrationsByCollege(collegeId: string): Promise<Integration[]> {
    return this.repo.getIntegrationsByCollege(collegeId);
  }

  async updateIntegration(id: string, input: UpdateIntegrationInput): Promise<Integration> {
    return this.repo.updateIntegration(id, input);
  }

  async deleteIntegration(id: string): Promise<void> {
    return this.repo.deleteIntegration(id);
  }

  // Credentials
  async createCredential(integrationId: string, input: CredentialInput): Promise<IntegrationCredential> {
    const encryptedValue = await this.encryption.encrypt(input.value);
    return this.repo.createCredential(integrationId, {
      ...input,
      value: encryptedValue, // This will be stored as valueEncrypted
    } as any);
  }

  async getCredentials(integrationId: string): Promise<IntegrationCredential[]> {
    return this.repo.getCredentials(integrationId);
  }

  async rotateCredential(credentialId: string, newValue: string): Promise<IntegrationCredential> {
    const encryptedValue = await this.encryption.encrypt(newValue);
    return this.repo.rotateCredential(credentialId, encryptedValue);
  }

  async revokeCredential(credentialId: string): Promise<IntegrationCredential> {
    return this.repo.revokeCredential(credentialId);
  }

  // Organization mappings
  async createOrganizationMapping(integrationId: string, input: OrganizationMappingInput): Promise<OrganizationMapping> {
    return this.repo.createOrganizationMapping(integrationId, input);
  }

  async getOrganizationMappings(integrationId: string): Promise<OrganizationMapping[]> {
    return this.repo.getOrganizationMappings(integrationId);
  }

  async verifyOrganizationMapping(mappingId: string): Promise<OrganizationMapping> {
    return this.repo.verifyOrganizationMapping(mappingId);
  }

  // Identity mappings
  async createIdentityMapping(integrationId: string, input: IdentityMappingInput): Promise<IdentityMapping> {
    return this.repo.createIdentityMapping(integrationId, input);
  }

  async getIdentityMappings(integrationId: string, filters?: { status?: MappingStatus; studentId?: string }): Promise<IdentityMapping[]> {
    return this.repo.getIdentityMappings(integrationId, filters);
  }

  async verifyIdentityMapping(mappingId: string): Promise<IdentityMapping> {
    return this.repo.verifyIdentityMapping(mappingId);
  }

  async revokeIdentityMapping(mappingId: string, reason: string): Promise<IdentityMapping> {
    return this.repo.revokeIdentityMapping(mappingId, reason);
  }

  // Sharing policy
  async createSharingPolicy(integrationId: string, input: SharingPolicyInput): Promise<SharingPolicy> {
    return this.repo.createSharingPolicy(integrationId, input);
  }

  async getSharingPolicy(integrationId: string): Promise<SharingPolicy | null> {
    return this.repo.getSharingPolicy(integrationId);
  }

  async updateSharingPolicy(integrationId: string, input: Partial<SharingPolicyInput>): Promise<SharingPolicy> {
    return this.repo.updateSharingPolicy(integrationId, input);
  }

  // Sync jobs
  async createSyncJob(input: SyncJobInput): Promise<SyncJob> {
    return this.repo.createSyncJob(input);
  }

  async getSyncJob(id: string): Promise<SyncJob | null> {
    return this.repo.getSyncJob(id);
  }

  async listSyncJobs(integrationId: string, options?: { status?: SyncJobStatus; limit?: number; offset?: number }): Promise<{ jobs: SyncJob[]; total: number }> {
    return this.repo.listSyncJobs(integrationId, options);
  }

  // Events
  async createIntegrationEvent(event: Omit<IntegrationEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationEvent> {
    return this.repo.createIntegrationEvent(event);
  }

  async getIntegrationEvents(integrationId: string, options?: { status?: EventStatus; limit?: number; offset?: number }): Promise<{ events: IntegrationEvent[]; total: number }> {
    return this.repo.getIntegrationEvents(integrationId, options);
  }

  async retryEvent(eventId: string): Promise<EventDeliveryResult> {
    return this.eventDelivery.retryDeadLetter(eventId);
  }

  // Health check
  async getHealth(integrationId: string): Promise<IntegrationHealth> {
    // This would check connection, identity mappings, sync, events, credentials
    const integration = await this.repo.getIntegration(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    // Implementation would check various health indicators
    return {
      integrationId,
      overall: 'HEALTHY',
      connection: { status: 'OK', latencyMs: 100, lastChecked: new Date(), error: null },
      identityMapping: { total: 0, verified: 0, pending: 0, failed: 0 },
      sync: { lastSyncAt: null, lastSyncStatus: null, pendingJobs: 0, failedJobsLast24h: 0 },
      eventDelivery: { queued: 0, failed: 0, deadLetter: 0, avgDeliveryMs: null },
      credentials: { active: 0, expiringSoon: 0, expired: 0 },
    };
  }

  // Student profile for PrepVista consumption
  async getStudentProfile(integrationId: string, studentId: string): Promise<TechnicalProfile | null> {
    const integration = await this.repo.getIntegration(integrationId);
    if (!integration || integration.status !== 'ACTIVE') {
      return null;
    }

    const identityMappings = await this.repo.getIdentityMappings(integrationId, { studentId });
    const mapping = identityMappings.find(m => m.codeforgeStudentId === studentId && m.status === 'VERIFIED');
    if (!mapping) {
      return null;
    }

    const sharingPolicy = await this.repo.getSharingPolicy(integrationId);
    if (!sharingPolicy) {
      return null;
    }

    const profile = await this.profileBuilder.buildTechnicalProfile(studentId, integrationId);
    return this.profileBuilder.filterProfileByScope(profile, sharingPolicy.defaultScope);
  }

  // Audit
  async recordAudit(
    integrationId: string,
    action: string,
    actorType: AuditActorType,
    actorId: string | null,
    resourceType: string,
    resourceId: string | null,
    metadata: Record<string, unknown> | null
  ): Promise<IntegrationAudit> {
    return this.repo.recordAudit({
      integrationId,
      action,
      actorType,
      actorId,
      resourceType,
      resourceId,
      metadata,
    });
  }

  async getAuditLog(integrationId: string, options?: { limit?: number; offset?: number }): Promise<{ audits: IntegrationAudit[]; total: number }> {
    return this.repo.getAuditLog(integrationId, options);
  }
}
