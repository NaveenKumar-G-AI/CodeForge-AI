/**
 * Interview Repository - Feature 35
 * Port interface for interview data persistence
 */

import {
  TechnicalInterviewBlueprint as InterviewBlueprint,
  TechnicalInterviewSession as InterviewSession,
  TechnicalInterviewQuestion as InterviewQuestion,
  InterviewResponse,
  StructuredEvaluation,
  SkillEvidenceRecord,
  TenantContext,
  InterviewSessionState as SessionState,
} from '../../domain/types.js';

export interface InterviewRepository {
  // Blueprint
  createBlueprint(blueprint: InterviewBlueprint): Promise<void>;
  getBlueprint(id: string): Promise<InterviewBlueprint | null>;

  // Session
  createSession(session: InterviewSession): Promise<void>;
  getSession(id: string): Promise<InterviewSession | null>;
  updateSession(id: string, updates: Partial<InterviewSession>): Promise<void>;

  // Questions
  addQuestion(question: InterviewQuestion): Promise<void>;
  getQuestion(id: string): Promise<InterviewQuestion | null>;
  listQuestions(sessionId: string): Promise<InterviewQuestion[]>;

  // Responses
  addResponse(response: InterviewResponse): Promise<void>;
  getResponse(id: string): Promise<InterviewResponse | null>;
  listResponses(sessionId: string): Promise<InterviewResponse[]>;

  // Evaluations
  addEvaluation(evaluation: StructuredEvaluation): Promise<void>;
  getEvaluationForResponse(responseId: string): Promise<StructuredEvaluation | null>;
  listEvaluations(sessionId: string): Promise<StructuredEvaluation[]>;

  // Skill Evidence
  addSkillEvidence(sessionId: string, evidence: SkillEvidenceRecord[]): Promise<void>;
  getSkillEvidence(sessionId: string): Promise<SkillEvidenceRecord[]>;

  // Audit/Events
  recordEvent(sessionId: string, event: string, data: Record<string, unknown>): Promise<void>;

  // History
  listSessionsForCandidate(candidateId: string): Promise<InterviewSession[]>;
}
