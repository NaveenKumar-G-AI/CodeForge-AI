/**
 * Integration Service - Main service facade for all integration operations
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
  IntegrationEvent,
  EventStatus,
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

// Repository interfaces
export interface IntegrationRepository {
  createIntegration(input: CreateIntegrationInput): Promise<Integration>;
  getIntegration(id: string): Promise<Integration | null>;
  getIntegrationsByCollege(collegeId: string): Promise<Integration[]>;
  updateIntegration(id: string, input: UpdateIntegrationInput): Promise<Integration>;
  deleteIntegration(id: string): Promise<void>;

  createCredential(integrationId: string, input: CredentialInput): Promise<IntegrationCredential>;
  getCredentials(integrationId: string): Promise<IntegrationCredential[]>;
  getCredential(id: string): Promise<IntegrationCredential | null>;
  rotateCredential(id: string, newValueEncrypted: string): Promise<IntegrationCredential>;
  revokeCredential(id: string): Promise<IntegrationCredential>;

  createOrganizationMapping(integrationId: string, input: OrganizationMappingInput): Promise<OrganizationMapping>;
  getOrganizationMappings(integrationId: string): Promise<OrganizationMapping[]>;
  verifyOrganizationMapping(id: string): Promise<OrganizationMapping>;

  createIdentityMapping(integrationId: string, input: IdentityMappingInput): Promise<IdentityMapping>;
  getIdentityMappings(integrationId: string, filters?: { status?: MappingStatus; studentId?: string }): Promise<IdentityMapping[]>;
  verifyIdentityMapping(id: string): Promise<IdentityMapping>;
  revokeIdentityMapping(id: string, reason: string): Promise<IdentityMapping>;

  createSharingPolicy(integrationId: string, input: SharingPolicyInput): Promise<SharingPolicy>;
  getSharingPolicy(integrationId: string): Promise<SharingPolicy | null>;
  updateSharingPolicy(integrationId: string, input: Partial<SharingPolicyInput>): Promise<SharingPolicy>;

  createSyncJob(input: SyncJobInput): Promise<SyncJob>;
  getSyncJob(id: string): Promise<SyncJob | null>;
  listSyncJobs(integrationId: string, options?: { status?: SyncJobStatus; limit?: number; offset?: number }): Promise<{ jobs: SyncJob[]; total: number }>;
  updateSyncJobStatus(id: string, status: SyncJobStatus, updates?: Partial<SyncJob>): Promise<SyncJob>;

  createSyncRecords(records: Omit<any, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<any[]>;
  getSyncRecords(syncJobId: string): Promise<any[]>;
  updateSyncRecord(id: string, updates: Partial<any>): Promise<any>;

  createIntegrationEvent(event: Omit<IntegrationEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationEvent>;
  getIntegrationEvents(integrationId: string, options?: { status?: EventStatus; limit?: number; offset?: number }): Promise<{ events: IntegrationEvent[]; total: number }>;
  updateEventStatus(id: string, status: EventStatus, error?: string): Promise<IntegrationEvent>;

  recordWebhookDelivery(delivery: Omit<WebhookDelivery, 'id' | 'createdAt'>): Promise<WebhookDelivery>;

  createIntegrationError(error: Omit<IntegrationError, 'id' | 'createdAt'>): Promise<IntegrationError>;
  getIntegrationErrors(integrationId: string, options?: { status?: ErrorStatus; limit?: number }): Promise<IntegrationError[]>;
  resolveError(id: string, resolvedBy: string): Promise<IntegrationError>;

  recordAudit(audit: Omit<IntegrationAudit, 'id' | 'createdAt'>): Promise<IntegrationAudit>;
  getAuditLog(integrationId: string, options?: { limit?: number; offset?: number }): Promise<{ audits: IntegrationAudit[]; total: number }>;
}

// Engine instances (will be injected)
let integrationEngine: any = null;
let syncEngine: any = null;
let eventDeliveryEngine: any = null;
let reconciliationEngine: any = null;
let profileBuilder: any = null;
let encryptionService: any = null;
let cacheService: any = null;

export function initializeIntegrationService(engines: {
  integrationEngine: any;
  syncEngine: any;
  eventDeliveryEngine: any;
  reconciliationEngine: any;
  profileBuilder: any;
  encryptionService: any;
  cacheService: any;
}): void {
  integrationEngine = engines.integrationEngine;
  syncEngine = engines.syncEngine;
  eventDeliveryEngine = engines.eventDeliveryEngine;
  reconciliationEngine = engines.reconciliationEngine;
  profileBuilder = engines.profileBuilder;
  encryptionService = engines.encryptionService;
  cacheService = engines.cacheService;
}

export const integrationService = {
  // Integration CRUD
  async createIntegration(input: CreateIntegrationInput): Promise<Integration> {
    return integrationEngine.createIntegration(input);
  },

  async getIntegration(id: string): Promise<Integration | null> {
    return integrationEngine.getIntegration(id);
  },

  async getIntegrationsByCollege(collegeId: string): Promise<Integration[]> {
    return integrationEngine.getIntegrationsByCollege(collegeId);
  },

  async updateIntegration(id: string, input: UpdateIntegrationInput): Promise<Integration> {
    return integrationEngine.updateIntegration(id, input);
  },

  async deleteIntegration(id: string): Promise<void> {
    return integrationEngine.deleteIntegration(id);
  },

  // Credentials
  async createCredential(integrationId: string, input: CredentialInput): Promise<IntegrationCredential> {
    return integrationEngine.createCredential(integrationId, input);
  },

  async getCredentials(integrationId: string): Promise<IntegrationCredential[]> {
    return integrationEngine.getCredentials(integrationId);
  },

  async rotateCredential(credentialId: string, newValue: string): Promise<IntegrationCredential> {
    return integrationEngine.rotateCredential(credentialId, newValue);
  },

  async revokeCredential(credentialId: string): Promise<IntegrationCredential> {
    return integrationEngine.revokeCredential(credentialId);
  },

  // Organization mappings
  async createOrganizationMapping(integrationId: string, input: OrganizationMappingInput): Promise<OrganizationMapping> {
    return integrationEngine.createOrganizationMapping(integrationId, input);
  },

  async getOrganizationMappings(integrationId: string): Promise<OrganizationMapping[]> {
    return integrationEngine.getOrganizationMappings(integrationId);
  },

  async verifyOrganizationMapping(mappingId: string): Promise<OrganizationMapping> {
    return integrationEngine.verifyOrganizationMapping(mappingId);
  },

  // Identity mappings
  async createIdentityMapping(integrationId: string, input: IdentityMappingInput): Promise<IdentityMapping> {
    return integrationEngine.createIdentityMapping(integrationId, input);
  },

  async getIdentityMappings(integrationId: string, filters?: { status?: MappingStatus; studentId?: string }): Promise<IdentityMapping[]> {
    return integrationEngine.getIdentityMappings(integrationId, filters);
  },

  async verifyIdentityMapping(mappingId: string): Promise<IdentityMapping> {
    return integrationEngine.verifyIdentityMapping(mappingId);
  },

  async revokeIdentityMapping(mappingId: string, reason: string): Promise<IdentityMapping> {
    return integrationEngine.revokeIdentityMapping(mappingId, reason);
  },

  // Sharing policy
  async createSharingPolicy(integrationId: string, input: SharingPolicyInput): Promise<SharingPolicy> {
    return integrationEngine.createSharingPolicy(integrationId, input);
  },

  async getSharingPolicy(integrationId: string): Promise<SharingPolicy | null> {
    return integrationEngine.getSharingPolicy(integrationId);
  },

  async updateSharingPolicy(integrationId: string, input: Partial<SharingPolicyInput>): Promise<SharingPolicy> {
    return integrationEngine.updateSharingPolicy(integrationId, input);
  },

  // Sync jobs
  async createSyncJob(input: SyncJobInput): Promise<SyncJob> {
    return integrationEngine.createSyncJob(input);
  },

  async getSyncJob(id: string): Promise<SyncJob | null> {
    return integrationEngine.getSyncJob(id);
  },

  async listSyncJobs(integrationId: string, options?: { status?: SyncJobStatus; limit?: number; offset?: number }): Promise<{ jobs: SyncJob[]; total: number }> {
    return integrationEngine.listSyncJobs(integrationId, options);
  },

  // Events
  async createIntegrationEvent(event: Omit<IntegrationEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationEvent> {
    return integrationEngine.createIntegrationEvent(event);
  },

  async getIntegrationEvents(integrationId: string, options?: { status?: EventStatus; limit?: number; offset?: number }): Promise<{ events: IntegrationEvent[]; total: number }> {
    return integrationEngine.getIntegrationEvents(integrationId, options);
  },

  async retryEvent(eventId: string): Promise<EventDeliveryResult> {
    return integrationEngine.retryEvent(eventId);
  },

  // Health check
  async getHealth(integrationId: string): Promise<IntegrationHealth> {
    return integrationEngine.getHealth(integrationId);
  },

  // Student profile for PrepVista consumption
  async getStudentProfile(integrationId: string, studentId: string): Promise<TechnicalProfile | null> {
    return integrationEngine.getStudentProfile(integrationId, studentId);
  },

  // Sync execution
  async executeSyncJob(syncJobId: string): Promise<SyncResult> {
    return syncEngine.executeSyncJob(syncJobId);
  },

  async processPendingSyncJobs(): Promise<void> {
    return syncEngine.processPendingSyncJobs();
  },

  // Event delivery
  async deliverEvent(event: IntegrationEvent): Promise<EventDeliveryResult> {
    return eventDeliveryEngine.deliverEvent(event);
  },

  async processPendingEvents(integrationId: string): Promise<void> {
    return eventDeliveryEngine.processPendingEvents(integrationId);
  },

  // Reconciliation
  async triggerReconciliation(integrationId: string): Promise<any> {
    return reconciliationEngine.triggerReconciliation(integrationId);
  },

  async getReconciliationStatus(integrationId: string): Promise<any> {
    return reconciliationEngine.getReconciliationStatus(integrationId);
  },

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
    return integrationEngine.recordAudit(integrationId, action, actorType, actorId, resourceType, resourceId, metadata);
  },

  async getAuditLog(integrationId: string, options?: { limit?: number; offset?: number }): Promise<{ audits: IntegrationAudit[]; total: number }> {
    return integrationEngine.getAuditLog(integrationId, options);
  },

  // Webhook handling
  async handleWebhook(integrationId: string, payload: any, headers: Record<string, string>): Promise<{ success: boolean; eventId?: string; error?: string }> {
    // Verify signature
    const webhookCredential = (await integrationEngine.getCredentials(integrationId))
      .find((c: IntegrationCredential) => c.type === 'WEBHOOK_SECRET');

    if (webhookCredential) {
      const providedSignature = headers['x-signature'];
      if (!providedSignature) {
        return { success: false, error: 'Missing signature' };
      }

      // Verify signature
      const crypto = await import('crypto');
      const hmac = crypto.createHmac('sha256', webhookCredential.valueEncrypted);
      hmac.update(JSON.stringify(payload));
      const expectedSignature = `sha256=${hmac.digest('hex')}`;

      if (providedSignature !== expectedSignature) {
        return { success: false, error: 'Invalid signature' };
      }
    }

    // Check timestamp (5 min window)
    const timestamp = headers['x-timestamp'];
    if (timestamp) {
      const eventTime = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - eventTime) > 300) {
        return { success: false, error: 'Timestamp too old' };
      }
    }

    // Check for replay (idempotency)
    const eventId = headers['x-event-id'];
    if (eventId) {
      const existingEvent = await integrationEngine.getIntegrationEvents(integrationId, { limit: 100 });
      const isReplay = existingEvent.events.some((e: IntegrationEvent) => e.idempotencyKey === eventId);
      if (isReplay) {
        return { success: false, error: 'Duplicate event' };
      }
    }

    // Store event
    const event = await integrationEngine.createIntegrationEvent({
      integrationId,
      eventType: payload.eventType || 'UNKNOWN',
      payload,
      studentId: payload.studentId || null,
      idempotencyKey: eventId || `webhook-${integrationId}-${Date.now()}`,
      status: 'DELIVERED',
      attempts: 0,
      source: 'WEBHOOK',
    });

    return { success: true, eventId: event.id };
  },
};
