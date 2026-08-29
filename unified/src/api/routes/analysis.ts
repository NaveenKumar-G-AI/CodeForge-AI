// Analysis API Routes (Complexity, Quality, Reasoning, Consistency)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { estimateComplexity, extractComplexityEvidence, buildExpressionTree } from '../../engine/complexity/index.js';
import { runDeterministicRules, computeScore, computeComparison } from '../../engine/quality/index.js';
import { verifyAlgorithmClaim, detectContradictions } from '../../engine/reasoning/index.js';
import { compareClaims, buildConsistencyReport } from '../../engine/consistency/index.js';
import { ComplexityConstraints, Claim, ClaimType, ClaimImportance } from '../../domain/types.js';

const router = Router();

/**
 * POST /api/analysis/complexity
 * Estimate complexity from source code
 */
const complexitySchema = z.object({
  sourceCode: z.string(),
  language: z.enum(['python', 'javascript', 'typescript']),
  constraints: z.object({
    nMeaning: z.string(),
    constraints: z.array(z.object({
      expression: z.object({
        operator: z.string(),
        operands: z.array(z.any()),
        raw: z.string(),
      }),
      satisfiedBy: z.array(z.enum(['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(n^3)', 'O(2^n)', 'O(n!)', 'UNKNOWN'])),
    })),
  }).optional(),
});

router.post('/complexity', async (req: Request, res: Response) => {
  try {
    const { sourceCode, language, constraints } = complexitySchema.parse(req.body);
    const evidence = extractComplexityEvidence(sourceCode, language);
    const complexityConstraints = constraints as ComplexityConstraints | undefined;
    const report = estimateComplexity(evidence, complexityConstraints);
    const tree = buildExpressionTree(evidence);
    res.json({ report, expressionTree: tree, evidence });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/analysis/quality
 * Run deterministic quality analysis
 */
const qualitySchema = z.object({
  submissionId: z.string().uuid(),
  userId: z.string().uuid(),
  language: z.enum(['python', 'javascript', 'typescript']),
  sourceCode: z.string(),
  astRoot: z.any(),
  previous: z.object({
    dimensionScores: z.array(z.any()),
    overallScore: z.number(),
  }).nullable(),
});

router.post('/quality', async (req: Request, res: Response) => {
  try {
    const { submissionId, userId, language, sourceCode, astRoot, previous } = qualitySchema.parse(req.body);
    const findings = runDeterministicRules(sourceCode, language, astRoot);
    const { dimensionScores, overallScore, overallLabel } = computeScore(findings);

    let comparison = null;
    if (previous) {
      comparison = computeComparison(previous, { dimensionScores, overallScore });
    }

    res.json({
      submissionId,
      language,
      overallScore,
      overallLabel,
      dimensionScores,
      findings,
      comparison,
      aiStatus: 'NOT_CONFIGURED',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/analysis/reasoning/verify
 * Verify a claim against code evidence
 */
const verifySchema = z.object({
  claim: z.object({
    claimId: z.string(),
    claimType: z.enum(['PROBLEM_UNDERSTANDING', 'ALGORITHM', 'DATA_STRUCTURE', 'CONTROL_FLOW', 'CORRECTNESS', 'COMPLEXITY', 'SPACE_COMPLEXITY', 'EDGE_CASE', 'OPTIMIZATION', 'IMPLEMENTATION_DECISION', 'INVARIANT', 'TRADEOFF', 'BEHAVIOR']),
    originalText: z.string(),
    normalizedMeaning: z.string(),
    importance: z.enum(['CORE', 'IMPORTANT', 'SUPPORTING', 'INCIDENTAL']),
    confidence: z.number(),
  }),
  ctx: z.object({
    sourceCode: z.string(),
    language: z.string(),
    problem: z.any().optional(),
    astFacts: z.any(),
    detectedPatterns: z.array(z.any()),
    complexity: z.any(),
  }),
});

router.post('/reasoning/verify', async (req: Request, res: Response) => {
  try {
    const { claim, ctx } = verifySchema.parse(req.body);
    const claimObj: Claim = {
      claimId: claim.claimId,
      claimType: claim.claimType,
      originalText: claim.originalText,
      normalizedMeaning: claim.normalizedMeaning,
      importance: claim.importance,
      confidence: claim.confidence,
    };
    // Build proper VerifierContext
    const verifierContext = {
      sourceCode: ctx.sourceCode,
      language: ctx.language,
      problem: ctx.problem,
      astFacts: {
        functions: [],
        loops: [],
        conditionals: [],
        dataStructures: [],
        imports: [],
        variables: [],
        ...ctx.astFacts,
      },
      detectedPatterns: ctx.detectedPatterns || [],
      complexity: ctx.complexity,
    };
    const verification = verifyAlgorithmClaim(claimObj, verifierContext);
    const contradictions = detectContradictions([claimObj], [verification], verifierContext);
    res.json({ verification, contradictions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/analysis/consistency
 * Compare code vs reasoning claims
 */
const consistencySchema = z.object({
  submissionId: z.string().uuid(),
  analysisVersion: z.string().default('1.0.0'),
  codeClaims: z.record(z.object({
    value: z.union([z.number(), z.string()]),
    evidence: z.array(z.string()),
  })),
  reasoningClaims: z.record(z.object({
    value: z.union([z.number(), z.string()]),
    confidence: z.number(),
  })),
  dimensions: z.array(z.string()),
  reconciled: z.boolean().optional(),
  reconciliationNote: z.string().optional(),
});

router.post('/consistency', async (req: Request, res: Response) => {
  try {
    const { submissionId, analysisVersion, codeClaims, reasoningClaims, dimensions, reconciled, reconciliationNote } =
      consistencySchema.parse(req.body);
    const { comparisons, score } = compareClaims(codeClaims, reasoningClaims, dimensions);
    const report = buildConsistencyReport(submissionId, analysisVersion, comparisons, score, reconciled, reconciliationNote);
    res.json({ report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

export default router;