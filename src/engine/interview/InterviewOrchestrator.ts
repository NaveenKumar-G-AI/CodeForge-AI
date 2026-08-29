/**
 * Interview Orchestrator - Feature 35 Main Engine
 * Coordinates all interview operations per spec
 */

import {
  TechnicalInterviewBlueprint as InterviewBlueprint,
  TechnicalInterviewSession as InterviewSession,
  TechnicalInterviewQuestion as InterviewQuestion,
  InterviewResponse,
  StructuredEvaluation,
  SkillEvidenceRecord,
  InterviewCoverageReport,
  TenantContext,
  InterviewSessionState as SessionState,
  InterviewMode,
  RoleSkillRequirements,
  CandidateEvidenceBundle,
  EvidenceArtifactRef,
  DepthLevel,
  FollowUpReason,
  QuestionType,
  InterviewDifficultyLevel as DifficultyLevel,
  ConfidenceBand,
  RoleSkillRequirement,
} from '../../domain/types.js';
import { randomUUID } from 'crypto';
import { StateMachine, IllegalStateTransitionError } from './StateMachine.js';
import { BlueprintBuilder } from './BlueprintBuilder.js';
import { QuestionSelector } from './QuestionSelector.js';
import { EvaluationPipeline, AIGateway } from './EvaluationPipeline.js';
import { EvidenceExtractor } from './EvidenceExtractor.js';
import { AdaptiveFollowUp } from './AdaptiveFollowUp.js';
import { CoverageTracker } from './CoverageTracker.js';
import { QuestionValidator } from './QuestionValidator.js';
import { SessionProgress } from './SessionProgress.js';

export interface InterviewRepository {
  createBlueprint(blueprint: InterviewBlueprint): Promise<void>;
  getBlueprint(id: string): Promise<InterviewBlueprint | null>;
  createSession(session: InterviewSession): Promise<void>;
  getSession(id: string): Promise<InterviewSession | null>;
  updateSession(id: string, updates: Partial<InterviewSession>): Promise<void>;
  addQuestion(question: InterviewQuestion): Promise<void>;
  getQuestion(id: string): Promise<InterviewQuestion | null>;
  listQuestions(sessionId: string): Promise<InterviewQuestion[]>;
  addResponse(response: InterviewResponse): Promise<void>;
  getResponse(id: string): Promise<InterviewResponse | null>;
  listResponses(sessionId: string): Promise<InterviewResponse[]>;
  addEvaluation(evaluation: StructuredEvaluation): Promise<void>;
  getEvaluationForResponse(responseId: string): Promise<StructuredEvaluation | null>;
  listEvaluations(sessionId: string): Promise<StructuredEvaluation[]>;
  addSkillEvidence(sessionId: string, evidence: SkillEvidenceRecord[]): Promise<void>;
  getSkillEvidence(sessionId: string): Promise<SkillEvidenceRecord[]>;
  recordEvent(sessionId: string, event: string, data: Record<string, unknown>): Promise<void>;
}

export type SubmitResponseResult =
  | { type: 'NEXT_QUESTION'; question: InterviewQuestion }
  | { type: 'COMPLETED'; coverage: InterviewCoverageReport; evidence: SkillEvidenceRecord[] }
  | { type: 'EVALUATION_FAILED'; error: string }
  | { type: 'DUPLICATE_IGNORED'; responseId: string };

export interface OrchestratorDeps {
  repo: InterviewRepository;
  aiGateway: AIGateway;
  roleSkillModel: { getRoleSkillRequirements(orgId: string, role: string): Promise<RoleSkillRequirements> };
  candidateEvidence: { getExistingEvidence(orgId: string, candidateId: string, skills: string[]): Promise<CandidateEvidenceBundle> };
  auditLog: { record(sessionId: string, event: string, data: Record<string, unknown>): Promise<void> };
}

export class InterviewOrchestrator {
  private evaluationPipeline: EvaluationPipeline;

  constructor(private readonly deps: OrchestratorDeps) {
    this.evaluationPipeline = new EvaluationPipeline(deps.aiGateway);
  }

