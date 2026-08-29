// Understanding Check API Routes
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  computeDimensionProfile,
  generateProbesForDimension,
  evaluateResponse,
  buildProfile,
  generateReport,
  toPublicProbe,
} from '../../engine/understanding/index.js';
import {
  UnderstandingDimension,
  MentalModel,
  EvidenceItem,
  UnderstandingProfile,
  Probe,
} from '../../domain/types.js';

const router = Router();

/**
 * POST /api/understanding/probes
 * Generate probes for a dimension
 */
const probesSchema = z.object({
  dimension: z.enum([
    'problem', 'algorithm', 'data_structure', 'state', 'control_flow',
    'invariant', 'correctness', 'complexity', 'space', 'edge_case',
    'debugging', 'adaptation', 'transfer'
  ]),
  mentalModel: z.object({
    algorithm: z.string(),
    algorithm_steps: z.array(z.string()),
    data_structures: z.array(z.string()),
    important_variables: z.array(z.string()),
    state_transitions: z.array(z.string()),
    control_flow_summary: z.string(),
    candidate_invariants: z.array(z.string()),
    correctness_argument: z.string(),
    complexity: z.object({
      time: z.string(),
      space: z.string(),
      justification: z.string(),
    }),
    relevant_edge_cases: z.array(z.string()),
    tradeoffs: z.array(z.string()),
    assumptions: z.array(z.string()),
  }),
  existingEvidence: z.array(z.object({
    id: z.string(),
    probe_id: z.string(),
    dimension: z.string(),
    concept: z.string(),
    probe_type: z.string(),
    expected_evidence: z.string(),
    observed_evidence: z.string(),
    result: z.enum(['correct', 'partially_correct', 'incorrect', 'ambiguous', 'no_response']),
    confidence: z.number(),
  })),
  maxProbes: z.number().int().positive().default(5),
});

router.post('/probes', async (req: Request, res: Response) => {
  try {
    const { dimension, mentalModel, existingEvidence, maxProbes } = probesSchema.parse(req.body);
    const probes = generateProbesForDimension(
      dimension,
      normalizeMentalModel(mentalModel),
      normalizeEvidenceItems(existingEvidence),
      maxProbes
    );
    const publicProbes = probes.map(toPublicProbe);
    res.json({ probes: publicProbes });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/understanding/evaluate
 * Evaluate student response to a probe
 */
const evaluateSchema = z.object({
  probe: z.object({
    id: z.string(),
    assessment_id: z.string(),
    target_dimension: z.string(),
    target_concept: z.string(),
    probe_type: z.string(),
    difficulty: z.string(),
    purpose: z.string(),
    question: z.string(),
    grounding: z.any(),
    expected_reasoning: z.string(),
    evaluation_criteria: z.array(z.string()),
    expected_evidence: z.string(),
    created_at: z.string(),
  }),
  studentResponse: z.string(),
});

router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const { probe, studentResponse } = evaluateSchema.parse(req.body);
    const result = evaluateResponse(normalizeProbe(probe), studentResponse);
    res.json({ result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/understanding/profile
 * Build understanding profile from evidence
 */
const profileSchema = z.object({
  assessmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  challengeId: z.string().uuid(),
  evidence: z.array(z.object({
    id: z.string(),
    probe_id: z.string(),
    dimension: z.string(),
    concept: z.string(),
    probe_type: z.string(),
    expected_evidence: z.string(),
    observed_evidence: z.string(),
    result: z.enum(['correct', 'partially_correct', 'incorrect', 'ambiguous', 'no_response']),
    confidence: z.number(),
  })),
  probesAsked: z.number().int().nonnegative(),
  maxProbes: z.number().int().positive().default(12),
});

router.post('/profile', async (req: Request, res: Response) => {
  try {
    const { assessmentId, studentId, challengeId, evidence, probesAsked, maxProbes } = profileSchema.parse(req.body);
    const normalizedEvidence = normalizeEvidenceItems(evidence, assessmentId);
    const profile = buildProfile(assessmentId, studentId, challengeId, normalizedEvidence, probesAsked, maxProbes);
    const report = generateReport(profile, normalizedEvidence);
    res.json({ profile, report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/understanding/dimension-profile
 * Compute dimension profile from evidence
 */
const dimProfileSchema = z.object({
  dimension: z.enum([
    'problem', 'algorithm', 'data_structure', 'state', 'control_flow',
    'invariant', 'correctness', 'complexity', 'space', 'edge_case',
    'debugging', 'adaptation', 'transfer'
  ]),
  evidence: z.array(z.object({
    id: z.string(),
    probe_id: z.string(),
    dimension: z.string(),
    concept: z.string(),
    probe_type: z.string(),
    expected_evidence: z.string(),
    observed_evidence: z.string(),
    result: z.enum(['correct', 'partially_correct', 'incorrect', 'ambiguous', 'no_response']),
    confidence: z.number(),
  })),
});

router.post('/dimension-profile', async (req: Request, res: Response) => {
  try {
    const { dimension, evidence } = dimProfileSchema.parse(req.body);
    const profile = computeDimensionProfile(dimension, normalizeEvidenceItems(evidence));
    res.json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

function normalizeMentalModel(input: z.infer<typeof probesSchema>['mentalModel']): MentalModel {
  return {
    problem_objective: input.algorithm || 'Understand the submitted solution',
    constraints: input.assumptions,
    algorithm: input.algorithm,
    algorithm_steps: input.algorithm_steps,
    data_structures: input.data_structures,
    important_variables: input.important_variables.map(variable => ({
      name: variable,
      meaning: variable,
      changes_when: 'during execution',
    })),
    state_transitions: input.state_transitions,
    control_flow_summary: input.control_flow_summary,
    candidate_invariants: input.candidate_invariants,
    correctness_argument: input.correctness_argument,
    complexity: input.complexity,
    relevant_edge_cases: input.relevant_edge_cases,
    tradeoffs: input.tradeoffs,
    assumptions: input.assumptions,
    derivedFromExistingAnalysis: false,
  };
}

function normalizeProbe(input: z.infer<typeof evaluateSchema>['probe']): Probe {
  return {
    ...input,
    target_dimension: input.target_dimension as UnderstandingDimension,
    probe_type: input.probe_type as Probe['probe_type'],
    difficulty: input.difficulty as Probe['difficulty'],
    grounding: input.grounding ?? {},
  };
}

function normalizeEvidenceItems(
  evidence: Array<{
    id: string;
    probe_id: string;
    dimension: string;
    concept: string;
    probe_type: string;
    expected_evidence: string;
    observed_evidence: string;
    result: EvidenceItem['result'];
    confidence: number;
  }>,
  assessmentId = 'adhoc-assessment'
): EvidenceItem[] {
  return evidence.map(item => ({
    ...item,
    assessment_id: assessmentId,
    dimension: item.dimension as UnderstandingDimension,
    probe_type: item.probe_type as EvidenceItem['probe_type'],
    question: '',
    student_response: item.observed_evidence,
    ai_provider_used: null,
    created_at: new Date().toISOString(),
  }));
}

export default router;
