/**
 * CodeForge AI — Interview Simulation API Routes (Part 8)
 */

import { Router, Response } from 'express';
import { RepositoryRegistry } from '../../repositories/index.js';
import { AuthenticatedRequest, requireStudentOrAbove, rateLimiters } from '../middleware/auth.js';
import type { UUID, Interview, InterviewBlueprint, InterviewSession } from '../../domain/types.js';
import { iso8601 } from '../../domain/types.js';

export function createInterviewRoutes(repos: RepositoryRegistry): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireStudentOrAbove());

  // GET /api/v1/interview/blueprints
  router.get('/blueprints', async (req: AuthenticatedRequest, res: Response) => {
    const blueprints = await repos.interviewBlueprint.findAll();
    res.json({ data: blueprints });
  });

  // POST /api/v1/interview/start
  router.post('/start', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const { blueprintId, type } = req.body;

      if (!blueprintId) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'blueprintId is required' },
        });
      }

      const blueprint = await repos.interviewBlueprint.findById(blueprintId as UUID);
      if (!blueprint) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Blueprint not found' } });
      }

      // Check for existing active interview
      const active = await repos.interview.findActiveByStudent(studentId);
      if (active) {
        return res.status(409).json({
          error: { code: 'CONFLICT', message: 'An interview is already in progress' },
        });
      }

      // Create interview
      const interview: Interview = {
        id: crypto.randomUUID() as UUID,
        studentId,
        blueprintId: blueprintId as UUID,
        blueprintVersion: blueprint.version,
        state: 'CREATED',
        currentProblemIndex: 0,
        startedAt: null,
        completedAt: null,
        expiresAt: iso8601(new Date(Date.now() + blueprint.durationMinutes * 60 * 1000).toISOString()),
        createdAt: iso8601(new Date().toISOString()),
        updatedAt: iso8601(new Date().toISOString()),
      };

      await repos.interview.create(interview);

      // Create interview session (using Part 8 InterviewSession interface)
      const session = {
        id: crypto.randomUUID() as UUID,
        interviewId: interview.id,
        studentId,
        connectionId: crypto.randomUUID() as UUID,
        connectedAt: iso8601(new Date().toISOString()),
        disconnectedAt: null,
      };

      await repos.interviewSession.create(session as any);

      // Select problems from challenge bank (would use blueprint.competencies)
      // Simplified: just create placeholder problems
      // In reality, this would query challenge repository based on blueprint

      res.status(201).json({
        data: {
          interview,
          session,
          blueprint,
        },
      });
    } catch (error) {
      console.error('Error starting interview:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to start interview' } });
    }
  });

  // GET /api/v1/interview/session/:id
  router.get('/session/:id', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const interview = await repos.interview.findById(req.params.id as UUID);

    if (!interview || interview.studentId !== studentId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Interview not found' } });
    }

    const [session, problems, events] = await Promise.all([
      repos.interviewSession.findActiveByInterview(interview.id),
      repos.interviewProblem.findByInterview(interview.id),
      repos.interviewEvent.findByInterview(interview.id),
    ]);

    res.json({
      data: {
        interview,
        session,
        problems,
        events,
      },
    });
  });

  // POST /api/v1/interview/session/:id/action (rate limited)
  router.post('/session/:id/action', rateLimiters.interview, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const { action, payload } = req.body;
      const interviewId = req.params.id as UUID;

      const interview = await repos.interview.findById(interviewId);
      if (!interview || interview.studentId !== studentId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Interview not found' } });
      }

      if (interview.state === 'COMPLETED' || interview.state === 'EXPIRED' || interview.state === 'CANCELLED') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Interview is not active' } });
      }

      // Process action
      // This would be a complex state machine
      // Simplified for now

      const event = {
        id: crypto.randomUUID() as UUID,
        interviewId,
        problemId: null,
        type: action,
        payload,
        timestamp: iso8601(new Date().toISOString()),
      };

      await repos.interviewEvent.create(event);

      res.json({ data: { event, interview } });
    } catch (error) {
      console.error('Error processing interview action:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to process action' } });
    }
  });

  // GET /api/v1/interview/session/:id/report
  router.get('/session/:id/report', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const interviewId = req.params.id as UUID;

    const interview = await repos.interview.findById(interviewId);
    if (!interview || interview.studentId !== studentId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Interview not found' } });
    }

    if (interview.state !== 'COMPLETED') {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Interview not completed' } });
    }

    const evaluations = await repos.interviewEvaluation.findByInterview(interviewId);
    const problems = await repos.interviewProblem.findByInterview(interviewId);

    // Build report
    const report = {
      interviewId,
      studentId,
      blueprintId: interview.blueprintId,
      overallPassed: evaluations.every(e => e.passed),
      overallScore: evaluations.reduce((sum, e) => sum + e.overallScore, 0) / evaluations.length || 0,
      dimensionScores: {},
      problemResults: evaluations,
      strengths: [],
      weaknesses: [],
      recommendations: [],
      generatedAt: iso8601(new Date().toISOString()),
    };

    res.json({ data: report });
  });

  return router;
}

export default createInterviewRoutes;