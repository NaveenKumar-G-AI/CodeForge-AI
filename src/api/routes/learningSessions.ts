/**
 * CodeForge AI - Learning Session API Routes (Part 7)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RepositoryRegistry } from '../../repositories/index.js';
import {
  LearningSessionService,
  createLearningSessionEvent,
} from '../../engine/learning-session/index.js';
import { AuthenticatedRequest, requireStudentOrAbove } from '../middleware/auth.js';
import {
  NotFoundError,
  type LearningSession,
  type LearningSessionEventType,
  type LearningSessionMode,
  type LearningSessionState,
  type UUID,
} from '../../domain/types.js';

const SESSION_MODES = [
  'FOCUSED_PRACTICE',
  'ROADMAP_BLOCK',
  'REVIEW',
  'ASSESSMENT_PREP',
  'INTERVIEW_PREP',
  'RECOVERY',
] as const;

const SESSION_STATES = [
  'PLANNED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ABANDONED',
  'EXPIRED',
] as const;

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

const createSessionSchema = z.object({
  mode: z.enum(SESSION_MODES).optional(),
  availableMinutes: z.coerce.number().int().min(5).max(240).optional(),
  date: z.string().regex(dateOnly).optional(),
});

const listQuerySchema = z.object({
  state: z.enum(SESSION_STATES).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const completeActivitySchema = z.object({
  evidenceIds: z.array(z.string().uuid()).default([]),
  score: z.number().min(0).max(1).nullable().optional(),
});

const skipActivitySchema = z.object({
  reason: z.string().max(500).optional(),
});

const abandonSessionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export function createLearningSessionRoutes(
  repos: RepositoryRegistry,
  learningSessionService: LearningSessionService
): Router {
  const router = Router();

  router.use(requireStudentOrAbove());

  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const query = listQuerySchema.parse(req.query);
      const sessions = query.state
        ? await repos.learningSession.findByStudentAndState(studentId, query.state as LearningSessionState)
        : await repos.learningSession.findByStudent(studentId, { limit: query.limit });

      res.json({ data: sessions.slice(0, query.limit) });
    } catch (error) {
      handleRouteError(error, res, 'Failed to list learning sessions');
    }
  });

  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const body = createSessionSchema.parse(req.body);
      const date = body.date ?? new Date().toISOString().slice(0, 10);

      const [recommendations, dailyPlan, skillStates, recentEvidence] = await Promise.all([
        repos.recommendation.findPendingByStudent(studentId),
        repos.dailyPlan.findByStudentAndDate(studentId, date),
        repos.studentSkillState.findByStudent(studentId),
        repos.evidence.findRecentByStudent(studentId, 50),
      ]);

      const session = learningSessionService.plan({
        studentId,
        requestedMode: body.mode as LearningSessionMode | undefined,
        availableMinutes: body.availableMinutes,
        recommendations,
        dailyPlan,
        skillStates,
        recentEvidence,
      });

      if (session.activities.length === 0) {
        return res.status(409).json({
          error: {
            code: 'NO_SESSION_ACTIVITIES',
            message: 'No roadmap activities, recommendations, or due reviews are available for this student.',
          },
        });
      }

      await repos.learningSession.create(session);
      await repos.learningSessionEvent.create(
        createLearningSessionEvent(session, 'SESSION_CREATED', {
          mode: session.mode,
          activityCount: session.activities.length,
          targetMinutes: session.targetMinutes,
        })
      );

      res.status(201).json({
        data: {
          session,
          nextAction: learningSessionService.nextAction(session),
        },
      });
    } catch (error) {
      handleRouteError(error, res, 'Failed to create learning session');
    }
  });

  router.get('/active/current', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const session = await repos.learningSession.findActiveByStudent(studentId);
      res.json({
        data: session
          ? { session, nextAction: learningSessionService.nextAction(session) }
          : null,
      });
    } catch (error) {
      handleRouteError(error, res, 'Failed to get active learning session');
    }
  });

  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session = await getOwnedSession(repos, req.studentId!, req.params.id as UUID);
      res.json({
        data: {
          session,
          nextAction: learningSessionService.nextAction(session),
        },
      });
    } catch (error) {
      handleRouteError(error, res, 'Failed to get learning session');
    }
  });

  router.get('/:id/events', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session = await getOwnedSession(repos, req.studentId!, req.params.id as UUID);
      const events = await repos.learningSessionEvent.findBySession(session.id);
      res.json({ data: events });
    } catch (error) {
      handleRouteError(error, res, 'Failed to get learning session events');
    }
  });

  router.get('/:id/summary', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session = await getOwnedSession(repos, req.studentId!, req.params.id as UUID);
      res.json({ data: learningSessionService.summarize(session) });
    } catch (error) {
      handleRouteError(error, res, 'Failed to summarize learning session');
    }
  });

  router.get('/:id/next-action', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session = await getOwnedSession(repos, req.studentId!, req.params.id as UUID);
      res.json({ data: learningSessionService.nextAction(session) });
    } catch (error) {
      handleRouteError(error, res, 'Failed to resolve next learning session action');
    }
  });

  router.post('/:id/start', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session = await getOwnedSession(repos, req.studentId!, req.params.id as UUID);
      const updated = learningSessionService.start(session);
      await saveSessionWithEvent(repos, updated, 'SESSION_STARTED', { previousState: session.state }, updated.activeActivityId);
      await acceptActiveRecommendation(repos, updated);

      res.json({ data: { session: updated, nextAction: learningSessionService.nextAction(updated) } });
    } catch (error) {
      handleRouteError(error, res, 'Failed to start learning session');
    }
  });

  router.post('/:id/pause', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session = await getOwnedSession(repos, req.studentId!, req.params.id as UUID);
      const updated = learningSessionService.pause(session);
      await saveSessionWithEvent(repos, updated, 'SESSION_PAUSED', { previousState: session.state }, updated.activeActivityId);

      res.json({ data: { session: updated, nextAction: learningSessionService.nextAction(updated) } });
    } catch (error) {
      handleRouteError(error, res, 'Failed to pause learning session');
    }
  });

  router.post('/:id/resume', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session = await getOwnedSession(repos, req.studentId!, req.params.id as UUID);
      const updated = learningSessionService.resume(session);
      await saveSessionWithEvent(repos, updated, 'SESSION_RESUMED', { previousState: session.state }, updated.activeActivityId);
      await acceptActiveRecommendation(repos, updated);

      res.json({ data: { session: updated, nextAction: learningSessionService.nextAction(updated) } });
    } catch (error) {
      handleRouteError(error, res, 'Failed to resume learning session');
    }
  });

  router.post('/:id/complete', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session = await getOwnedSession(repos, req.studentId!, req.params.id as UUID);
      const updated = learningSessionService.complete(session);
      await saveSessionWithEvent(repos, updated, 'SESSION_COMPLETED', { previousState: session.state });

      res.json({ data: { session: updated, summary: learningSessionService.summarize(updated) } });
    } catch (error) {
      handleRouteError(error, res, 'Failed to complete learning session');
    }
  });

  router.post('/:id/abandon', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = abandonSessionSchema.parse(req.body);
      const session = await getOwnedSession(repos, req.studentId!, req.params.id as UUID);
      const updated = learningSessionService.abandon(session, body.reason);
      await saveSessionWithEvent(repos, updated, 'SESSION_ABANDONED', {
        previousState: session.state,
        reason: body.reason ?? null,
      });

      res.json({ data: { session: updated, summary: learningSessionService.summarize(updated) } });
    } catch (error) {
      handleRouteError(error, res, 'Failed to abandon learning session');
    }
  });

  router.post('/:id/activities/:activityId/start', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session = await getOwnedSession(repos, req.studentId!, req.params.id as UUID);
      const activityId = req.params.activityId as UUID;
      const updated = learningSessionService.startActivity(session, activityId);
      await saveSessionWithEvent(repos, updated, 'ACTIVITY_STARTED', { previousActiveActivityId: session.activeActivityId }, activityId);
      await acceptActiveRecommendation(repos, updated);

      res.json({ data: { session: updated, nextAction: learningSessionService.nextAction(updated) } });
    } catch (error) {
      handleRouteError(error, res, 'Failed to start learning session activity');
    }
  });

  router.post('/:id/activities/:activityId/complete', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = completeActivitySchema.parse(req.body);
      const session = await getOwnedSession(repos, req.studentId!, req.params.id as UUID);
      const activityId = req.params.activityId as UUID;
      const updated = learningSessionService.completeActivity(session, activityId, {
        evidenceIds: body.evidenceIds as UUID[],
        score: body.score,
      });

      await completeRecommendationForActivity(repos, updated, activityId);
      await saveSessionWithEvent(repos, updated, 'ACTIVITY_COMPLETED', {
        evidenceIds: body.evidenceIds,
        score: body.score ?? null,
      }, activityId);
      await acceptActiveRecommendation(repos, updated);

      if (updated.state === 'COMPLETED' && session.state !== 'COMPLETED') {
        await repos.learningSessionEvent.create(createLearningSessionEvent(updated, 'SESSION_COMPLETED'));
      }

      res.json({ data: { session: updated, nextAction: learningSessionService.nextAction(updated) } });
    } catch (error) {
      handleRouteError(error, res, 'Failed to complete learning session activity');
    }
  });

  router.post('/:id/activities/:activityId/skip', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = skipActivitySchema.parse(req.body);
      const session = await getOwnedSession(repos, req.studentId!, req.params.id as UUID);
      const activityId = req.params.activityId as UUID;
      const updated = learningSessionService.skipActivity(session, activityId, body);

      await saveSessionWithEvent(repos, updated, 'ACTIVITY_SKIPPED', {
        reason: body.reason ?? null,
      }, activityId);
      await acceptActiveRecommendation(repos, updated);

      if (updated.state === 'COMPLETED' && session.state !== 'COMPLETED') {
        await repos.learningSessionEvent.create(createLearningSessionEvent(updated, 'SESSION_COMPLETED'));
      }

      res.json({ data: { session: updated, nextAction: learningSessionService.nextAction(updated) } });
    } catch (error) {
      handleRouteError(error, res, 'Failed to skip learning session activity');
    }
  });

  return router;
}

async function getOwnedSession(
  repos: RepositoryRegistry,
  studentId: UUID,
  sessionId: UUID
): Promise<LearningSession> {
  const session = await repos.learningSession.findById(sessionId);
  if (!session || session.studentId !== studentId) {
    throw new NotFoundError('Learning session not found');
  }
  return session;
}

async function saveSessionWithEvent(
  repos: RepositoryRegistry,
  session: LearningSession,
  type: LearningSessionEventType,
  payload: Record<string, unknown>,
  activityId: UUID | null = null
): Promise<void> {
  await repos.learningSession.update(session);
  await repos.learningSessionEvent.create(createLearningSessionEvent(session, type, payload, activityId));
}

async function acceptActiveRecommendation(
  repos: RepositoryRegistry,
  session: LearningSession
): Promise<void> {
  const active = session.activities.find((activity) => activity.id === session.activeActivityId);
  if (active?.recommendationId) {
    await repos.recommendation.accept(active.recommendationId);
  }
}

async function completeRecommendationForActivity(
  repos: RepositoryRegistry,
  session: LearningSession,
  activityId: UUID
): Promise<void> {
  const activity = session.activities.find((candidate) => candidate.id === activityId);
  if (activity?.recommendationId) {
    await repos.recommendation.complete(activity.recommendationId);
  }
}

function handleRouteError(error: unknown, res: Response, fallbackMessage: string): void {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid request', details: error.flatten() } });
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } });
    return;
  }

  console.error(fallbackMessage, error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: fallbackMessage } });
}

export default createLearningSessionRoutes;

