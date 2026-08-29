/**
 * CodeForge AI — Practice API Routes (Parts 3, 5, 9)
 */

import { Router, Response } from 'express';
import { RepositoryRegistry } from '../../repositories/index.js';
import { AuthenticatedRequest, requireStudentOrAbove, rateLimiters } from '../middleware/auth.js';
import { getExecutionProvider, executeSubmission, createExecutionInput } from '../../execution/index.js';
import { RecommendationService } from '../../engine/recommendation.js';
import { iso8601, uuid } from '../../domain/types.js';
import type { UUID, Challenge, Submission, EvaluationResult, Evidence, StudentSkillState, TestCaseResult, Verdict } from '../../domain/types.js';

type PracticeTestCaseResult = TestCaseResult & {
  hidden: boolean;
  category?: string;
};

type PracticeEvaluationResult = Omit<EvaluationResult, 'testResults'> & {
  verdict: Verdict;
  testResults: PracticeTestCaseResult[];
  diagnosis: any;
  updatedSkillStates: any[];
  feedback: string;
};

export function createPracticeRoutes(
  repos: RepositoryRegistry,
  recommendationService: RecommendationService
): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireStudentOrAbove());

  // GET /api/v1/practice/recommendation
  router.get('/recommendation', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const recommendation = await recommendationService.getNextRecommendation(studentId);

      if (!recommendation) {
        return res.json({ data: null, message: 'No recommendations available' });
      }

      // Get challenge details
      const challenge = await repos.challenge.findById(recommendation.challengeId);
      if (!challenge) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Challenge not found' } });
      }

      // Get student skill state
      const skillState = await repos.studentSkillState.findByStudentAndSkill(studentId, recommendation.skillId);

      res.json({
        data: {
          recommendation,
          challenge: {
            id: challenge.id,
            title: challenge.title,
            description: challenge.description,
            difficultyLevel: challenge.difficultyLevel,
            harnessType: challenge.harnessType,
            functionName: challenge.functionName,
            starterCode: challenge.starterCode,
            publicTests: challenge.publicTests?.map(t => ({ ...t, expectedOutput: undefined })) || [],
            hints: challenge.hints,
          },
          skillState,
        },
      });
    } catch (error) {
      console.error('Error getting recommendation:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get recommendation' } });
    }
  });

  // POST /api/v1/practice/attempt (with rate limiting)
  router.post('/attempt', rateLimiters.submissions, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const {
        challengeId,
        language = 'python',
        code,
        clientAttemptId,
        assistanceUsed = 'NONE',
        recommendationId,
      } = req.body;

      if (!challengeId || !code) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'challengeId and code are required' },
        });
      }

      // Verify challenge exists
      const challenge = await repos.challenge.findById(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Challenge not found' } });
      }

      // Create submission record
      const submission: Submission = {
        id: uuid(crypto.randomUUID()),
        studentId,
        challengeId: uuid(challengeId),
        language: language as any,
        code,
        clientAttemptId: clientAttemptId || null,
        assistanceUsed: assistanceUsed as any,
        recommendationId: recommendationId ? uuid(recommendationId) : null,
        state: 'QUEUED',
        submittedAt: iso8601(new Date().toISOString()),
        startedAt: null,
        completedAt: null,
        workerId: 'api',
        attempts: 1,
        idempotencyKey: clientAttemptId ? `attempt:${studentId}:${clientAttemptId}` : undefined,
      };

      await repos.submission.create(submission);

      // Update recommendation status if provided
      if (recommendationId) {
        await repos.recommendation.accept(recommendationId as UUID);
      }

      // Get test cases
      const testCases = await repos.testCase.findByChallenge(challengeId as UUID);

      // Execute submission
      const executionInput = createExecutionInput(
        submission.id,
        challengeId,
        language,
        code,
        testCases.map(t => ({
          id: t.id,
          input: t.input,
          category: t.category,
          expectedOutput: t.expectedOutput,
          hidden: t.hidden,
          points: t.points,
        })),
        challenge.harnessType,
        challenge.functionName,
        challenge.evaluationMetadata?.comparisonMode || 'exact'
      );

      const executionOutcome = await executeSubmission(executionInput);

      // Update submission state
      submission.state = 'EVALUATING';
      submission.startedAt = iso8601(new Date().toISOString());
      await repos.submission.update(submission);

      // Process evaluation
      const evaluationResult = processEvaluation(submission.id, executionOutcome, testCases, challenge);

      // Update submission with result
      submission.state = 'COMPLETED';
      submission.completedAt = iso8601(new Date().toISOString());
      await repos.submission.update(submission);

      // Store submission result
      await repos.submissionResult.create({
        submissionId: submission.id,
        verdict: evaluationResult.verdict,
        testResults: evaluationResult.testResults,
        executionTimeMs: evaluationResult.runtimeMs,
        memoryKb: evaluationResult.memoryKb,
        evaluation: evaluationResult,
        diagnosis: evaluationResult.diagnosis,
        updatedSkillStates: evaluationResult.updatedSkillStates,
      });

      // Record evidence
      await recordEvidence(studentId, evaluationResult, challenge);

      // Update skill states
      await updateSkillStates(studentId, evaluationResult);

      // Return result (redact hidden tests for student)
      const studentResult = {
        submissionId: submission.id,
        verdict: evaluationResult.verdict,
        testResults: evaluationResult.testResults.map(t => ({
          ...t,
          expectedOutput: t.hidden ? undefined : t.expectedOutput,
          actualOutput: t.hidden ? undefined : t.actualOutput,
        })),
        runtimeMs: evaluationResult.runtimeMs,
        memoryKb: evaluationResult.memoryKb,
        memoryKB: evaluationResult.memoryKb,
        diagnosis: evaluationResult.diagnosis,
        updatedSkillStates: evaluationResult.updatedSkillStates,
        feedback: evaluationResult.feedback,
      };

      res.status(201).json({ data: studentResult });
    } catch (error) {
      console.error('Error processing attempt:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to process attempt' } });
    }
  });

  // GET /api/v1/practice/skill/:skillId/state
  router.get('/skill/:skillId/state', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const skillId = req.params.skillId as UUID;

      const state = await repos.studentSkillState.findByStudentAndSkill(studentId, skillId);
      const evidence = await repos.evidence.findByStudentAndSkill(studentId, skillId);
      const misconceptions = await repos.misconception.findByStudentAndSkill(studentId, skillId);

      res.json({
        data: {
          skillState: state,
          evidenceCount: evidence.length,
          recentEvidence: evidence.slice(-10),
          misconceptions,
        },
      });
    } catch (error) {
      console.error('Error getting skill state:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get skill state' } });
    }
  });

  // GET /api/v1/practice/session/:sessionId
  router.get('/session/:sessionId', async (req: AuthenticatedRequest, res: Response) => {
    // This would track a practice session across multiple attempts
    // For now, return basic info
    res.json({ data: { sessionId: req.params.sessionId, attempts: [] } });
  });

  return router;
}

