/**
 * CodeForge AI — Hint Ladder API Routes (Part 15)
 */

import { Router, Response } from 'express';
import { RepositoryRegistry } from '../../repositories/index.js';
import { AuthenticatedRequest, requireStudentOrAbove, rateLimiters } from '../middleware/auth.js';
import type { UUID, HintLadderSession, HintRung } from '../../domain/types.js';
import { iso8601 } from '../../domain/types.js';

export function createHintRoutes(repos: RepositoryRegistry): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireStudentOrAbove());

  // POST /api/v1/hints/request
  router.post('/request', rateLimiters.hints, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const { challengeId, attemptId, currentCode, language, evaluationResult } = req.body;

      if (!challengeId || !attemptId) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'challengeId and attemptId are required' },
        });
      }

      // Check for existing active hint ladder
      let session = await repos.hintLadderSession.findActiveByStudent(studentId);

      if (!session || session.challengeId !== challengeId) {
        session = {
          id: crypto.randomUUID() as UUID,
          studentId,
          challengeId: challengeId as UUID,
          attemptId: attemptId as UUID,
          state: 'ANALYZING',
          currentRung: 0,
          maxRungs: 5,
          rootIssue: null,
          rungs: [],
          createdAt: iso8601(new Date().toISOString()),
          updatedAt: iso8601(new Date().toISOString()),
        };
        await repos.hintLadderSession.create(session);
      }

      // In a real implementation, this would analyze the evaluation result
      // and generate a progressive hint using the hint ladder engine
      // For now, return a placeholder hint

      const rung: HintRung = {
        id: crypto.randomUUID() as UUID,
        sessionId: session.id,
        level: session.currentRung + 1,
        type: 'CONCEPTUAL',
        content: 'Take a closer look at your loop condition. What happens when the input is empty?',
        codeLocation: {
          file: 'solution.py',
          lineStart: 10,
          lineEnd: 15,
          columnStart: 0,
          columnEnd: 0,
          context: 'for i in range(len(nums)):',
        },
        deliveredAt: iso8601(new Date().toISOString()),
        effectiveness: 'UNKNOWN',
        studentResponse: null,
      };

      await repos.hintRung.create(rung);

      // Update session
      session.currentRung++;
      session.state = 'DELIVERED';
      session.updatedAt = iso8601(new Date().toISOString());
      await repos.hintLadderSession.update(session);

      res.json({ data: { session, hint: rung } });
    } catch (error) {
      console.error('Error requesting hint:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to request hint' } });
    }
  });

  // GET /api/v1/hints/state/:sessionId
  router.get('/state/:sessionId', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const sessionId = req.params.sessionId as UUID;

    const session = await repos.hintLadderSession.findById(sessionId);
    if (!session || session.studentId !== studentId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hint session not found' } });
    }

    const rungs = await repos.hintRung.findBySession(sessionId);

    res.json({ data: { session: session!, rungs } });
  });

  // GET /api/v1/hints/history/:sessionId
  router.get('/history/:sessionId', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const sessionId = req.params.sessionId as UUID;

    const session = await repos.hintLadderSession.findById(sessionId);
    if (!session || session.studentId !== studentId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hint session not found' } });
    }

    const rungs = await repos.hintRung.findBySession(sessionId);

    res.json({ data: { session: session!, rungs } });
  });

  return router;
}

export default createHintRoutes;