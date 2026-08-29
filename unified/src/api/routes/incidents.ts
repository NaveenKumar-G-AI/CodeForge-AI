/**
 * CodeForge AI — Incident Engine API Routes (Part 11)
 */

import { Router, Response } from 'express';
import { RepositoryRegistry } from '../../repositories/index.js';
import { AuthenticatedRequest, requireStudentOrAbove, rateLimiters } from '../middleware/auth.js';
import type { UUID, Incident, IncidentBlueprint, IncidentHypothesis, IncidentAction } from '../../domain/types.js';
import { iso8601 } from '../../domain/types.js';

export function createIncidentRoutes(repos: RepositoryRegistry): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireStudentOrAbove());

  // GET /api/v1/incidents/blueprints
  router.get('/blueprints', async (req: AuthenticatedRequest, res: Response) => {
    const blueprints = await repos.incidentBlueprint.findAll();
    res.json({ data: blueprints });
  });

  // POST /api/v1/incidents/start
  router.post('/start', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const { blueprintId } = req.body;

      if (!blueprintId) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'blueprintId is required' },
        });
      }

      const blueprint = await repos.incidentBlueprint.findById(blueprintId as UUID);
      if (!blueprint) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Blueprint not found' } });
      }

      // Check for existing active incident
      const active = await repos.incident.findActiveByStudent(studentId);
      if (active) {
        return res.status(409).json({
          error: { code: 'CONFLICT', message: 'An incident is already in progress' },
        });
      }

      // Create incident
      const incident: Incident = {
        id: crypto.randomUUID() as UUID,
        studentId,
        blueprintId: blueprintId as UUID,
        title: blueprint.name,
        description: blueprint.description,
        severity: blueprint.severity,
        phase: blueprint.initialPhase,
        status: 'ACTIVE',
        startedAt: iso8601(new Date().toISOString()),
        resolvedAt: null,
        createdAt: iso8601(new Date().toISOString()),
        updatedAt: iso8601(new Date().toISOString()),
      };

      await repos.incident.create(incident);

      res.status(201).json({
        data: {
          incident,
          blueprint,
        },
      });
    } catch (error) {
      console.error('Error starting incident:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to start incident' } });
    }
  });

  // GET /api/v1/incidents/:id
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const incidentId = req.params.id as UUID;

    const incident = await repos.incident.findById(incidentId);
    if (!incident || incident.studentId !== studentId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Incident not found' } });
    }

    const [hypotheses, actions, logs, metrics, traces] = await Promise.all([
      repos.incidentHypothesis.findByIncident(incidentId),
      repos.incidentAction.findByIncident(incidentId),
      repos.incidentLog.findByIncident(incidentId, 50),
      repos.incidentMetric.findByIncident(incidentId),
      repos.incidentTrace.findByIncident(incidentId),
    ]);

    res.json({
      data: {
        incident,
        hypotheses,
        actions,
        logs,
        metrics,
        traces,
      },
    });
  });

  // POST /api/v1/incidents/:id/hypothesis
  router.post('/:id/hypothesis', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const incidentId = req.params.id as UUID;
      const { description } = req.body;

      if (!description) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'description is required' },
        });
      }

      const incident = await repos.incident.findById(incidentId);
      if (!incident || incident.studentId !== studentId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Incident not found' } });
      }

      const hypothesis: IncidentHypothesis = {
        id: crypto.randomUUID() as UUID,
        incidentId,
        studentId,
        description,
        status: 'PROPOSED',
        evidence: [],
        createdAt: iso8601(new Date().toISOString()),
        updatedAt: iso8601(new Date().toISOString()),
      };

      await repos.incidentHypothesis.create(hypothesis);

      // Update incident phase if in DETECTION
      if (incident.phase === 'DETECTION') {
        incident.phase = 'TRIAGE';
        incident.updatedAt = iso8601(new Date().toISOString());
        await repos.incident.update(incident);
      }

      res.status(201).json({ data: hypothesis });
    } catch (error) {
      console.error('Error creating hypothesis:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create hypothesis' } });
    }
  });

  // POST /api/v1/incidents/:id/action
  router.post('/:id/action', rateLimiters.incident, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const incidentId = req.params.id as UUID;
      const { type, description, details } = req.body;

      if (!type || !description) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'type and description are required' },
        });
      }

      const incident = await repos.incident.findById(incidentId);
      if (!incident || incident.studentId !== studentId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Incident not found' } });
      }

      const action: IncidentAction = {
        id: crypto.randomUUID() as UUID,
        incidentId,
        studentId,
        type,
        description,
        result: 'PENDING',
        details: details || {},
        timestamp: iso8601(new Date().toISOString()),
      };

      await repos.incidentAction.create(action);

      // In a real implementation, this would execute the action
      // and update result based on outcome

      res.status(201).json({ data: action });
    } catch (error) {
      console.error('Error creating action:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create action' } });
    }
  });

  // POST /api/v1/incidents/:id/logs
  router.post('/:id/logs', rateLimiters.incident, async (req: AuthenticatedRequest, res: Response) => {
    // Query logs - in reality this would query a log aggregation system
    res.json({ data: [] });
  });

  // POST /api/v1/incidents/:id/metrics
  router.post('/:id/metrics', rateLimiters.incident, async (req: AuthenticatedRequest, res: Response) => {
    // Query metrics - in reality this would query a metrics system
    res.json({ data: [] });
  });

  // POST /api/v1/incidents/:id/traces
  router.post('/:id/traces', rateLimiters.incident, async (req: AuthenticatedRequest, res: Response) => {
    // Query traces - in reality this would query a tracing system
    res.json({ data: [] });
  });

  // GET /api/v1/incidents/:id/postmortem
  router.get('/:id/postmortem', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const incidentId = req.params.id as UUID;

    const incident = await repos.incident.findById(incidentId);
    if (!incident || incident.studentId !== studentId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Incident not found' } });
    }

    const postmortem = await repos.postmortem.findByIncident(incidentId);

    if (!postmortem) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Postmortem not found' } });
    }

    res.json({ data: postmortem });
  });

  return router;
}

export default createIncidentRoutes;