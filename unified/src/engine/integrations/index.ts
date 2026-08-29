/**
 * PrepVista Integration Engine
 * Feature 33&37 - Complete PrepVista Integration API
 *
 * This module handles all PrepVista integration functionality including:
 * - Integration management (create, update, connect, disconnect)
 * - Credential management (encrypted storage, rotation, revocation)
 * - Organization mapping (CodeForge college ↔ PrepVista org)
 * - Identity mapping (Student ↔ PrepVista student)
 * - Sharing policy (scopes, opt-in, retention)
 * - Sync jobs (INITIAL, INCREMENTAL, FULL_RESYNC, SINGLE_STUDENT, RECONCILIATION)
 * - Event delivery (webhooks, retry logic)
 * - Reconciliation (divergence detection/fix)
 * - Audit logging
 * - Health checks
 * - Webhook reception from PrepVista
 * - Student profile sharing API
 */

// Re-export all types
export * from '../../domain/types.js';

// Core engine classes (to be implemented)
export { IntegrationEngine } from './IntegrationEngine.js';
export { SyncEngine } from './SyncEngine.js';
export { EventDeliveryEngine } from './EventDeliveryEngine.js';
export { ReconciliationEngine } from './ReconciliationEngine.js';
export { ProfileBuilder } from './ProfileBuilder.js';
export { EncryptionService } from './EncryptionService.js';
export { CacheService } from './CacheService.js';

// Worker functions
export {
  startSyncWorker,
  stopSyncWorker,
  startEventDeliveryWorker,
  stopEventDeliveryWorker,
  stopWorkers,
  getWorkerStatus,
  processAllPendingEvents,
  processAllPendingSyncJobs,
} from './workers/index.js';

// Service instance
export { integrationService } from './IntegrationService.js';
