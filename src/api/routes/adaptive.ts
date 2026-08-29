// Adaptive Challenge Engine API Routes
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  computeSkillState,
  selectNextChallenge,
  initializePathState,
  evaluateStageTransition,
  advanceStage,
  getStageInfo,
  getStageChallengeProfile,
  DEFAULT_WEIGHTS,
  type SelectionObjectiveWeights,
} from '../../engine/adaptive/index.js';
import {
  ChallengeMetadata,
  ChallengeHealth,
  SkillEvidencePoint,
  StudentModel,
  AdaptiveSkillState,
  SelectionContext,
  PathStage,
  CompletedChallengeRecord,
  CurriculumConstraints,
  ManualOverride,
  AdaptiveEvidenceOutcome,
} from '../../domain/types.js';

const router = Router();

/**
 * POST /api/adaptive/skill-state
 * Compute skill state from evidence
 */
const skillStateSchema = z.object({
  skillId: z.string(),
  evidence: z.array(z.object({
    skillId: z.string(),
    outcome: z.enum(['SUCCESS', 'FAILURE', 'PARTIAL']),
    timestamp: z.string(),
    challengeId: z.string(),
    challengeFamily: z.string().optional(),
    transferGroup: z.string().optional(),
    dimensionsExercised: z.record(z.number()).optional(),
    correctness: z.number().optional(),
    reasoningScore: z.number().optional(),
    consistencyScore: z.number().optional(),
    understandingScore: z.number().optional(),
    debuggingScore: z.number().optional(),
    qualityScore: z.number().optional(),
    hintsUsed: z.number().optional(),
    attempts: z.number().optional(),
    timeToSolveSeconds: z.number().optional(),
  })),
  allChallenges: z.record(z.any()).optional(),
});

router.post('/skill-state', async (req: Request, res: Response) => {
  try {
    const { skillId, evidence, allChallenges } = skillStateSchema.parse(req.body);
    const challengeMap = new Map(Object.entries(allChallenges || {})) as Map<string, ChallengeMetadata>;
    const state = computeSkillState(skillId, evidence as SkillEvidencePoint[], challengeMap);
    res.json({ state });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/adaptive/next-challenge
 * Select next best challenge for student
 */
const nextChallengeSchema = z.object({
  candidates: z.array(z.any()), // ChallengeMetadata[]
  healthMap: z.record(z.any()), // ChallengeHealth
  student: z.object({
    studentId: z.string().uuid(),
    targetRole: z.string().nullable().optional(),
    skills: z.record(z.any()),
    evidenceBySkill: z.record(z.array(z.any())),
    completedChallenges: z.array(z.any()),
    curriculumConstraints: z.object({
      requiredCurriculumTags: z.array(z.string()),
    }).optional(),
    manualOverrides: z.array(z.any()).optional(),
    studentModelVersion: z.string(),
  }),
  context: z.object({
    language: z.string().optional(),
    availableTimeMinutes: z.number().optional(),
    mode: z.enum(['PRACTICE', 'ASSESSMENT', 'INTERVIEW']).default('PRACTICE'),
    requestedRepetitionReason: z.enum(['REMEDIATION', 'REASSESSMENT', 'MASTERY_CONFIRMATION', 'SPACED_RETENTION', 'ASSESSMENT_RETAKE', 'STANDARD']).optional(),
  }),
  weights: z.any().optional(), // SelectionObjectiveWeights
});

router.post('/next-challenge', async (req: Request, res: Response) => {
  try {
    const { candidates, healthMap, student, context, weights } = nextChallengeSchema.parse(req.body);
    const health = new Map(Object.entries(healthMap)) as Map<string, ChallengeHealth>;
    // Cast student to match StudentModel interface
    const studentModel: StudentModel = {
      studentId: student.studentId,
      targetRole: student.targetRole ?? null,
      skills: student.skills as Record<string, AdaptiveSkillState>,
      evidenceBySkill: student.evidenceBySkill as Record<string, SkillEvidencePoint[]>,
      completedChallenges: student.completedChallenges as CompletedChallengeRecord[],
      curriculumConstraints: student.curriculumConstraints,
      manualOverrides: student.manualOverrides,
      studentModelVersion: student.studentModelVersion,
    };
    const result = selectNextChallenge(candidates, health, studentModel, context, weights || DEFAULT_WEIGHTS);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/adaptive/path-state/initialize
 * Initialize path state for new student
 */
router.post('/path-state/initialize', async (req: Request, res: Response) => {
  try {
    const { studentId } = z.object({ studentId: z.string().uuid() }).parse(req.body);
    const state = initializePathState(studentId);
    res.json({ state });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/adaptive/path-state/evaluate
 * Evaluate if student should advance stage
 */
const evaluateStageSchema = z.object({
  currentState: z.any(), // AdaptivePathState
  skills: z.record(z.any()), // AdaptiveSkillState
  completedChallenges: z.array(z.any()),
});

router.post('/path-state/evaluate', async (req: Request, res: Response) => {
  try {
    const { currentState, skills, completedChallenges } = evaluateStageSchema.parse(req.body);
    const result = evaluateStageTransition(currentState, skills, completedChallenges);
    res.json({ result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/adaptive/path-state/advance
 * Advance to next stage
 */
const advanceSchema = z.object({
  state: z.any(), // AdaptivePathState
  nextStage: z.enum(['FOUNDATION', 'PRACTICE', 'VARIATION', 'TRANSFER', 'APPLICATION', 'ADVANCED', 'ROLE_ASSESSMENT']),
  reason: z.string(),
  challengeId: z.string().uuid().optional(),
});

router.post('/path-state/advance', async (req: Request, res: Response) => {
  try {
    const { state, nextStage, reason, challengeId } = advanceSchema.parse(req.body);
    const newState = advanceStage(state, nextStage, reason, challengeId);
    res.json({ state: newState });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * GET /api/adaptive/stage-info/:stage
 * Get stage information
 */
router.get('/stage-info/:stage', async (req: Request, res: Response) => {
  try {
    const stage = req.params.stage as PathStage;
    const info = getStageInfo(stage);
    const profile = getStageChallengeProfile(stage);
    res.json({ stage, info, profile });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid stage' });
  }
});

export default router;