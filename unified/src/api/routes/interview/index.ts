/**
 * Technical Interview API Routes - Feature 35
 * Evidence-verification interview orchestration
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  InterviewMode,
  InterviewSessionState as SessionState,
  TenantContext,
} from '../../../domain/types.js';
import { interviewService } from '../../../engine/interview/InterviewService.js';

const router = Router();

// Validation schemas
const createInterviewSchema = z.object({
  candidateId: z.string().uuid(),
  targetRole: z.string().min(1),
  mode: z.enum([
    'TECHNICAL_SCREENING',
    'PROJECT_DEFENSE',
    'CODE_DEFENSE',
    'SKILL_VERIFICATION',
    'DEEP_TECHNICAL',
    'DEBUGGING_INTERVIEW',
    'ARCHITECTURE_INTERVIEW',
    'SCENARIO_INTERVIEW',
    'GAP_VERIFICATION',
  ]),
  restrictToSkills: z.array(z.string()).optional(),
});

const submitResponseSchema = z.object({
  questionId: z.string().uuid(),
  responseText: z.string().min(1).max(20000),
  idempotencyKey: z.string().min(1),
});

// Middleware to extract tenant context (placeholder)
const extractTenantContext = (req: Request): TenantContext => {
  // In real implementation, this would come from authenticated session/JWT
  return {
    orgId: req.headers['x-org-id'] as string || 'default-org',
    actorId: req.headers['x-actor-id'] as string || 'system',
    actorRole: (req.headers['x-actor-role'] as 'CANDIDATE' | 'STAFF' | 'SYSTEM') || 'SYSTEM',
  };
};

// POST /api/v1/interview - Create interview
router.post('/', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const result = createInterviewSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
    }

    const session = await interviewService.createInterview(ctx, result.data);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating interview:', error);
    res.status(500).json({ error: 'Failed to create interview' });
  }
});

// POST /api/v1/interview/:id/start - Start interview session
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const question = await interviewService.startSession(ctx, req.params.id);
    res.json(question);
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({ error: 'Failed to start interview' });
  }
});

// GET /api/v1/interview/:id/current-question - Get current question
router.get('/:id/current-question', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const question = await interviewService.getCurrentQuestion(ctx, req.params.id);
    res.json(question);
  } catch (error) {
    console.error('Error getting current question:', error);
    res.status(500).json({ error: 'Failed to get current question' });
  }
});

// POST /api/v1/interview/:id/responses - Submit response
router.post('/:id/responses', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const result = submitResponseSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
    }

    const response = await interviewService.submitResponse(ctx, {
      sessionId: req.params.id,
      ...result.data,
    });
    res.json(response);
  } catch (error) {
    console.error('Error submitting response:', error);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

// POST /api/v1/interview/:id/pause - Pause interview
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    await interviewService.pause(ctx, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error pausing interview:', error);
    res.status(500).json({ error: 'Failed to pause interview' });
  }
});

// POST /api/v1/interview/:id/resume - Resume interview
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const question = await interviewService.resume(ctx, req.params.id);
    res.json(question);
  } catch (error) {
    console.error('Error resuming interview:', error);
    res.status(500).json({ error: 'Failed to resume interview' });
  }
});

// GET /api/v1/interview/candidates/:candidateId/history - Get interview history
router.get('/candidates/:candidateId/history', async (req: Request, res: Response) => {
  try {
    const ctx = extractTenantContext(req);
    const history = await interviewService.getHistory(ctx, req.params.candidateId);
    res.json(history);
  } catch (error) {
    console.error('Error getting interview history:', error);
    res.status(500).json({ error: 'Failed to get interview history' });
  }
});

export default router;