function processEvaluation(
  submissionId: UUID,
  outcome: any,
  testCases: any[],
  challenge: Challenge
): PracticeEvaluationResult {
  const totalTests = testCases.length;
  const testResults = outcome.results;

  // Match results to test cases
  const resultsWithExpected = testResults.map((r: any) => {
    const tc = testCases.find(t => t.id === r.testCaseId);
    return { ...r, expectedOutput: tc?.expectedOutput, hidden: tc?.hidden || false, category: tc?.category };
  });

  const passed = resultsWithExpected.filter((r: any) => !r.error && r.actualOutput !== null).length;
  const failed = totalTests - passed;

  let verdict: Verdict = 'FAIL';
  if (passed === totalTests) verdict = 'PASS';
  else if (passed > 0) verdict = 'PARTIAL';
  else if (outcome.globalError) verdict = 'SYSTEM_ERROR';

  // Simple diagnosis
  const diagnosis = {
    attemptId: submissionId,
    mistakeCategory: failed > 0 ? 'LOGIC_ERROR' : null,
    languageIssue: false,
    failurePattern: failed > passed ? 'Multiple test failures' : 'Partial failure',
    details: `Passed ${passed}/${totalTests} tests`,
    aiStatus: 'AI_EVALUATION_PENDING' as const,
  };

  // Generate simple feedback
  let feedback = '';
  if (verdict === 'PASS') {
    feedback = 'Great job! All tests passed.';
  } else if (verdict === 'PARTIAL') {
    feedback = `You passed ${passed} out of ${totalTests} tests. Review the failing cases.`;
  } else {
    feedback = 'Your solution did not pass the tests. Check the error messages and try again.';
  }

  return {
    attemptId: submissionId,
    challengeId: challenge.id,
    status: verdict === 'PASS' ? 'PASSED' : verdict === 'SYSTEM_ERROR' ? 'SYSTEM_ERROR' : 'FAILED',
    testResults: resultsWithExpected,
    testsTotal: totalTests,
    testsPassed: passed,
    testsFailed: failed,
    runtimeMs: outcome.totalRuntimeMs,
    memoryKb: outcome.peakMemoryKB,
    compileError: outcome.globalError?.message || null,
    resourceLimitExceeded: outcome.globalError?.type === 'TIMEOUT' || outcome.globalError?.type === 'MEMORY',
    passed: verdict === 'PASS',
    syntaxError: outcome.globalError?.type === 'COMPILATION',
    timeout: outcome.globalError?.type === 'TIMEOUT' || outcome.timedOut === true,
    verdict,
    diagnosis,
    updatedSkillStates: [],
    feedback,
  };
}

async function recordEvidence(
  studentId: UUID,
  evaluation: any,
  challenge: Challenge
): Promise<void> {
  // This would create evidence records
  // Simplified for now
}

async function updateSkillStates(
  studentId: UUID,
  evaluation: any
): Promise<void> {
  // This would update the student_skill_state table
  // Simplified for now
}

export default createPracticeRoutes;
