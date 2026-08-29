/**
 * Evaluation Pipeline - Feature 35
 * Runs AI evaluation with grounding enforcement per spec §44, §45
 */

import {
  EvaluationDimension,
  AnswerQuality,
  ConsistencyClassification,
  ConfidenceBand,
  StructuredEvaluation,
  TechnicalInterviewQuestion as InterviewQuestion,
  InterviewResponse,
  CandidateEvidenceBundle,
} from '../../domain/types.js';

export interface AIGateway {
  evaluateResponse(input: {
    question: InterviewQuestion;
    response: string;
    evidence: CandidateEvidenceBundle;
    dimensions: EvaluationDimension[];
  }): Promise<{
    answerQuality: AnswerQuality;
    consistency: ConsistencyClassification;
    dimensions: Partial<Record<EvaluationDimension, 'STRONG' | 'ADEQUATE' | 'WEAK' | 'NOT_APPLICABLE'>>;
    evidenceConfidence: ConfidenceBand;
    rationaleSummary: string;
    grounded: boolean;
  }>;
}

export interface EvaluationResult {
  ok: boolean;
  evaluation?: Omit<StructuredEvaluation, 'id' | 'responseId' | 'evaluationVersion' | 'status'>;
  error?: string;
}

export class EvaluationPipeline {
  constructor(
    private readonly aiGateway: AIGateway
  ) {}

  async evaluate(
    question: InterviewQuestion,
    response: InterviewResponse,
    evidence: CandidateEvidenceBundle,
    dimensions: EvaluationDimension[]
  ): Promise<EvaluationResult> {
    try {
      const raw = await this.aiGateway.evaluateResponse({
        question,
        response: response.responseText,
        evidence,
        dimensions,
      });

      // §44 Grounding enforcement: if not grounded, cap confidence at LOW
      if (!raw.grounded) {
        raw.evidenceConfidence = this.capAtLow(raw.evidenceConfidence);
      }

      return {
        ok: true,
        evaluation: {
          answerQuality: raw.answerQuality,
          consistency: raw.consistency,
          dimensions: raw.dimensions,
          evidenceConfidence: raw.evidenceConfidence,
          rationaleSummary: raw.rationaleSummary,
          grounded: raw.grounded,
        },
      };
    } catch (error) {
      // §45: AI failure → return error, never fabricate evaluation
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Evaluation failed',
      };
    }
  }

  /**
   * Cap confidence at LOW per §44 - never trust ungrounded output
   */
  private capAtLow(confidence: ConfidenceBand): ConfidenceBand {
    if (confidence === 'HIGH') return 'MODERATE';
    if (confidence === 'MODERATE') return 'LOW';
    return 'LOW';
  }
}