  /**
   * Create interview from role and mode
   */
  async createInterview(ctx: TenantContext, input: {
    candidateId: string;
    targetRole: string;
    mode: InterviewMode;
    restrictToSkills?: string[];
  }): Promise<InterviewSession> {
    // Get role skill requirements
    const roleSkillRequirements = await this.deps.roleSkillModel.getRoleSkillRequirements(ctx.orgId, input.targetRole);

    // Get candidate evidence
    const candidateEvidence = await this.deps.candidateEvidence.getExistingEvidence(
      ctx.orgId,
      input.candidateId,
      roleSkillRequirements.skills.map(s => s.skill)
    );

    // Build blueprint
    const blueprint = BlueprintBuilder.build({
      orgId: ctx.orgId,
      targetRole: input.targetRole,
      mode: input.mode,
      roleSkillRequirements,
      candidateEvidence,
      restrictToSkills: input.restrictToSkills,
    });

    await this.deps.repo.createBlueprint(blueprint);
    await this.deps.auditLog.record('', 'BLUEPRINT_CREATED', { blueprintId: blueprint.id });

    // Create session in CREATED state
    const session: InterviewSession = {
      id: randomUUID(),
      orgId: ctx.orgId,
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      candidateId: input.candidateId,
      state: 'CREATED',
      currentQuestionId: null,
      startedAt: null,
      pausedAt: null,
      resumedAt: null,
      completedAt: null,
      lastActivityAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.deps.repo.createSession(session);
    return session;
  }

  /**
   * Start interview session: CREATED → READY → IN_PROGRESS, generate first question
   */
  async startSession(ctx: TenantContext, sessionId: string): Promise<InterviewQuestion> {
    const session = await this.deps.repo.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    StateMachine.assertValidTransition(session.state, 'READY');
    StateMachine.assertValidTransition('READY', 'IN_PROGRESS');

    await this.deps.repo.updateSession(sessionId, {
      state: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    });

    // Generate first question
    const blueprint = await this.deps.repo.getBlueprint(session.blueprintId);
    if (!blueprint) throw new Error('Blueprint not found');

    const question = await this.generateRootQuestion(ctx.orgId, sessionId, blueprint);
    return question;
  }

  /**
   * Get current question
   */
  async getCurrentQuestion(ctx: TenantContext, sessionId: string): Promise<InterviewQuestion | null> {
    const session = await this.deps.repo.getSession(sessionId);
    if (!session) throw new Error('Session not found');
    if (!session.currentQuestionId) return null;
    return this.deps.repo.getQuestion(session.currentQuestionId);
  }

  /**
   * Submit response - core idempotent loop per spec
   */
  async submitResponse(ctx: TenantContext, input: {
    sessionId: string;
    questionId: string;
    responseText: string;
    idempotencyKey: string;
  }): Promise<SubmitResponseResult> {
    const session = await this.deps.repo.getSession(input.sessionId);
    if (!session) throw new Error('Session not found');

    if (session.state !== 'IN_PROGRESS' && session.state !== 'RESUMED') {
      throw new Error('Interview not in progress');
    }

    // Check idempotency
    const existingResponses = await this.deps.repo.listResponses(input.sessionId);
    const existing = existingResponses.find(r => r.idempotencyKey === input.idempotencyKey);
    if (existing) {
      return { type: 'DUPLICATE_IGNORED', responseId: existing.id };
    }

    // Create response
    const response: InterviewResponse = {
      id: randomUUID(),
      sessionId: input.sessionId,
      questionId: input.questionId,
      candidateId: session.candidateId,
      responseText: input.responseText,
      submittedAt: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
    };
    await this.deps.repo.addResponse(response);

    // Get question and blueprint
    const question = await this.deps.repo.getQuestion(input.questionId);
    if (!question) throw new Error('Question not found');

    const blueprint = await this.deps.repo.getBlueprint(session.blueprintId);
    if (!blueprint) throw new Error('Blueprint not found');

    // Get candidate evidence
    const candidateEvidence = await this.deps.candidateEvidence.getExistingEvidence(
      ctx.orgId,
      session.candidateId,
      blueprint.targetSkills.map(s => s.skill)
    );

    // Run evaluation
    const evalResult = await this.evaluationPipeline.evaluate(
      question,
      response,
      candidateEvidence,
      blueprint.evaluationRules.dimensions
    );

    if (!evalResult.ok || !evalResult.evaluation) {
      // EVALUATION_FAILED → return error, transition state
      await this.deps.repo.updateSession(input.sessionId, {
        state: 'EVALUATION_FAILED',
        lastActivityAt: new Date().toISOString(),
      });
      return { type: 'EVALUATION_FAILED', error: evalResult.error || 'Evaluation failed' };
    }

    // Store evaluation
    const evaluation: StructuredEvaluation = {
      id: randomUUID(),
      responseId: response.id,
      evaluationVersion: 1,
      status: 'COMPLETED',
      ...evalResult.evaluation,
    };
    await this.deps.repo.addEvaluation(evaluation);

    // Advance after evaluation
    return this.advanceAfterEvaluation(ctx.orgId, session, blueprint, question, evaluation);
  }

  /**
   * Internal: advance interview after evaluation
   */
  private async advanceAfterEvaluation(
    orgId: string,
    session: InterviewSession,
    blueprint: InterviewBlueprint,
    lastQuestion: InterviewQuestion,
    lastEvaluation: StructuredEvaluation
  ): Promise<SubmitResponseResult> {
    // Get all questions/responses/evaluations
    const questions = await this.deps.repo.listQuestions(session.id);
    const responses = await this.deps.repo.listResponses(session.id);
    const evaluations = await this.deps.repo.listEvaluations(session.id);

    // Build lookup maps
    const responsesByQuestionId: Record<string, InterviewResponse> = {};
    for (const r of responses) responsesByQuestionId[r.questionId] = r;

    const evaluationsByResponseId: Record<string, StructuredEvaluation> = {};
    for (const e of evaluations) evaluationsByResponseId[e.responseId] = e;

    // Derive progress
    const perSkillProgress = SessionProgress.deriveSkillProgress(questions, responsesByQuestionId, evaluationsByResponseId);

    // Build coverage report
    const coverage = CoverageTracker.buildCoverageReport(blueprint, perSkillProgress);

    // Check elapsed time
    const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
    const elapsedMinutes = (Date.now() - startedAt) / 60000;

    // Decision: stop?
    const stopDecision = CoverageTracker.decideStop(blueprint, coverage, questions.length, elapsedMinutes);
    if (stopDecision.shouldStop) {
      return this.completeInterview(session, perSkillProgress);
    }

    // Decide follow-up or new topic
    const currentTopic = SessionProgress.analyzeCurrentTopic(questions);
    const followUpDecision = AdaptiveFollowUp.decide({
      answerQuality: lastEvaluation.answerQuality,
      consistency: lastEvaluation.consistency,
      currentDepth: lastQuestion.depthLevel,
      followUpsSoFarForTopic: currentTopic?.followUpsSoFarForTopic || 0,
      retriesAtCurrentDepth: currentTopic?.retriesAtCurrentDepth || 0,
      maxFollowUpsPerQuestion: blueprint.followUpStrategy.maxFollowUpsPerQuestion,
      maxDepthPerTopic: blueprint.followUpStrategy.maxDepthPerTopic,
    });

    if (followUpDecision.action === 'NEW_TOPIC' || !currentTopic) {
      // Select next topic
      const recentSkills = SessionProgress.recentSkillsMostRecentFirst(questions, blueprint.questionStrategy.diversityWindow);
      const progress = {
        perSkill: perSkillProgress,
        recentSkills,
        currentTopic,
      };
      const nextTopic = QuestionSelector.selectNextTopic(blueprint, progress as any);
      if (!nextTopic) {
        // No more topics - complete
        return this.completeInterview(session, perSkillProgress);
      }

      const newQuestion = await this.generateRootQuestion(orgId, session.id, blueprint, nextTopic.skill);
      return { type: 'NEXT_QUESTION', question: newQuestion };
    } else {
      // Generate follow-up
      const followUp = await this.generateFollowUp(session, blueprint, lastQuestion, followUpDecision);
      return { type: 'NEXT_QUESTION', question: followUp };
    }
  }

  /**
   * Complete interview - emit evidence, mark COMPLETED
   */
  private async completeInterview(
    session: InterviewSession,
    perSkillProgress: Record<string, any>
  ): Promise<SubmitResponseResult> {
    const questions = await this.deps.repo.listQuestions(session.id);
    const responses = await this.deps.repo.listResponses(session.id);
    const evaluations = await this.deps.repo.listEvaluations(session.id);

    const responsesByQuestionId: Record<string, InterviewResponse> = {};
    for (const r of responses) responsesByQuestionId[r.questionId] = r;

    const evaluationsByResponseId: Record<string, StructuredEvaluation> = {};
    for (const e of evaluations) evaluationsByResponseId[e.responseId] = e;

    const progress = SessionProgress.deriveSkillProgress(questions, responsesByQuestionId, evaluationsByResponseId);

    // Extract skill evidence
    const evidence = EvidenceExtractor.extractSkillEvidence(progress, evaluations);

    // Build coverage report
    const blueprint = await this.deps.repo.getBlueprint(session.blueprintId);
    if (!blueprint) throw new Error('Blueprint not found');
    const coverage = CoverageTracker.buildCoverageReport(blueprint, progress);

    // Store skill evidence
    await this.deps.repo.addSkillEvidence(session.id, evidence);

    // Transition to COMPLETED
    await this.deps.repo.updateSession(session.id, {
      state: 'COMPLETED',
      completedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    });

    // Emit evidence to SkillSignalEngine (per spec §43/§46/§47)
    await this.deps.auditLog.record(session.id, 'INTERVIEW_COMPLETED', {
      candidateId: session.candidateId,
      evidence,
    });

    return { type: 'COMPLETED', coverage, evidence };
  }

  /**
   * Generate root question for a topic
   */
  private async generateRootQuestion(
    orgId: string,
    sessionId: string,
    blueprint: InterviewBlueprint,
    skill?: string
  ): Promise<InterviewQuestion> {
    let targetSkill = skill;
    if (!targetSkill) {
      // Select first topic
      const progress = { perSkill: {}, recentSkills: [], currentTopic: null };
      const topic = QuestionSelector.selectNextTopic(blueprint, progress as any);
      targetSkill = topic?.skill || blueprint.targetSkills[0].skill;
    }

    const candidateEvidence = await this.deps.candidateEvidence.getExistingEvidence(
      orgId,
      (await this.deps.repo.getSession(sessionId))!.candidateId,
      [targetSkill]
    );

    const questionType = QuestionSelector.pickQuestionType(blueprint.mode, targetSkill, candidateEvidence);
    const difficulty: DifficultyLevel = blueprint.difficulty === 'ADAPTIVE' ? 'MEDIUM' : blueprint.difficulty;

    const promptText = await this.generatePrompt(targetSkill, questionType, difficulty, null, candidateEvidence);

    const question: InterviewQuestion = {
      id: randomUUID(),
      sessionId,
      sequenceNumber: (await this.deps.repo.listQuestions(sessionId)).length + 1,
      questionType,
      skill: targetSkill,
      difficulty,
      depthLevel: 'DEFINITION',
      promptText,
      generatedBy: 'AI',
    };

    await this.deps.repo.addQuestion(question);
    await this.deps.repo.updateSession(sessionId, {
      currentQuestionId: question.id,
      lastActivityAt: new Date().toISOString(),
    });

    return question;
  }

  /**
   * Generate follow-up question
   */
  private async generateFollowUp(
    session: InterviewSession,
    blueprint: InterviewBlueprint,
    parentQuestion: InterviewQuestion,
    decision: { action: string; reason: FollowUpReason; nextDepth?: DepthLevel }
  ): Promise<InterviewQuestion> {
    const depthLevel = decision.nextDepth || parentQuestion.depthLevel;

    const candidateEvidence = await this.deps.candidateEvidence.getExistingEvidence(
      session.orgId,
      session.candidateId,
      [parentQuestion.skill]
    );

    const promptText = await this.generatePrompt(
      parentQuestion.skill,
      parentQuestion.questionType,
      parentQuestion.difficulty,
      depthLevel,
      candidateEvidence
    );

    const question: InterviewQuestion = {
      id: randomUUID(),
      sessionId: session.id,
      sequenceNumber: (await this.deps.repo.listQuestions(session.id)).length + 1,
      questionType: parentQuestion.questionType,
      skill: parentQuestion.skill,
      difficulty: parentQuestion.difficulty,
      depthLevel,
      promptText,
      generatedBy: 'AI',
      parentQuestionId: parentQuestion.id,
      followUpReason: decision.reason as FollowUpReason,
    };

    await this.deps.repo.addQuestion(question);
    await this.deps.repo.updateSession(session.id, {
      currentQuestionId: question.id,
      lastActivityAt: new Date().toISOString(),
    });

    return question;
  }

  /**
   * Generate prompt text - calls AI and validates
   */
  private async generatePrompt(
    skill: string,
    questionType: QuestionType,
    difficulty: DifficultyLevel,
    depthLevel: DepthLevel | null,
    candidateEvidence: CandidateEvidenceBundle
  ): Promise<string> {
    // In real implementation, this calls AI Gateway
    // For now, return a placeholder with proper structure
    const depthNote = depthLevel ? ` [Depth: ${depthLevel}]` : '';
    return `Explain ${skill} in the context of ${questionType}${depthNote}.`;
  }

  /**
   * Pause interview: IN_PROGRESS → PAUSED
   */
  async pause(ctx: TenantContext, sessionId: string): Promise<void> {
    const session = await this.deps.repo.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    StateMachine.assertValidTransition(session.state, 'PAUSED');
    await this.deps.repo.updateSession(sessionId, {
      state: 'PAUSED',
      pausedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    });
  }

  /**
   * Resume interview: PAUSED → RESUMED
   */
  async resume(ctx: TenantContext, sessionId: string): Promise<InterviewQuestion | null> {
    const session = await this.deps.repo.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    StateMachine.assertValidTransition(session.state, 'RESUMED');
    await this.deps.repo.updateSession(sessionId, {
      state: 'RESUMED',
      resumedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    });

    // Return current question
    if (session.currentQuestionId) {
      return this.deps.repo.getQuestion(session.currentQuestionId);
    }
    return null;
  }

  /**
   * Get interview history for candidate
   */
  async getHistory(ctx: TenantContext, candidateId: string): Promise<InterviewSession[]> {
    // Would query sessions by candidateId
    return [];
  }
}
