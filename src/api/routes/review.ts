// Code Review API Routes
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  createReviewReport,
  processReconciliation,
  determineVerdict,
  generateReviewSummary,
} from '../../engine/review/index.js';
import {
  QualityFinding,
  QualityDimension,
  Severity,
  QualityConfidence,
  QualitySourceLocation,
  CodeReviewReport,
  ReconciliationResponse,
  ReviewVerdict,
} from '../../domain/types.js';

const router = Router();

/**
 * POST /api/review/create
 * Create a code review report from quality findings
 */
const createSchema = z.object({
  submissionId: z.string().uuid(),
  language: z.enum(['python', 'javascript', 'typescript']),
  qualityFindings: z.array(z.object({
    findingId: z.string(),
    ruleId: z.string(),
    ruleVersion: z.string(),
    category: z.string(),
    severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']),
    title: z.string(),
    description: z.string(),
    impact: z.string(),
    sourceLocation: z.object({
      startLine: z.number(),
      endLine: z.number(),
      startCol: z.number().optional(),
      endCol: z.number().optional(),
    }).nullable(),
    evidence: z.array(z.string()),
    suggestedAction: z.string(),
    dimensions: z.record(z.number()),
    origin: z.enum(['DETERMINISTIC', 'AI']),
  })),
});

router.post('/create', async (req: Request, res: Response) => {
  try {
    const { submissionId, language, qualityFindings } = createSchema.parse(req.body);
    const normalizedFindings: QualityFinding[] = qualityFindings.map(finding => ({
      ...finding,
      origin: finding.origin === 'AI' ? 'AI_SEMANTIC' : finding.origin,
    }));
    const report = createReviewReport(submissionId, language, normalizedFindings);
    res.json({ report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/review/verdict
 * Determine verdict from findings
 */
const verdictSchema = z.object({
  findings: z.array(z.object({
    id: z.string(),
    reviewId: z.string(),
    ruleId: z.string(),
    severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR', 'INFO']),
    category: z.enum(['CORRECTNESS', 'PERFORMANCE', 'SECURITY', 'STYLE', 'MAINTAINABILITY', 'TESTING', 'DOCUMENTATION']),
    title: z.string(),
    description: z.string(),
    filePath: z.string().nullable(),
    lineStart: z.number().nullable(),
    lineEnd: z.number().nullable(),
    status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'WONTFIX', 'DISPUTED']),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    suggestedFix: z.string().optional(),
    evidenceIds: z.array(z.string()),
    createdAt: z.string(),
  })),
});

router.post('/verdict', async (req: Request, res: Response) => {
  try {
    const { findings } = verdictSchema.parse(req.body);
    const verdict = determineVerdict(findings);
    const summary = generateReviewSummary(findings, verdict);
    res.json({ verdict, summary });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/review/reconcile
 * Process reconciliation response
 */
const reconcileSchema = z.object({
  review: z.any(), // CodeReviewReport
  response: z.object({
    studentId: z.string().uuid(),
    findingId: z.string(),
    accepted: z.boolean(),
    resolutionText: z.string().optional(),
    alternativeFix: z.string().optional(),
    respondedAt: z.string().datetime(),
  }),
});

router.post('/reconcile', async (req: Request, res: Response) => {
  try {
    const { review, response } = reconcileSchema.parse(req.body);
    const result = processReconciliation(review, {
      findingId: response.findingId,
      accepted: response.accepted,
      resolution: response.resolutionText ?? response.alternativeFix ?? '',
      resolvedAt: response.respondedAt,
    });
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

export default router;
