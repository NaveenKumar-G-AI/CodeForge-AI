/**
 * Session Progress - Feature 35
 * Derives session state from questions, responses, and evaluations
 */

import {
  TechnicalInterviewQuestion as InterviewQuestion,
  InterviewResponse,
  StructuredEvaluation,
  DepthLevel,
} from '../../domain/types.js';
import type { SkillProgress } from './CoverageTracker.js';

export interface CurrentTopicState {
  skill: string;
  depthLevel: DepthLevel;
  rootQuestionId: string;
  followUpsSoFarForTopic: number;
  retriesAtCurrentDepth: number;
}

export class SessionProgress {
  /**
   * Derive per-skill progress from session data
   */
  static deriveSkillProgress(
    questions: InterviewQuestion[],
    responsesByQuestionId: Record<string, InterviewResponse>,
    evaluationsByResponseId: Record<string, StructuredEvaluation>
  ): Record<string, SkillProgress> {
    const progress: Record<string, SkillProgress> = {};

    for (const question of questions) {
      const response = responsesByQuestionId[question.id];
      if (!response) continue;

      const evaluation = evaluationsByResponseId[response.id];
      if (!evaluation || evaluation.status !== 'COMPLETED') continue;

      const existing = progress[question.skill] || {
        skill: question.skill,
        questionsAsked: 0,
        highestConfidence: null as 'LOW' | 'MODERATE' | 'HIGH' | null,
        supportingEvaluationIds: [],
      };

      existing.questionsAsked++;

      const confidenceRank = { LOW: 0, MODERATE: 1, HIGH: 2 };
      const evidenceConfidence = evaluation.evidenceConfidence as keyof typeof confidenceRank;
      if (existing.highestConfidence === null || confidenceRank[evidenceConfidence] > confidenceRank[existing.highestConfidence]) {
        existing.highestConfidence = evaluation.evidenceConfidence;
      }

      existing.supportingEvaluationIds.push(evaluation.id);

      progress[question.skill] = existing;
    }

    return progress;
  }

  /**
   * Get recent skills for diversity window per §13
   */
  static recentSkillsMostRecentFirst(questions: InterviewQuestion[], window: number): string[] {
    return questions
      .slice(-window)
      .map(q => q.skill)
      .reverse(); // Most recent first
  }

  /**
   * Analyze current topic state per §26-27
   * Reconstructs topic chain from parentQuestionId
   */
  static analyzeCurrentTopic(questions: InterviewQuestion[]): CurrentTopicState | null {
    if (questions.length === 0) return null;

    // Find the most recent question that has a response
    const lastQuestion = questions[questions.length - 1];

    // Follow parentQuestionId chain to find root
    let current = lastQuestion;
    const chain: InterviewQuestion[] = [current];

    while (current.parentQuestionId) {
      const parent = questions.find(q => q.id === current.parentQuestionId);
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }

    if (chain.length === 0) return null;

    const root = chain[0];
    const followUpsSoFar = chain.length - 1;

    // Count retries at current depth (consecutive same-depth questions at end)
    let retriesAtCurrentDepth = 0;
    const currentDepth = lastQuestion.depthLevel;
    for (let i = chain.length - 1; i >= 0; i--) {
      if (chain[i].depthLevel === currentDepth) {
        retriesAtCurrentDepth++;
      } else {
        break;
      }
    }
    // Subtract 1 because the first question at this depth isn't a retry
    retriesAtCurrentDepth = Math.max(0, retriesAtCurrentDepth - 1);

    return {
      skill: root.skill,
      depthLevel: lastQuestion.depthLevel,
      rootQuestionId: root.id,
      followUpsSoFarForTopic: followUpsSoFar,
      retriesAtCurrentDepth,
    };
  }
}
