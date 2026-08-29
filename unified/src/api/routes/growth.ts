// Growth Intelligence API Routes
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  ingestGrowthEvidence,
  updateSkillState,
  checkMilestones,
  computeGrowth,
  buildGrowthSnapshot,
  detectGrowthEvents,
} from '../../engine/growth/index.js';
import {
  GrowthSkillEvidence,
  GrowthSkillState,
  GrowthMilestone,
  SkillObservation,
  GrowthResult,
  GrowthDifficultyLevel,
  GrowthEvidenceType,
} from '../../domain/types.js';

const router = Router();

/**
 * POST /api/growth/ingest
 * Ingest growth evidence
 */
const ingestSchema = z.object({
  studentId: z.string().uuid(),
  source: z.enum(['correctness', 'complexity', 'code_quality', 'reasoning', 'consistency', 'understanding', 'debugging', 'adaptive_learning', 'review']),
  sourceRecordId: z.string(),
  skillId: z.string(),
  evidenceType: z.enum(['DIRECT', 'INDIRECT', 'DETERMINISTIC', 'INFERRED', 'SELF_REPORTED', 'AI_ASSISTED']),
  outcome: z.enum(['positive', 'negative', 'neutral']),
  strength: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  timestamp: z.string().datetime(),
  challengeContext: z.record(z.any()).optional(),
  roleContext: z.string().optional(),
  transferContext: z.object({
    isTransferAttempt: z.boolean(),
    baseContext: z.string().optional(),
    novelContext: z.string().optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

router.post('/ingest', async (req: Request, res: Response) => {
  try {
    const evidence = ingestGrowthEvidence(req.body);
    res.json({ evidence });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/growth/update-state
 * Update skill state from evidence
 */
const updateStateSchema = z.object({
  currentState: z.any().nullable(), // GrowthSkillState
  newEvidence: z.array(z.any()), // GrowthSkillEvidence[]
  allEvidence: z.array(z.any()), // GrowthSkillEvidence[]
});

router.post('/update-state', async (req: Request, res: Response) => {
  try {
    const { currentState, newEvidence, allEvidence } = updateStateSchema.parse(req.body);
    const state = updateSkillState(currentState, newEvidence, allEvidence);
    res.json({ state });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/growth/check-milestones
 * Check for milestones
 */
const milestonesSchema = z.object({
  studentId: z.string().uuid(),
  skillId: z.string(),
  previousState: z.any().nullable(), // GrowthSkillState
  currentState: z.any(), // GrowthSkillState
  evidence: z.array(z.any()), // GrowthSkillEvidence[]
});

router.post('/check-milestones', async (req: Request, res: Response) => {
  try {
    const { studentId, skillId, previousState, currentState, evidence } = milestonesSchema.parse(req.body);
    const milestones = checkMilestones(studentId, skillId, previousState, currentState, evidence);
    res.json({ milestones });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/growth/compute
 * Compute growth between two observations
 */
const computeSchema = z.object({
  baseline: z.object({
    skillId: z.string(),
    observedAt: z.string().datetime(),
    value: z.number(),
    evidence: z.array(z.object({
      evidenceId: z.string(),
      source: z.string(),
      difficulty: z.string(),
      successful: z.boolean(),
      demonstratesComplexityReasoning: z.boolean(),
    })),
    calculationVersion: z.string(),
    sourceType: z.string(),
    assessmentType: z.string(),
  }),
  current: z.object({
    skillId: z.string(),
    observedAt: z.string().datetime(),
    value: z.number(),
    evidence: z.array(z.object({
      evidenceId: z.string(),
      source: z.string(),
      difficulty: z.string(),
      successful: z.boolean(),
      demonstratesComplexityReasoning: z.boolean(),
    })),
    calculationVersion: z.string(),
    sourceType: z.string(),
    assessmentType: z.string(),
  }),
});

router.post('/compute', async (req: Request, res: Response) => {
  try {
    const { baseline, current } = computeSchema.parse(req.body);
    const result = computeGrowth(
      normalizeSkillObservation(baseline),
      normalizeSkillObservation(current)
    );
    res.json({ result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

function normalizeSkillObservation(input: z.infer<typeof computeSchema>['baseline']): SkillObservation {
  return {
    ...input,
    sourceType: normalizeObservationSource(input.sourceType),
    evidence: input.evidence.map(evidence => ({
      id: evidence.evidenceId,
      type: normalizeGrowthEvidenceType(evidence.source),
      skillId: input.skillId,
      observedAt: input.observedAt,
      difficulty: normalizeGrowthDifficulty(evidence.difficulty),
      demonstratesComplexityReasoning: evidence.demonstratesComplexityReasoning,
      successful: evidence.successful,
    })),
  };
}

function normalizeObservationSource(sourceType: string): SkillObservation['sourceType'] {
  if (sourceType === 'DIAGNOSTIC' || sourceType === 'ASSESSMENT' || sourceType === 'AGGREGATED_SIGNAL') {
    return sourceType;
  }
  return 'AGGREGATED_SIGNAL';
}

function normalizeGrowthEvidenceType(source: string): GrowthEvidenceType {
  const normalized = source.toUpperCase();
  if (normalized === 'DIAGNOSTIC' || normalized === 'ASSESSMENT') return normalized;
  if (normalized === 'DEBUGGING' || normalized === 'DEBUGGING_TASK') return 'DEBUGGING_TASK';
  if (normalized === 'UNDERSTANDING' || normalized === 'UNDERSTANDING_CHECK') return 'UNDERSTANDING_CHECK';
  if (normalized === 'ADAPTIVE' || normalized === 'ADAPTIVE_CHALLENGE') return 'ADAPTIVE_CHALLENGE';
  return 'CHALLENGE_SUBMISSION';
}

function normalizeGrowthDifficulty(difficulty: string): GrowthDifficultyLevel | undefined {
  const normalized = difficulty.toUpperCase();
  if (normalized === 'BEGINNER' || normalized === 'INTERMEDIATE' || normalized === 'ADVANCED' || normalized === 'EXPERT') {
    return normalized;
  }
  return undefined;
}

/**
 * POST /api/growth/snapshot
 * Build growth snapshot
 */
const snapshotSchema = z.object({
  studentId: z.string().uuid(),
  skillStates: z.array(z.any()), // GrowthSkillState[]
  milestones: z.array(z.any()), // GrowthMilestone[]
});

router.post('/snapshot', async (req: Request, res: Response) => {
  try {
    const { studentId, skillStates, milestones } = snapshotSchema.parse(req.body);
    const snapshot = buildGrowthSnapshot(studentId, skillStates, milestones);
    res.json({ snapshot });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/growth/events
 * Detect growth events
 */
const eventsSchema = z.object({
  studentId: z.string().uuid(),
  skillId: z.string(),
  previousState: z.any().nullable(), // GrowthSkillState
  currentState: z.any(), // GrowthSkillState
  milestones: z.array(z.any()), // GrowthMilestone[]
});

router.post('/events', async (req: Request, res: Response) => {
  try {
    const { studentId, skillId, previousState, currentState, milestones } = eventsSchema.parse(req.body);
    const events = detectGrowthEvents(studentId, skillId, previousState, currentState, milestones);
    res.json({ events });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

export default router;
