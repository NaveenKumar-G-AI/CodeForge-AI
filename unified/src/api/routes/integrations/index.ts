/**
 * Integration API Routes - Feature 33&37
 * Complete PrepVista Integration API
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  Integration,
  IntegrationConfig,
  IntegrationStatus,
  IntegrationCredential,
  OrganizationMapping,
  IdentityMapping,
  SharingPolicy,
  SyncJob,
  SyncJobType,
  SyncScope,
  SyncJobStatus,
  IntegrationEvent,
  EventStatus,
  WebhookDelivery,
  IntegrationError,
  IntegrationAudit,
  TechnicalProfile,
  IntegrationHealth,
  CreateIntegrationInput,
  UpdateIntegrationInput,
  CredentialInput,
  OrganizationMappingInput,
  IdentityMappingInput,
  SharingPolicyInput,
  SyncJobInput,
  UUID,
  ISO8601,
} from '../../../domain/types.js';
import { integrationService } from '../../../engine/integrations/IntegrationService.js';

const router = Router();

// Validation schemas
const createIntegrationSchema = z.object({
  collegeId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.literal('PREPVISTA'),
  externalId: z.string().optional(),
  config: z.object({
    webhookUrl: z.string().url(),
    apiBaseUrl: z.string().url().optional(),
    apiVersion: z.string().optional(),
    timeoutMs: z.number().int().positive().optional(),
    retryPolicy: z.object({
      maxRetries: z.number().int().positive(),
      baseDelayMs: z.number().int().positive(),
      maxDelayMs: z.number().int().positive(),
      backoffMultiplier: z.number().positive(),
    }).optional(),
  }),
});

const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  externalId: z.string().nullable().optional(),
  config: z.object({
    webhookUrl: z.string().url().optional(),
    apiBaseUrl: z.string().url().optional(),
    apiVersion: z.string().optional(),
    timeoutMs: z.number().int().positive().optional(),
    retryPolicy: z.object({
      maxRetries: z.number().int().positive(),
      baseDelayMs: z.number().int().positive(),
      maxDelayMs: z.number().int().positive(),
      backoffMultiplier: z.number().positive(),
    }).optional(),
  }).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'DEGRADED', 'ERROR', 'DISCONNECTED', 'ARCHIVED']).optional(),
});

const credentialSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['API_KEY', 'WEBHOOK_SECRET', 'OAUTH_TOKEN', 'OAUTH_REFRESH_TOKEN', 'CLIENT_SECRET', 'CERTIFICATE', 'JWT_SIGNING_KEY', 'SHARED_SECRET']),
  value: z.string().min(1),
  expiresAt: z.string().datetime().nullable().optional(),
});

const organizationMappingSchema = z.object({
  codeforgeCollegeId: z.string().uuid(),
  externalOrgId: z.string().min(1),
  externalOrgName: z.string().optional(),
});

const identityMappingSchema = z.object({
  codeforgeStudentId: z.string().uuid(),
  externalStudentId: z.string().min(1),
  externalEmail: z.string().email().optional(),
  method: z.enum(['EXTERNAL_ID', 'VERIFIED_EMAIL', 'MANUAL', 'OAUTH_LINK', 'BULK_IMPORT']),
});

const sharingPolicySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  scopes: z.array(z.enum(['MINIMAL', 'STANDARD', 'DETAILED', 'FULL'])).min(1),
  defaultScope: z.enum(['MINIMAL', 'STANDARD', 'DETAILED', 'FULL']),
  studentOptIn: z.boolean(),
  autoApprove: z.boolean(),
  retentionDays: z.number().int().positive(),
});

const syncJobSchema = z.object({
  integrationId: z.string().uuid(),
  type: z.enum(['INITIAL', 'INCREMENTAL', 'FULL_RESYNC', 'SINGLE_STUDENT', 'RECONCILIATION']),
  scope: z.enum(['ALL_STUDENTS', 'ACTIVE_STUDENTS', 'SELECTED_STUDENTS', 'NEW_STUDENTS_ONLY', 'CHANGED_STUDENTS_ONLY']),
  studentIds: z.array(z.string().uuid()).optional(),
  triggeredBy: z.string().min(1),
  idempotencyKey: z.string().optional(),
});

// Middleware for validation
const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
  }
  req.body = result.data;
  next();
};

// ============================================================================
// Core Integration Endpoints
// ============================================================================

// POST /api/integrations - Create integration
router.post('/', validate(createIntegrationSchema), async (req: Request, res: Response) => {
  try {
    const integration = await integrationService.createIntegration(req.body);
    res.status(201).json(integration);
  } catch (error) {
    console.error('Error creating integration:', error);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

// GET /api/integrations - List integrations
router.get('/', async (req: Request, res: Response) => {
  try {
    const { collegeId } = req.query;
    if (!collegeId) {
      return res.status(400).json({ error: 'collegeId query parameter required' });
    }
    const integrations = await integrationService.getIntegrationsByCollege(collegeId as string);
    res.json(integrations);
  } catch (error) {
    console.error('Error listing integrations:', error);
    res.status(500).json({ error: 'Failed to list integrations' });
  }
});

// GET /api/integrations/:id - Get integration details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const integration = await integrationService.getIntegration(req.params.id);
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    res.json(integration);
  } catch (error) {
    console.error('Error getting integration:', error);
    res.status(500).json({ error: 'Failed to get integration' });
  }
});

// PUT /api/integrations/:id - Update integration
router.put('/:id', validate(updateIntegrationSchema), async (req: Request, res: Response) => {
  try {
    const integration = await integrationService.updateIntegration(req.params.id, req.body);
    res.json(integration);
  } catch (error) {
    console.error('Error updating integration:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

// POST /api/integrations/:id/connect - Connect integration
router.post('/:id/connect', async (req: Request, res: Response) => {
  try {
    const integration = await integrationService.updateIntegration(req.params.id, { status: 'ACTIVE' });
    await integrationService.recordAudit(
      req.params.id,
      'CONNECT',
      'USER',
      req.headers['x-user-id'] as string || null,
      'integration',
      req.params.id,
      null
    );
    res.json(integration);
  } catch (error) {
    console.error('Error connecting integration:', error);
    res.status(500).json({ error: 'Failed to connect integration' });
  }
});

// POST /api/integrations/:id/disconnect - Disconnect integration
router.post('/:id/disconnect', async (req: Request, res: Response) => {
  try {
    const integration = await integrationService.updateIntegration(req.params.id, { status: 'DISCONNECTED' });
    await integrationService.recordAudit(
      req.params.id,
      'DISCONNECT',
      'USER',
      req.headers['x-user-id'] as string || null,
      'integration',
      req.params.id,
      null
    );
    res.json(integration);
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

// ============================================================================
// Credentials Endpoints
// ============================================================================

// POST /api/integrations/:id/credentials - Create credential
router.post('/:id/credentials', validate(credentialSchema), async (req: Request, res: Response) => {
  try {
    const credential = await integrationService.createCredential(req.params.id, req.body);
    res.status(201).json(credential);
  } catch (error) {
    console.error('Error creating credential:', error);
    res.status(500).json({ error: 'Failed to create credential' });
  }
});

// POST /api/integrations/:id/credentials/:credId/rotate - Rotate credential
router.post('/:id/credentials/:credId/rotate', async (req: Request, res: Response) => {
  try {
    const { newValue } = req.body;
    if (!newValue) {
      return res.status(400).json({ error: 'newValue required' });
    }
    const credential = await integrationService.rotateCredential(req.params.credId, newValue);
    res.json(credential);
  } catch (error) {
    console.error('Error rotating credential:', error);
    res.status(500).json({ error: 'Failed to rotate credential' });
  }
});

// POST /api/integrations/:id/credentials/:credId/revoke - Revoke credential
router.post('/:id/credentials/:credId/revoke', async (req: Request, res: Response) => {
  try {
    const credential = await integrationService.revokeCredential(req.params.credId);
    res.json(credential);
  } catch (error) {
    console.error('Error revoking credential:', error);
    res.status(500).json({ error: 'Failed to revoke credential' });
  }
});

// ============================================================================
// Organization Mapping Endpoints
// ============================================================================

// POST /api/integrations/:id/organization-mapping - Create organization mapping
router.post('/:id/organization-mapping', validate(organizationMappingSchema), async (req: Request, res: Response) => {
  try {
    const mapping = await integrationService.createOrganizationMapping(req.params.id, req.body);
    res.status(201).json(mapping);
  } catch (error) {
    console.error('Error creating organization mapping:', error);
    res.status(500).json({ error: 'Failed to create organization mapping' });
  }
});

// POST /api/integrations/:id/organization-mapping/:mappingId/verify - Verify mapping
router.post('/:id/organization-mapping/:mappingId/verify', async (req: Request, res: Response) => {
  try {
    const mapping = await integrationService.verifyOrganizationMapping(req.params.mappingId);
    res.json(mapping);
  } catch (error) {
    console.error('Error verifying organization mapping:', error);
    res.status(500).json({ error: 'Failed to verify organization mapping' });
  }
});

// ============================================================================
// Identity Mapping Endpoints
// ============================================================================

// POST /api/integrations/:id/identity-mapping - Create identity mapping
router.post('/:id/identity-mapping', validate(identityMappingSchema), async (req: Request, res: Response) => {
  try {
    const mapping = await integrationService.createIdentityMapping(req.params.id, req.body);
    res.status(201).json(mapping);
  } catch (error) {
    console.error('Error creating identity mapping:', error);
    res.status(500).json({ error: 'Failed to create identity mapping' });
  }
});

// GET /api/integrations/:id/identity-mappings - List identity mappings
router.get('/:id/identity-mappings', async (req: Request, res: Response) => {
  try {
    const { status, studentId } = req.query;
    const mappings = await integrationService.getIdentityMappings(req.params.id, {
      status: status as any,
      studentId: studentId as string,
    });
    res.json(mappings);
  } catch (error) {
    console.error('Error listing identity mappings:', error);
    res.status(500).json({ error: 'Failed to list identity mappings' });
  }
});

// POST /api/integrations/:id/identity-mapping/:mappingId/verify - Verify identity mapping
router.post('/:id/identity-mapping/:mappingId/verify', async (req: Request, res: Response) => {
  try {
    const mapping = await integrationService.verifyIdentityMapping(req.params.mappingId);
    res.json(mapping);
  } catch (error) {
    console.error('Error verifying identity mapping:', error);
    res.status(500).json({ error: 'Failed to verify identity mapping' });
  }
});

// POST /api/integrations/:id/identity-mapping/:mappingId/revoke - Revoke identity mapping
router.post('/:id/identity-mapping/:mappingId/revoke', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const mapping = await integrationService.revokeIdentityMapping(req.params.mappingId, reason || 'Revoked by admin');
    res.json(mapping);
  } catch (error) {
    console.error('Error revoking identity mapping:', error);
    res.status(500).json({ error: 'Failed to revoke identity mapping' });
  }
});

// ============================================================================
// Sharing Policy Endpoints
// ============================================================================

// POST /api/integrations/:id/sharing-policy - Create sharing policy
router.post('/:id/sharing-policy', validate(sharingPolicySchema), async (req: Request, res: Response) => {
  try {
    const policy = await integrationService.createSharingPolicy(req.params.id, req.body);
    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating sharing policy:', error);
    res.status(500).json({ error: 'Failed to create sharing policy' });
  }
});

// PUT /api/integrations/:id/sharing-policy - Update sharing policy
router.put('/:id/sharing-policy', async (req: Request, res: Response) => {
  try {
    const policy = await integrationService.updateSharingPolicy(req.params.id, req.body);
    res.json(policy);
  } catch (error) {
    console.error('Error updating sharing policy:', error);
    res.status(500).json({ error: 'Failed to update sharing policy' });
  }
});

// ============================================================================
// Sync Job Endpoints
// ============================================================================

// POST /api/integrations/:id/sync - Trigger sync
router.post('/:id/sync', validate(syncJobSchema), async (req: Request, res: Response) => {
  try {
    const syncJob = await integrationService.createSyncJob({
      ...req.body,
      integrationId: req.params.id,
    });

    // Execute sync asynchronously
    integrationService.executeSyncJob(syncJob.id).catch(err => {
      console.error(`Sync job ${syncJob.id} failed:`, err);
    });

    res.status(202).json(syncJob);
  } catch (error) {
    console.error('Error creating sync job:', error);
    res.status(500).json({ error: 'Failed to create sync job' });
  }
});

// GET /api/integrations/:id/sync/:jobId - Get sync job status
router.get('/:id/sync/:jobId', async (req: Request, res: Response) => {
  try {
    const syncJob = await integrationService.getSyncJob(req.params.jobId);
    if (!syncJob) {
      return res.status(404).json({ error: 'Sync job not found' });
    }
    if (syncJob.integrationId !== req.params.id) {
      return res.status(404).json({ error: 'Sync job not found' });
    }
    res.json(syncJob);
  } catch (error) {
    console.error('Error getting sync job:', error);
    res.status(500).json({ error: 'Failed to get sync job' });
  }
});

// GET /api/integrations/:id/sync - List sync jobs
router.get('/:id/sync', async (req: Request, res: Response) => {
  try {
    const { status, limit, offset } = req.query;
    const result = await integrationService.listSyncJobs(req.params.id, {
      status: status as any,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json(result);
  } catch (error) {
    console.error('Error listing sync jobs:', error);
    res.status(500).json({ error: 'Failed to list sync jobs' });
  }
});

// ============================================================================
// Events Endpoints
// ============================================================================

// GET /api/integrations/:id/events - List integration events
router.get('/:id/events', async (req: Request, res: Response) => {
  try {
    const { status, limit, offset } = req.query;
    const result = await integrationService.getIntegrationEvents(req.params.id, {
      status: status as any,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json(result);
  } catch (error) {
    console.error('Error listing events:', error);
    res.status(500).json({ error: 'Failed to list events' });
  }
});

// POST /api/integrations/:id/events/:eventId/retry - Retry dead-lettered event
router.post('/:id/events/:eventId/retry', async (req: Request, res: Response) => {
  try {
    const result = await integrationService.retryEvent(req.params.eventId);
    res.json(result);
  } catch (error) {
    console.error('Error retrying event:', error);
    res.status(500).json({ error: 'Failed to retry event' });
  }
});

// ============================================================================
// Reconciliation Endpoints
// ============================================================================

// POST /api/integrations/:id/reconcile - Trigger reconciliation
router.post('/:id/reconcile', async (req: Request, res: Response) => {
  try {
    const result = await integrationService.triggerReconciliation(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error triggering reconciliation:', error);
    res.status(500).json({ error: 'Failed to trigger reconciliation' });
  }
});

// GET /api/integrations/:id/reconciliation/status - Get reconciliation status
router.get('/:id/reconciliation/status', async (req: Request, res: Response) => {
  try {
    const status = await integrationService.getReconciliationStatus(req.params.id);
    res.json(status);
  } catch (error) {
    console.error('Error getting reconciliation status:', error);
    res.status(500).json({ error: 'Failed to get reconciliation status' });
  }
});

// ============================================================================
// Audit Endpoints
// ============================================================================

// GET /api/integrations/:id/audit - Get audit log
router.get('/:id/audit', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query;
    const result = await integrationService.getAuditLog(req.params.id, {
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json(result);
  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

// ============================================================================
// Health Endpoints
// ============================================================================

// GET /api/integrations/:id/health - Get integration health
router.get('/:id/health', async (req: Request, res: Response) => {
  try {
    const health = await integrationService.getHealth(req.params.id);
    res.json(health);
  } catch (error) {
    console.error('Error getting health:', error);
    res.status(500).json({ error: 'Failed to get health' });
  }
});

// ============================================================================
// Webhook Endpoint (receives webhooks from PrepVista)
// ============================================================================

// POST /api/integrations/:id/webhook - Receive webhook from PrepVista
router.post('/:id/webhook', async (req: Request, res: Response) => {
  try {
    const result = await integrationService.handleWebhook(req.params.id, req.body, req.headers as any);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, eventId: result.eventId });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Failed to handle webhook' });
  }
});

// ============================================================================
// Student-Facing Endpoints
// ============================================================================

// GET /api/integrations/:id/profile/:studentId - Get student technical profile (for PrepVista consumption)
router.get('/:id/profile/:studentId', async (req: Request, res: Response) => {
  try {
    const profile = await integrationService.getStudentProfile(req.params.id, req.params.studentId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found or access denied' });
    }
    res.json(profile);
  } catch (error) {
    console.error('Error getting student profile:', error);
    res.status(500).json({ error: 'Failed to get student profile' });
  }
});

// GET /api/integrations/student/integrations - Student view of their integrations
router.get('/student/integrations', async (req: Request, res: Response) => {
  try {
    const studentId = req.headers['x-student-id'] as string;
    if (!studentId) {
      return res.status(401).json({ error: 'Student ID required' });
    }
    // This would query integrations where student has identity mapping
    res.json({ integrations: [], studentId });
  } catch (error) {
    console.error('Error getting student integrations:', error);
    res.status(500).json({ error: 'Failed to get student integrations' });
  }
});

export default router;
