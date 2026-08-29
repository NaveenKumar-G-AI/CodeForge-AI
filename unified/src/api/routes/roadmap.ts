/**
 * CodeForge AI — Roadmap API Routes (Part 6)
 */

import { Router, Response } from 'express';
import { RepositoryRegistry } from '../../repositories/index.js';
import { AuthenticatedRequest, requireStudentOrAbove } from '../middleware/auth.js';
import { iso8601 } from '../../domain/types.js';
import type { UUID, ReadinessReport, DailyPlan, WeeklyPlan, Milestone } from '../../domain/types.js';

export function createRoadmapRoutes(repos: RepositoryRegistry): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireStudentOrAbove());

  // GET /api/v1/roadmap
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;

    const [milestones, skillStates, evidence] = await Promise.all([
      repos.milestone.findByStudent(studentId),
      repos.studentSkillState.findByStudent(studentId),
      repos.evidence.findByStudent(studentId, 100),
    ]);

    // Build roadmap view
    const roadmap = {
      milestones: milestones.map(m => ({
        ...m,
        progress: m.progress,
        status: m.status,
      })),
      skillSummary: skillStates.map(s => ({
        skillId: s.skillId,
        masteryState: s.masteryState,
        masteryScore: s.masteryScore,
        confidenceScore: s.confidenceScore,
        evidenceCount: s.evidenceCount,
        trend: s.trend,
        isStale: s.masteryState === 'STALE',
      })),
      totalEvidence: evidence.length,
    };

    res.json({ data: roadmap });
  });

  // GET /api/v1/roadmap/milestones
  router.get('/milestones', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const milestones = await repos.milestone.findByStudent(studentId);

    res.json({ data: milestones });
  });

  // GET /api/v1/roadmap/readiness
  router.get('/readiness', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;

    // This would call the roadmap service
    // Simplified for now
    const skillStates = await repos.studentSkillState.findByStudent(studentId);
    const skillMap = new Map(skillStates.map(s => [s.skillId, s]));

    const readiness: ReadinessReport = {
      studentId,
      roleId: null,
      overallReadiness: 'NOT_STARTED',
      skillReadiness: {},
      blockingGaps: [],
      estimatedDaysToReady: null,
      generatedAt: iso8601(new Date().toISOString()),
    };

    // Compute readiness from skill states
    let totalScore = 0;
    let count = 0;
    for (const [skillId, state] of skillMap) {
      const score = state.masteryScore / 100 * (0.5 + state.confidenceScore * 0.5);
      totalScore += score;
      count++;
      readiness.skillReadiness[skillId] = {
        state: score > 0.8 ? 'READY' : score > 0.6 ? 'APPROACHING_READY' : score > 0.4 ? 'DEVELOPING' : 'NOT_STARTED',
        score,
      };
    }

    if (count > 0) {
      const avg = totalScore / count;
      if (avg > 0.8) readiness.overallReadiness = 'READY';
      else if (avg > 0.6) readiness.overallReadiness = 'APPROACHING_READY';
      else if (avg > 0.4) readiness.overallReadiness = 'DEVELOPING';
      else if (avg > 0.1) readiness.overallReadiness = 'FOUNDATION_BUILDING';
    }

    res.json({ data: readiness });
  });

  // GET /api/v1/roadmap/plan/daily
  router.get('/plan/daily', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    // This would call the roadmap service to generate a plan
    // Simplified for now
    const plan: DailyPlan = {
      date: date.toISOString().split('T')[0],
      studentId,
      activities: [],
      totalEstimatedMinutes: 0,
    };

    res.json({ data: plan });
  });

  // GET /api/v1/roadmap/plan/weekly
  router.get('/plan/weekly', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const weekStart = req.query.weekStart
      ? new Date(req.query.weekStart as string)
      : (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d; })();

    // This would call the roadmap service to generate a plan
    // Simplified for now
    const plan: WeeklyPlan = {
      weekStart: weekStart.toISOString().split('T')[0],
      studentId,
      dailyPlans: [],
      focusSkills: [],
      reviewSkills: [],
    };

    res.json({ data: plan });
  });

  // POST /api/v1/roadmap/recalculate
  router.post('/recalculate', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const { trigger = 'MANUAL' } = req.body;

    // This would trigger a full roadmap recalculation
    // Simplified for now
    res.json({
      data: {
        recalculated: true,
        trigger,
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
}

export default createRoadmapRoutes;
