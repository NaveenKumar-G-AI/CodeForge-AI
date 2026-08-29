/**
 * CodeForge AI — Submission System API Routes (Parts 12, 13)
 */

import { Router, Response } from 'express';
import { RepositoryRegistry } from '../../repositories/index.js';
import { AuthenticatedRequest, requireStudentOrAbove, rateLimiters } from '../middleware/auth.js';
import { iso8601, uuid } from '../../domain/types.js';
import type { UUID, Submission, SubmissionResult, NormalizedExecutionResult } from '../../domain/types.js';

export function createSubmissionRoutes(repos: RepositoryRegistry): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireStudentOrAbove());

  // POST /api/v1/submissions
  router.post('/', rateLimiters.submissions, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const { challengeId, language = 'python', code, clientAttemptId, assistanceUsed = 'NONE', recommendationId } = req.body;

      if (!challengeId || !code) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'challengeId and code are required' },
        });
      }

      // Check idempotency
      if (clientAttemptId) {
        const existing = await repos.submission.findByIdempotencyKey(`attempt:${studentId}:${clientAttemptId}`);
        if (existing) {
          return res.status(409).json({
            error: { code: 'CONFLICT', message: 'Duplicate submission', data: { submissionId: existing.id } },
          });
        }
      }

      const submission: Submission = {
        id: uuid(crypto.randomUUID()),
        studentId,
        challengeId: uuid(challengeId),
        language: language as any,
        code,
        clientAttemptId: clientAttemptId || null,
        assistanceUsed: assistanceUsed as any,
        recommendationId: recommendationId ? uuid(recommendationId) : null,
        state: 'QUEUED',
        submittedAt: iso8601(new Date().toISOString()),
        startedAt: null,
        completedAt: null,
        workerId: 'api',
        attempts: 1,
        idempotencyKey: clientAttemptId ? `attempt:${studentId}:${clientAttemptId}` : undefined,
      };

      await repos.submission.create(submission);

      // Queue for async processing (in real implementation, this would go to a message queue)
      // For now, return immediately with queued status
      res.status(202).json({
        data: {
          submissionId: submission.id,
          state: 'QUEUED',
          message: 'Submission queued for evaluation',
        },
      });
    } catch (error) {
      console.error('Error creating submission:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create submission' } });
    }
  });

  // GET /api/v1/submissions/history
  router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const { limit = '20', offset = '0', challengeId } = req.query;

    let submissions = await repos.submission.findByStudent(studentId, Number(limit) + Number(offset));

    if (challengeId) {
      submissions = submissions.filter(s => s.challengeId === challengeId);
    }

    const start = Number(offset);
    const lim = Number(limit);
    const paginated = submissions.slice(start, start + lim);

    res.json({
      data: paginated,
      total: submissions.length,
      page: Math.floor(start / lim) + 1,
      pageSize: lim,
      hasMore: start + lim < submissions.length,
    });
  });

  // GET /api/v1/submissions/:id
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const submissionId = req.params.id as UUID;

    const submission = await repos.submission.findById(submissionId);
    if (!submission || submission.studentId !== studentId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Submission not found' } });
    }

    const result = await repos.submissionResult.findBySubmission(submissionId);
    const normalized = await repos.normalizedExecutionResult.findBySubmission(submissionId);

    res.json({
      data: {
        submission,
        result,
        normalizedResult: normalized,
      },
    });
  });

  // GET /api/v1/submissions/:id/result
  router.get('/:id/result', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const submissionId = req.params.id as UUID;

    const submission = await repos.submission.findById(submissionId);
    if (!submission || submission.studentId !== studentId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Submission not found' } });
    }

    const result = await repos.submissionResult.findBySubmission(submissionId);
    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Result not available yet' } });
    }

    // Redact hidden test data for student
    const studentResult = {
      ...result,
      testResults: result.testResults.map(t => ({
        ...t,
        expectedOutput: undefined, // Would check if hidden
        actualOutput: undefined,   // Would check if hidden
      })),
    };

    res.json({ data: studentResult });
  });

  return router;
}

export default createSubmissionRoutes;
