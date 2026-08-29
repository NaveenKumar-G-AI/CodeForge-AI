/**
 * CodeForge AI — AI Code Coach API Routes (Part 14)
 */

import { Router, Response } from 'express';
import { RepositoryRegistry } from '../../repositories/index.js';
import { AuthenticatedRequest, requireStudentOrAbove, rateLimiters } from '../middleware/auth.js';
import type { UUID, CoachSession, CoachMessage, CoachContext } from '../../domain/types.js';
import { iso8601 } from '../../domain/types.js';

export function createCoachRoutes(repos: RepositoryRegistry): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireStudentOrAbove());

  // POST /api/v1/coach/session
  router.post('/session', rateLimiters.coach, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const { challengeId, attemptId } = req.body;

      // Check for existing active session
      let session: CoachSession | null = null;
      if (challengeId) {
        session = await repos.coachSession.findActiveByStudentAndChallenge(studentId, challengeId as UUID);
      }

      if (!session) {
        session = {
          id: crypto.randomUUID() as UUID,
          studentId,
          challengeId: challengeId as UUID | null,
          attemptId: attemptId as UUID | null,
          state: 'ACTIVE',
          messages: [],
          observations: [],
          createdAt: iso8601(new Date().toISOString()),
          updatedAt: iso8601(new Date().toISOString()),
        };
        await repos.coachSession.create(session);
      }

      res.status(201).json({ data: session });
    } catch (error) {
      console.error('Error creating coach session:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create coach session' } });
    }
  });

  // GET /api/v1/coach/session/:id
  router.get('/session/:id', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const sessionId = req.params.id as UUID;

    const session = await repos.coachSession.findById(sessionId);
    if (!session || session.studentId !== studentId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Coach session not found' } });
    }

    const messages = await repos.coachMessage.findBySession(sessionId);
    const observations = await repos.coachObservation.findBySession(sessionId);

    res.json({ data: { session: session!, messages, observations } });
  });

  // POST /api/v1/coach/session/:id/message
  router.post('/session/:id/message', rateLimiters.coach, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const sessionId = req.params.id as UUID;
      const { message, context } = req.body;

      if (!message) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'message is required' } });
      }

      const session = await repos.coachSession.findById(sessionId);
      if (!session || session.studentId !== studentId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Coach session not found' } });
      }

      // Save user message
      const userMessage = {
        id: crypto.randomUUID() as UUID,
        sessionId,
        role: 'user' as const,
        content: message,
        metadata: context || {},
        timestamp: iso8601(new Date().toISOString()),
      };
      await repos.coachMessage.create(userMessage);

      // In a real implementation, this would call the AI coach
      // For now, return a placeholder response
      const aiResponse = {
        id: crypto.randomUUID() as UUID,
        sessionId,
        role: 'assistant' as const,
        content: `I understand you're asking about "${message}". Let me help you think through this. What have you tried so far?`,
        metadata: { coachingStyle: 'SOCRATIC' },
        timestamp: iso8601(new Date().toISOString()),
      };
      await repos.coachMessage.create(aiResponse);

      res.json({ data: { userMessage, aiResponse } });
    } catch (error) {
      console.error('Error sending coach message:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to send message' } });
    }
  });

  // GET /api/v1/coach/session/:id/state
  router.get('/session/:id/state', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const sessionId = req.params.id as UUID;

    const session = await repos.coachSession.findById(sessionId);
    if (!session || session.studentId !== studentId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Coach session not found' } });
    }

    const observations = await repos.coachObservation.findBySession(sessionId);

    res.json({
      data: {
        session,
        observations,
        messageCount: (await repos.coachMessage.findBySession(sessionId)).length,
      },
    });
  });

  return router;
}

export default createCoachRoutes;