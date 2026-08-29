// Skill Signal Intelligence API Routes
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  normalizeEvidence,
  aggregateEvidence,
  deriveSkillState,
  buildSkillSignal,
  generateSignalExplanation,
} from '../../engine/signal/index.js';
import {
  RawEvidenceInput,
  NormalizedEvidence,
  AggregationResult,
  SkillSignal,
  SignalEvidenceType,
  SignalAssessmentTier,
} from '../../domain/types.js';

const router = Router();

/**
 * POST /api/signal/normalize
 * Normalize raw evidence to 0-1 scale
 */
const normalizeSchema = z.object({
  sourceType: z.enum([
    'CHALLENGE_RESULT', 'CORRECTNESS_RESULT', 'COMPLEXITY_RESULT',
    'QUALITY_RESULT', 'REASONING_RESULT', 'DEBUGGING_RESULT',
    'UNDERSTANDING_RESULT', 'TRANSFER_RESULT', 'ASSESSMENT_RESULT'
  ]),
  sourceId: z.string(),
  studentId: z.string().uuid(),
  skillIds: z.array(z.string()),
  payload: z.any(),
  difficulty: z.number().min(0).max(1).optional(),
  contextGroup: z.string().optional(),
  assessmentTier: z.enum(['PRACTICE', 'ASSESSMENT', 'INTERVIEW', 'PROJECT', 'DIAGNOSTIC']).optional(),
  occurredAt: z.string().datetime(),
  evidenceVersion: z.number().int().positive().optional(),
  policyVersion: z.string().optional(),
});

router.post('/normalize', async (req: Request, res: Response) => {
  try {
    const input = normalizeSchema.parse(req.body);
    const normalized = normalizeEvidence(normalizeRawEvidenceInput(input), input.policyVersion);
    res.json({ normalized });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/signal/aggregate
 * Aggregate normalized evidence
 */
const aggregateSchema = z.object({
  studentId: z.string().uuid(),
  skillId: z.string(),
  evidence: z.array(z.any()), // NormalizedEvidence[]
  policyVersion: z.string().optional(),
});

router.post('/aggregate', async (req: Request, res: Response) => {
  try {
    const { studentId, skillId, evidence, policyVersion } = aggregateSchema.parse(req.body);
    const result = aggregateEvidence(studentId, skillId, evidence, policyVersion || 'v1');
    res.json({ result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/signal/derive-state
 * Derive skill state from aggregation
 */
const deriveSchema = z.object({
  aggregation: z.any(), // AggregationResult
  previousState: z.any().nullable(), // SignalSkillState
});

router.post('/derive-state', async (req: Request, res: Response) => {
  try {
    const { aggregation, previousState } = deriveSchema.parse(req.body);
    const result = deriveSkillState(aggregation, previousState);
    res.json({ result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/signal/build
 * Build skill signal from aggregation
 */
const buildSchema = z.object({
  studentId: z.string().uuid(),
  skillId: z.string(),
  aggregation: z.any(), // AggregationResult
  previousSignal: z.any().nullable(), // SkillSignal
});

router.post('/build', async (req: Request, res: Response) => {
  try {
    const { studentId, skillId, aggregation, previousSignal } = buildSchema.parse(req.body);
    const signal = buildSkillSignal(studentId, skillId, aggregation, previousSignal);
    const explanation = generateSignalExplanation(signal);
    res.json({ signal, explanation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/signal/full-pipeline
 * Run full signal pipeline: normalize -> aggregate -> derive -> build
 */
const pipelineSchema = z.object({
  studentId: z.string().uuid(),
  skillId: z.string(),
  rawEvidence: z.array(z.object({
    sourceType: z.enum([
      'CHALLENGE_RESULT', 'CORRECTNESS_RESULT', 'COMPLEXITY_RESULT',
      'QUALITY_RESULT', 'REASONING_RESULT', 'DEBUGGING_RESULT',
      'UNDERSTANDING_RESULT', 'TRANSFER_RESULT', 'ASSESSMENT_RESULT'
    ]),
    sourceId: z.string(),
    payload: z.any(),
    difficulty: z.number().min(0).max(1).optional(),
    contextGroup: z.string().optional(),
    assessmentTier: z.enum(['PRACTICE', 'ASSESSMENT', 'INTERVIEW', 'PROJECT', 'DIAGNOSTIC']).optional(),
    occurredAt: z.string().datetime(),
    evidenceVersion: z.number().int().positive().optional(),
  })),
  policyVersion: z.string().optional(),
  previousSignal: z.any().nullable(),
});

router.post('/full-pipeline', async (req: Request, res: Response) => {
  try {
    const { studentId, skillId, rawEvidence, policyVersion, previousSignal } = pipelineSchema.parse(req.body);

    // Normalize all evidence
    const allNormalized: any[] = [];
    for (const ev of rawEvidence) {
      const normalized = normalizeEvidence(normalizeRawEvidenceInput({
        sourceType: ev.sourceType,
        sourceId: ev.sourceId,
        studentId,
        skillIds: [skillId],
        payload: ev.payload,
        difficulty: ev.difficulty,
        contextGroup: ev.contextGroup,
        assessmentTier: ev.assessmentTier,
        occurredAt: ev.occurredAt,
        evidenceVersion: ev.evidenceVersion,
      }), policyVersion);
      allNormalized.push(...normalized);
    }

    // Aggregate
    const aggregation = aggregateEvidence(studentId, skillId, allNormalized, policyVersion || 'v1');

    // Derive state
    const derived = deriveSkillState(aggregation, previousSignal?.state ?? null);

    // Build signal
    const signal = buildSkillSignal(studentId, skillId, aggregation, previousSignal);
    const explanation = generateSignalExplanation(signal);

    res.json({ signal, explanation, aggregation, derived });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

function normalizeRawEvidenceInput(input: {
  sourceType: string;
  sourceId: string;
  studentId: string;
  skillIds: string[];
  payload?: any;
  difficulty?: number;
  contextGroup?: string;
  assessmentTier?: string;
  occurredAt: string;
  evidenceVersion?: number;
  policyVersion?: string;
}): RawEvidenceInput {
  return {
    ...input,
    payload: input.payload ?? {},
    sourceType: SignalEvidenceType[input.sourceType as keyof typeof SignalEvidenceType],
    assessmentTier: input.assessmentTier
      ? SignalAssessmentTier[input.assessmentTier as keyof typeof SignalAssessmentTier]
      : undefined,
  };
}

export default router;
