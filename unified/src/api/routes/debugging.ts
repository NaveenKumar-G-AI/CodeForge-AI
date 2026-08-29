// Debugging & Coach API Routes
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  createDebuggingSession,
  classifyFailure,
  checkOverfitting,
  analyzeMinimalChange,
  DebuggingStateMachine,
  scoreDebuggingSkills,
  generateDebuggingReport,
  generateTimeline,
} from '../../engine/debugging/index.js';
import {
  rankNextActions,
  determinePhase,
  updateProgressState,
  type CoachContext,
} from '../../engine/coach/index.js';
import {
  DebuggingSession,
  DebuggingHypothesis,
  DebugAction,
  FailureFingerprint,
  RootCauseChain,
  RegressionVerification,
  OverfittingSignal,
} from '../../domain/types.js';

const router = Router();

/**
 * POST /api/debugging/session
 * Create a new debugging session
 */
const sessionSchema = z.object({
  userId: z.string().uuid(),
  challengeId: z.string().uuid(),
  language: z.enum(['python', 'javascript']),
  initialCode: z.string(),
  submissionId: z.string().uuid().optional(),
});

router.post('/session', async (req: Request, res: Response) => {
  try {
    const { userId, challengeId, language, initialCode, submissionId } = sessionSchema.parse(req.body);
    const session = createDebuggingSession(userId, challengeId, language, initialCode);
    res.json({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/debugging/classify-failure
 * Classify failure from execution output
 */
const classifySchema = z.object({
  errorMessage: z.string().nullable(),
  exitCode: z.number().nullable(),
  stdout: z.string(),
  stderr: z.string(),
  executionTimeMs: z.number(),
  memoryUsageKB: z.number(),
  timeLimitMs: z.number(),
  memoryLimitKB: z.number(),
});

router.post('/classify-failure', async (req: Request, res: Response) => {
  try {
    const failure = classifyFailure(
      req.body.errorMessage,
      req.body.exitCode,
      req.body.stdout,
      req.body.stderr,
      req.body.executionTimeMs,
      req.body.memoryUsageKB,
      req.body.timeLimitMs,
      req.body.memoryLimitKB
    );
    res.json({ failure });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/debugging/overfitting
 * Check for overfitting
 */
const overfittingSchema = z.object({
  visiblePassed: z.number().int().nonnegative(),
  visibleTotal: z.number().int().nonnegative(),
  hiddenPassed: z.number().int().nonnegative(),
  hiddenTotal: z.number().int().nonnegative(),
});

router.post('/overfitting', async (req: Request, res: Response) => {
  try {
    const { visiblePassed, visibleTotal, hiddenPassed, hiddenTotal } = overfittingSchema.parse(req.body);
    const signal = checkOverfitting(visiblePassed, visibleTotal, hiddenPassed, hiddenTotal);
    res.json({ signal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/debugging/minimal-change
 * Analyze minimal change between versions
 */
const minimalChangeSchema = z.object({
  originalCode: z.string(),
  fixedCode: z.string(),
  suspectedLocation: z.string().optional(),
});

router.post('/minimal-change', async (req: Request, res: Response) => {
  try {
    const { originalCode, fixedCode, suspectedLocation } = minimalChangeSchema.parse(req.body);
    const analysis = analyzeMinimalChange(originalCode, fixedCode, suspectedLocation || null);
    res.json({ analysis });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/debugging/state-machine/apply
 * Apply event to debugging state machine
 */
const applyEventSchema = z.object({
  session: z.any(), // DebuggingSession
  event: z.string(),
  payload: z.any().optional(),
});

router.post('/state-machine/apply', async (req: Request, res: Response) => {
  try {
    const { session, event, payload } = applyEventSchema.parse(req.body);
    const machine = new DebuggingStateMachine(session);
    const result = machine.applyEvent(event, payload);
    if (result.error) {
      return res.status(400).json({ error: result.error.message });
    }
    res.json({ session: result.session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/debugging/skills/score
 * Score debugging skills from session data
 */
const skillScoreSchema = z.object({
  actions: z.array(z.any()),
  hypotheses: z.array(z.any()),
  experiments: z.array(z.any()),
  rootCause: z.any().nullable(),
  regression: z.any().nullable(),
});

router.post('/skills/score', async (req: Request, res: Response) => {
  try {
    const { actions, hypotheses, experiments, rootCause, regression } = skillScoreSchema.parse(req.body);
    const dimensions = scoreDebuggingSkills(actions, hypotheses, experiments, rootCause, regression);
    res.json({ dimensions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/debugging/report
 * Generate debugging report
 */
const reportSchema = z.object({
  status: z.enum(['EXCELLENT_DEBUGGING', 'STRONG_DEBUGGING', 'DEVELOPING_DEBUGGING', 'WEAK_DEBUGGING', 'INSUFFICIENT_EVIDENCE']),
  rootCause: z.any().nullable(),
  regression: z.any().nullable(),
  overfitting: z.any().nullable(),
  dimensions: z.array(z.any()),
});

router.post('/report', async (req: Request, res: Response) => {
  try {
    const { status, rootCause, regression, overfitting, dimensions } = reportSchema.parse(req.body);
    const report = generateDebuggingReport(status, rootCause, regression, overfitting, dimensions);
    res.json({ report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/debugging/timeline
 * Generate timeline from actions
 */
const timelineSchema = z.object({
  actions: z.array(z.any()),
});

router.post('/timeline', async (req: Request, res: Response) => {
  try {
    const { actions } = timelineSchema.parse(req.body);
    const timeline = generateTimeline(actions);
    res.json({ timeline });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/coach/next-action
 * Get next best action recommendation
 */
const nextActionSchema = z.object({
  session: z.any(),
  hypotheses: z.array(z.any()),
  experiments: z.array(z.any()),
  actions: z.array(z.any()),
  fingerprint: z.any().nullable(),
  rootCause: z.any().nullable(),
  regression: z.any().nullable(),
  overfitting: z.any().nullable(),
  phase: z.enum(['OBSERVATION', 'HYPOTHESIS_FORMATION', 'EVIDENCE_GATHERING', 'ROOT_CAUSE', 'FIX', 'VERIFICATION', 'COMPLETE', 'STUCK']),
  stuckCounter: z.number().int().nonnegative(),
});

router.post('/coach/next-action', async (req: Request, res: Response) => {
  try {
    const context = nextActionSchema.parse(req.body);
    const actions = rankNextActions(context as CoachContext);
    res.json({ actions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/coach/determine-phase
 * Determine current coaching phase
 */
const determinePhaseSchema = z.object({
  session: z.any(),
  hypotheses: z.array(z.any()),
  experiments: z.array(z.any()),
  actions: z.array(z.any()),
  rootCause: z.any().nullable(),
  stuckCounter: z.number().int().nonnegative(),
});

router.post('/coach/determine-phase', async (req: Request, res: Response) => {
  try {
    const { session, hypotheses, experiments, actions, rootCause, stuckCounter } = determinePhaseSchema.parse(req.body);
    const phase = determinePhase(session, hypotheses, experiments, actions, rootCause, stuckCounter);
    res.json({ phase });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/coach/update-progress
 * Update coaching progress state
 */
const updateProgressSchema = z.object({
  state: z.any(), // CoachingProgressState
  action: z.string(),
  result: z.enum(['success', 'failure', 'neutral']),
});

router.post('/coach/update-progress', async (req: Request, res: Response) => {
  try {
    const { state, action, result } = updateProgressSchema.parse(req.body);
    const newState = updateProgressState(state, action as any, result);
    res.json({ state: newState });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

export default router;