// Role Readiness Engine API Routes
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  computeReadiness,
  generateReadinessExplanation,
  getReadinessNextSteps,
} from '../../engine/readiness/index.js';
import { ReadinessResult, SignalSkillState, SignalTrend } from '../../domain/types.js';

const router = Router();

/**
 * POST /api/readiness/compute
 * Compute role readiness
 */
const computeSchema = z.object({
  studentId: z.string().uuid(),
  roleId: z.string().uuid(),
  roleRequirements: z.array(z.object({
    skillId: z.string(),
    skillName: z.string(),
    targetMastery: z.number().min(0).max(100),
    isCore: z.boolean(),
  })),
  studentSkills: z.record(z.object({
    signal: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    state: z.enum(['UNKNOWN', 'INTRODUCED', 'DEVELOPING', 'PRACTICED', 'PROFICIENT', 'MASTERED', 'AT_RISK', 'REGRESSING', 'UNCERTAIN']),
    trend: z.enum(['IMPROVING', 'STABLE', 'DECLINING', 'VOLATILE', 'INSUFFICIENT_DATA']),
    evidenceCount: z.number().int().nonnegative(),
  })),
});

router.post('/compute', async (req: Request, res: Response) => {
  try {
    const { studentId, roleId, roleRequirements, studentSkills } = computeSchema.parse(req.body);
    const skillsMap = new Map(Object.entries(studentSkills).map(([skillId, skill]) => [
      skillId,
      {
        ...skill,
        state: SignalSkillState[skill.state],
        trend: SignalTrend[skill.trend],
      },
    ]));
    const result = computeReadiness({ studentId, roleId, roleRequirements, studentSkills: skillsMap });
    const explanation = generateReadinessExplanation(result);
    const nextSteps = getReadinessNextSteps(result);
    res.json({ result, explanation, nextSteps });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/readiness/explain
 * Generate explanation for readiness result
 */
const explainSchema = z.object({
  result: z.any(), // ReadinessResult
});

router.post('/explain', async (req: Request, res: Response) => {
  try {
    const { result } = explainSchema.parse(req.body);
    const explanation = generateReadinessExplanation(result);
    res.json({ explanation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/readiness/next-steps
 * Get next steps for improving readiness
 */
const nextStepsSchema = z.object({
  result: z.any(), // ReadinessResult
});

router.post('/next-steps', async (req: Request, res: Response) => {
  try {
    const { result } = nextStepsSchema.parse(req.body);
    const nextSteps = getReadinessNextSteps(result);
    res.json({ nextSteps });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

export default router;
