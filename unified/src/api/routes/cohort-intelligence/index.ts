/**
 * Cohort Intelligence API Routes - Feature 36
 * Privacy-aware institutional intelligence layer
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  CohortKind,
  CohortDimension,
  Cohort,
  CohortExecutiveOverview,
} from '../../../domain/types.js';
import { cohortIntelligenceService } from '../../../engine/cohort-intelligence/CohortIntelligenceService.js';

const router = Router();

// Validation schemas
const createCohortSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  kind: z.enum(['ACADEMIC', 'DEPARTMENT', 'TRAINING', 'ROLE', 'PLACEMENT', 'CUSTOM']),
  dimension: z.enum([
    'ACADEMIC_YEAR', 'BATCH', 'DEPARTMENT', 'DEGREE', 'BRANCH',
    'SECTION', 'GRADUATION_YEAR', 'PLACEMENT_CYCLE', 'TRAINING_PROGRAM',
    'ROLE_TRACK', 'CUSTOM'
  ]),
  parentCohortId: z.string().uuid().nullable().optional(),
  attributes: z.record(z.string()).optional(),
});

const addMemberSchema = z.object({
  studentId: z.string().uuid(),
});

const compareCohortsSchema = z.object({
  cohortIdA: z.string().uuid(),
  cohortIdB: z.string().uuid(),
});

const captureSnapshotSchema = z.object({
  periodLabel: z.string().min(1).max(100),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  payload: z.record(z.unknown()),
  scoringMethodologyVersion: z.string().min(1),
});

// Middleware to extract tenant context (placeholder)
const extractTenantContext = (req: Request): { orgId: string } => {
  return {
    orgId: req.headers['x-org-id'] as string || 'default-org',
  };
};

// POST /api/v1/cohort-intelligence/cohorts - Create cohort
router.post('/cohorts', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const result = createCohortSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
    }

    const input = {
      organizationId: ctx.orgId,
      name: result.data.name,
      kind: result.data.kind as CohortKind,
      dimension: result.data.dimension as CohortDimension,
      parentCohortId: result.data.parentCohortId || undefined,
      attributes: result.data.attributes,
    };
    const cohort = await cohortIntelligenceService.createCohort(input);
    res.status(201).json(cohort);
  } catch (error) {
    console.error('Error creating cohort:', error);
    res.status(500).json({ error: 'Failed to create cohort' });
  }
});

// GET /api/v1/cohort-intelligence/cohorts - List cohorts
router.get('/cohorts', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const cohorts = await cohortIntelligenceService.listCohorts(ctx.orgId);
    res.json(cohorts);
  } catch (error) {
    console.error('Error listing cohorts:', error);
    res.status(500).json({ error: 'Failed to list cohorts' });
  }
});

// GET /api/v1/cohort-intelligence/cohorts/:id - Get cohort
router.get('/cohorts/:id', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const cohort = await cohortIntelligenceService.getCohort(req.params.id, ctx.orgId);
    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }
    res.json(cohort);
  } catch (error) {
    console.error('Error getting cohort:', error);
    res.status(500).json({ error: 'Failed to get cohort' });
  }
});

// POST /api/v1/cohort-intelligence/cohorts/:id/members - Add member
router.post('/cohorts/:id/members', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const result = addMemberSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
    }

    const membership = await cohortIntelligenceService.addMember(req.params.id, result.data.studentId, ctx.orgId);
    res.status(201).json(membership);
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// DELETE /api/v1/cohort-intelligence/cohorts/:id/members/:studentId - Remove member
router.delete('/cohorts/:id/members/:studentId', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    await cohortIntelligenceService.removeMember(req.params.id, req.params.studentId, ctx.orgId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// GET /api/v1/cohort-intelligence/cohorts/:id/members - List members
router.get('/cohorts/:id/members', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const members = await cohortIntelligenceService.listMembers(req.params.id, ctx.orgId);
    res.json(members);
  } catch (error) {
    console.error('Error listing members:', error);
    res.status(500).json({ error: 'Failed to list members' });
  }
});

// POST /api/v1/cohort-intelligence/cohorts/:id/recompute - Trigger aggregation
router.post('/cohorts/:id/recompute', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    await cohortIntelligenceService.recomputeAll(ctx.orgId, req.params.id);
    res.json({ success: true, message: 'Aggregation triggered' });
  } catch (error) {
    console.error('Error triggering recomputation:', error);
    res.status(500).json({ error: 'Failed to trigger recomputation' });
  }
});

// GET /api/v1/cohort-intelligence/cohorts/:id/overview - Executive overview
router.get('/cohorts/:id/overview', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const overview = await cohortIntelligenceService.getCohortExecutiveOverview(ctx.orgId, req.params.id);
    res.json(overview);
  } catch (error) {
    console.error('Error getting executive overview:', error);
    res.status(500).json({ error: 'Failed to get executive overview' });
  }
});

// GET /api/v1/cohort-intelligence/cohorts/:id/overview/narrative - Executive overview with AI narrative
router.get('/cohorts/:id/overview/narrative', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const result = await cohortIntelligenceService.getCohortExecutiveOverviewWithNarrative(ctx.orgId, req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error getting narrative overview:', error);
    res.status(500).json({ error: 'Failed to get narrative overview' });
  }
});

// GET /api/v1/cohort-intelligence/cohorts/:id/skills - Skill aggregates
router.get('/cohorts/:id/skills', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    // Would delegate to dashboard service
    res.json({ skills: [], message: 'Not implemented yet' });
  } catch (error) {
    console.error('Error getting skill aggregates:', error);
    res.status(500).json({ error: 'Failed to get skill aggregates' });
  }
});

// GET /api/v1/cohort-intelligence/cohorts/:id/roles - Role aggregates
router.get('/cohorts/:id/roles', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    // Would delegate to dashboard service
    res.json({ roles: [], message: 'Not implemented yet' });
  } catch (error) {
    console.error('Error getting role aggregates:', error);
    res.status(500).json({ error: 'Failed to get role aggregates' });
  }
});

// GET /api/v1/cohort-intelligence/cohorts/:id/training-priorities - Training insights
router.get('/cohorts/:id/training-priorities', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    // Would delegate to dashboard service
    res.json({ priorities: [], message: 'Not implemented yet' });
  } catch (error) {
    console.error('Error getting training priorities:', error);
    res.status(500).json({ error: 'Failed to get training priorities' });
  }
});

// POST /api/v1/cohort-intelligence/cohorts/compare - Compare two cohorts
router.post('/cohorts/compare', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const result = compareCohortsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
    }

    const comparison = await cohortIntelligenceService.compareCohorts(ctx.orgId, result.data.cohortIdA, result.data.cohortIdB);
    res.json(comparison);
  } catch (error) {
    console.error('Error comparing cohorts:', error);
    res.status(500).json({ error: 'Failed to compare cohorts' });
  }
});

// POST /api/v1/cohort-intelligence/cohorts/:id/snapshots - Create snapshot
router.post('/cohorts/:id/snapshots', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const result = captureSnapshotSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
    }

    const snapshot = await cohortIntelligenceService.captureSnapshot(
      req.params.id,
      result.data.periodLabel,
      result.data.periodStart,
      result.data.periodEnd,
      result.data.payload,
      result.data.scoringMethodologyVersion
    );
    res.status(201).json(snapshot);
  } catch (error) {
    console.error('Error creating snapshot:', error);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

// GET /api/v1/cohort-intelligence/cohorts/:id/snapshots - List snapshots
router.get('/cohorts/:id/snapshots', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const snapshots = await cohortIntelligenceService.listSnapshots(req.params.id);
    res.json(snapshots);
  } catch (error) {
    console.error('Error listing snapshots:', error);
    res.status(500).json({ error: 'Failed to list snapshots' });
  }
});

// GET /api/v1/cohort-intelligence/cohorts/:id/report - Export report
router.get('/cohorts/:id/report', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const { format } = req.query;
    const report = await cohortIntelligenceService.exportCohortReport(req.params.id, (format as 'json' | 'csv') || 'json');
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.send(report);
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// POST /api/v1/cohort-intelligence/events - Ingest intelligence event
router.post('/events', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const { sourceEventId, type, studentId, payload } = req.body;

    if (!sourceEventId || !type || !studentId) {
      return res.status(400).json({ error: 'sourceEventId, type, and studentId are required' });
    }

    await cohortIntelligenceService.ingestIntelligenceEvent({
      sourceEventId,
      type,
      studentId,
      orgId: ctx.orgId,
      payload: payload || {},
    });

    res.status(202).json({ success: true, message: 'Event queued for processing' });
  } catch (error) {
    console.error('Error ingesting event:', error);
    res.status(500).json({ error: 'Failed to ingest event' });
  }
});

// Dashboards
// GET /api/v1/cohort-intelligence/dashboards/tpo
router.get('/dashboards/tpo', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const dashboard = await cohortIntelligenceService.getTpoDashboard(ctx.orgId);
    res.json(dashboard);
  } catch (error) {
    console.error('Error getting TPO dashboard:', error);
    res.status(500).json({ error: 'Failed to get TPO dashboard' });
  }
});

// GET /api/v1/cohort-intelligence/dashboards/trainer
router.get('/dashboards/trainer', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const trainerId = req.headers['x-trainer-id'] as string;
    if (!trainerId) {
      return res.status(400).json({ error: 'Trainer ID required' });
    }
    const dashboard = await cohortIntelligenceService.getTrainerDashboard(ctx.orgId, trainerId);
    res.json(dashboard);
  } catch (error) {
    console.error('Error getting Trainer dashboard:', error);
    res.status(500).json({ error: 'Failed to get Trainer dashboard' });
  }
});

// GET /api/v1/cohort-intelligence/dashboards/admin
router.get('/dashboards/admin', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const dashboard = await cohortIntelligenceService.getAdminDashboard(ctx.orgId);
    res.json(dashboard);
  } catch (error) {
    console.error('Error getting Admin dashboard:', error);
    res.status(500).json({ error: 'Failed to get Admin dashboard' });
  }
});

export default router;
