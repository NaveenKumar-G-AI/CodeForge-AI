// Correctness Analysis API Routes
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  classify,
  computeRequirementCoverage,
  computeDelta,
  type CorrectnessExecutionEvidence,
  type Requirement,
  type StaticFinding,
  type DeterministicVerdict,
  type SubmissionRef,
  type CompilationEvidence,
  type CorrectnessTestResult,
  type CorrectnessTestOutcome,
  type MismatchType,
  type SupportedLanguage,
  type UUID,
  type ISO8601,
} from '../../engine/correctness/index.js';

const router = Router();

/**
 * POST /api/correctness/classify
 * Classify submission correctness from execution evidence
 */
const classifySchema = z.object({
  submissionId: z.string().uuid(),
  submissionVersion: z.string().default('1'),
  problemId: z.string().uuid(),
  userId: z.string().uuid(),
  language: z.enum(['python', 'javascript', 'typescript']),
  compilation: z.object({
    attempted: z.boolean(),
    success: z.boolean(),
    diagnostics: z.array(z.string()),
  }).nullable(),
  tests: z.object({
    totalAvailable: z.number().int().nonnegative(),
    results: z.array(z.object({
      id: z.string(),
      outcome: z.enum(['PASSED', 'FAILED', 'ERRORED', 'SKIPPED', 'TIMEOUT']),
      tags: z.array(z.string()),
      mismatchType: z.string().optional(),
      timeMs: z.number().optional(),
      memoryKb: z.number().optional(),
      hidden: z.boolean(),
    })),
    gradingComplete: z.boolean(),
  }).nullable(),
  executedAt: z.string().datetime(),
});

router.post('/classify', async (req: Request, res: Response) => {
  try {
    const input = classifySchema.parse(req.body);
    const evidence: CorrectnessExecutionEvidence = {
      ref: {
        submissionId: input.submissionId as UUID,
        submissionVersion: input.submissionVersion,
        problemId: input.problemId as UUID,
        userId: input.userId as UUID,
        language: input.language as SupportedLanguage,
      },
      compilation: input.compilation,
      tests: input.tests ? {
        totalAvailable: input.tests.totalAvailable,
        results: input.tests.results.map(r => ({
          id: r.id,
          outcome: r.outcome as CorrectnessTestOutcome,
          tags: r.tags,
          mismatchType: r.mismatchType as MismatchType | undefined,
          timeMs: r.timeMs,
          memoryKb: r.memoryKb,
          hidden: r.hidden,
        })),
        gradingComplete: input.tests.gradingComplete,
      } : null,
      executedAt: input.executedAt as ISO8601,
    };
    const verdict = classify(evidence);
    res.json({ verdict });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid evidence format', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/correctness/requirement-coverage
 * Compute requirement coverage from evidence
 */
const coverageSchema = z.object({
  requirements: z.array(z.object({
    id: z.string(),
    description: z.string(),
    category: z.enum(['input', 'output', 'constraint', 'edge-case', 'ordering', 'numeric', 'behavior']),
    relatedTags: z.array(z.string()),
  })),
  evidence: classifySchema,
  staticFindings: z.array(z.object({
    ruleId: z.string(),
    language: z.string(),
    message: z.string(),
    severity: z.enum(['info', 'warning', 'error']),
    range: z.object({
      startLine: z.number(),
      endLine: z.number(),
      startCol: z.number().optional(),
      endCol: z.number().optional(),
      snippet: z.string().optional(),
    }).optional(),
    source: z.enum(['compiler-diagnostic', 'ast-analysis', 'heuristic']),
  })),
});

router.post('/requirement-coverage', async (req: Request, res: Response) => {
  try {
    const { requirements, evidence, staticFindings } = coverageSchema.parse(req.body);
    // Build proper CorrectnessExecutionEvidence
    const execEvidence: CorrectnessExecutionEvidence = {
      ref: {
        submissionId: evidence.submissionId as UUID,
        submissionVersion: evidence.submissionVersion,
        problemId: evidence.problemId as UUID,
        userId: evidence.userId as UUID,
        language: evidence.language as SupportedLanguage,
      },
      compilation: evidence.compilation,
      tests: evidence.tests ? {
        totalAvailable: evidence.tests.totalAvailable,
        results: evidence.tests.results.map(r => ({
          id: r.id,
          outcome: r.outcome as CorrectnessTestOutcome,
          tags: r.tags,
          mismatchType: r.mismatchType as MismatchType | undefined,
          timeMs: r.timeMs,
          memoryKb: r.memoryKb,
          hidden: r.hidden,
        })),
        gradingComplete: evidence.tests.gradingComplete,
      } : null,
      executedAt: evidence.executedAt as ISO8601,
    };
    const reqs: Requirement[] = requirements as Requirement[];
    const findings: StaticFinding[] = staticFindings as StaticFinding[];
    const coverage = computeRequirementCoverage(reqs, execEvidence, findings);
    res.json({ coverage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/correctness/delta
 * Compute delta between previous and current verdicts
 */
const deltaSchema = z.object({
  previous: z.object({
    verdict: z.custom<DeterministicVerdict>(),
    evidence: classifySchema,
  }).nullable(),
  current: z.object({
    verdict: z.custom<DeterministicVerdict>(),
    evidence: classifySchema,
  }),
});

router.post('/delta', async (req: Request, res: Response) => {
  try {
    const { previous, current } = deltaSchema.parse(req.body);

    // Build proper CorrectnessAssessment objects
    const buildAssessment = (data: { verdict: DeterministicVerdict; evidence: typeof classifySchema._type } | null) => {
      if (!data) return null;
      const evidence: CorrectnessExecutionEvidence = {
        ref: {
          submissionId: data.evidence.submissionId as UUID,
          submissionVersion: data.evidence.submissionVersion,
          problemId: data.evidence.problemId as UUID,
          userId: data.evidence.userId as UUID,
          language: data.evidence.language as SupportedLanguage,
        },
        compilation: data.evidence.compilation,
        tests: data.evidence.tests ? {
          totalAvailable: data.evidence.tests.totalAvailable,
          results: data.evidence.tests.results.map(r => ({
            id: r.id,
            outcome: r.outcome as CorrectnessTestOutcome,
            tags: r.tags,
            mismatchType: r.mismatchType as MismatchType | undefined,
            timeMs: r.timeMs,
            memoryKb: r.memoryKb,
            hidden: r.hidden,
          })),
          gradingComplete: data.evidence.tests.gradingComplete,
        } : null,
        executedAt: data.evidence.executedAt as ISO8601,
      };
      return { verdict: data.verdict, evidence };
    };

    const prev = buildAssessment(previous);
    const curr = buildAssessment(current);
    if (!curr) {
      return res.status(400).json({ error: 'Current assessment is required' });
    }
    const delta = computeDelta(prev, curr);
    res.json({ delta });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

export default router;