// Role Skill Gap Analysis API Routes
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  analyzeSkillGaps,
  computeOverallReadiness,
  identifyBlockersAndStrengths,
  buildGapProfile,
  generateGapRecommendations,
  type RoleSkillRequirement,
  type StudentSkillSignal,
  SignalSkillState,
  SignalTrend,
} from '../../engine/gap/index.js';
import {
  RoleSkillGap,
  RoleSkillGapProfile,
} from '../../domain/types.js';

const router = Router();

/**
 * POST /api/gap/analyze
 * Analyze skill gaps for a student against a role
 */
const analyzeSchema = z.object({
  studentId: z.string().uuid(),
  roleId: z.string().uuid(),
  roleVersion: z.number().int().positive().default(1),
  roleRequirements: z.array(z.object({
    skillId: z.string(),
    skillName: z.string(),
    targetLevel: z.string(),
    targetScore: z.number().min(0).max(100),
    importance: z.enum(['CORE', 'IMPORTANT', 'SUPPORTING']),
    dependencies: z.array(z.string()),
  })),
  studentSignals: z.record(z.object({
    skillId: z.string(),
    signal: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    state: z.nativeEnum(SignalSkillState),
    trend: z.nativeEnum(SignalTrend),
    evidenceCount: z.number().int().nonnegative(),
  })),
});

router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { studentId, roleId, roleVersion, roleRequirements, studentSignals } = analyzeSchema.parse(req.body);
    const signalsMap = new Map(Object.entries(studentSignals)) as Map<string, StudentSkillSignal>;
    const gaps = analyzeSkillGaps(studentId, roleId, roleVersion, roleRequirements, signalsMap);
    const readiness = computeOverallReadiness(gaps);
    const { blockers, strengths } = identifyBlockersAndStrengths(gaps);
    const recommendations = generateGapRecommendations(gaps);
    res.json({ gaps, readiness, blockers, strengths, recommendations });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/gap/profile
 * Build full gap profile
 */
const profileSchema = z.object({
  studentId: z.string().uuid(),
  roleId: z.string().uuid(),
  roleVersion: z.number().int().positive().default(1),
  gaps: z.array(z.any()), // RoleSkillGap[]
  modelVersion: z.string().default('v1'),
});

router.post('/profile', async (req: Request, res: Response) => {
  try {
    const { studentId, roleId, roleVersion, gaps, modelVersion } = profileSchema.parse(req.body);
    const profile = buildGapProfile(studentId, roleId, roleVersion, gaps, modelVersion);
    res.json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/gap/recommendations
 * Generate recommendations from gaps
 */
const recommendationsSchema = z.object({
  gaps: z.array(z.any()), // RoleSkillGap[]
});

router.post('/recommendations', async (req: Request, res: Response) => {
  try {
    const { gaps } = recommendationsSchema.parse(req.body);
    const recommendations = generateGapRecommendations(gaps);
    res.json({ recommendations });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

export default router;