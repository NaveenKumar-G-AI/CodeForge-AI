/**
 * Interview Service - Feature 35
 * Main service facade for interview operations
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
  InterviewMode,
  RoleSkillRequirements,
  CandidateEvidenceBundle,
} from '../../domain/types.js';
import { InterviewOrchestrator } from './InterviewOrchestrator.js';
import { InterviewRepository } from './InterviewRepository.js';
import { AIGateway } from './EvaluationPipeline.js';

// Dependencies (will be injected)
let orchestrator: InterviewOrchestrator | null = null;

export function initializeInterviewService(deps: {
  repo: InterviewRepository;
  aiGateway: AIGateway;
  roleSkillModel: { getRoleSkillRequirements(orgId: string, role: string): Promise<RoleSkillRequirements> };
  candidateEvidence: { getExistingEvidence(orgId: string, candidateId: string, skills: string[]): Promise<CandidateEvidenceBundle> };
  auditLog: { record(sessionId: string, event: string, data: Record<string, unknown>): Promise<void> };
}): void {
  orchestrator = new InterviewOrchestrator(deps);
}

export const interviewService = {
  /**
   * Create a new interview session
   */
  async createInterview(ctx: TenantContext, input: {
    candidateId: string;
    targetRole: string;
    mode: InterviewMode;
    restrictToSkills?: string[];
  }): Promise<InterviewSession> {
    if (!orchestrator) throw new Error('Interview service not initialized');
    return orchestrator.createInterview(ctx, input);
  },

  /**
   * Start an interview session and get first question
   */
  async startSession(ctx: TenantContext, sessionId: string): Promise<InterviewQuestion> {
    if (!orchestrator) throw new Error('Interview service not initialized');
    return orchestrator.startSession(ctx, sessionId);
  },

  /**
   * Get current question for session
   */
  async getCurrentQuestion(ctx: TenantContext, sessionId: string): Promise<InterviewQuestion | null> {
    if (!orchestrator) throw new Error('Interview service not initialized');
    return orchestrator.getCurrentQuestion(ctx, sessionId);
  },

  /**
   * Submit response to current question
   */
  async submitResponse(ctx: TenantContext, input: {
    sessionId: string;
    questionId: string;
    responseText: string;
    idempotencyKey: string;
  }): Promise<{
    type: 'NEXT_QUESTION' | 'COMPLETED' | 'EVALUATION_FAILED' | 'DUPLICATE_IGNORED';
    question?: InterviewQuestion;
    coverage?: InterviewCoverageReport;
    evidence?: SkillEvidenceRecord[];
    error?: string;
    responseId?: string;
  }> {
    if (!orchestrator) throw new Error('Interview service not initialized');
    return orchestrator.submitResponse(ctx, input);
  },

  /**
   * Pause interview
   */
  async pause(ctx: TenantContext, sessionId: string): Promise<void> {
    if (!orchestrator) throw new Error('Interview service not initialized');
    return orchestrator.pause(ctx, sessionId);
  },

  /**
   * Resume paused interview
   */
  async resume(ctx: TenantContext, sessionId: string): Promise<InterviewQuestion | null> {
    if (!orchestrator) throw new Error('Interview service not initialized');
    return orchestrator.resume(ctx, sessionId);
  },

  /**
   * Get interview history for candidate
   */
  async getHistory(ctx: TenantContext, candidateId: string): Promise<InterviewSession[]> {
    if (!orchestrator) throw new Error('Interview service not initialized');
    return orchestrator.getHistory(ctx, candidateId);
  },
};
