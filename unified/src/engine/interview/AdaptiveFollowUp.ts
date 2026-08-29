/**
 * Adaptive Follow-Up - Feature 35
 * Decides follow-up actions per spec §26
 */

import {
  AnswerQuality,
  ConsistencyClassification,
  FollowUpReason,
  DepthLevel,
  StructuredEvaluation,
} from '../../domain/types.js';

export interface FollowUpDecision {
  action: 'DEEPER' | 'CLARIFICATION' | 'VERIFICATION' | 'EVIDENCE_CHECK' | 'NEW_TOPIC';
  reason: FollowUpReason;
  nextDepth?: DepthLevel;
}

export interface FollowUpInput {
  answerQuality: AnswerQuality;
  consistency: ConsistencyClassification;
  currentDepth: DepthLevel;
  followUpsSoFarForTopic: number;
  retriesAtCurrentDepth: number;
  maxFollowUpsPerQuestion: number;
  maxDepthPerTopic: number;
}

export class AdaptiveFollowUp {
  /**
   * Decide follow-up action per spec §26
   * Priority order matters!
   */
  static decide(input: FollowUpInput): FollowUpDecision {
    const { answerQuality, consistency, currentDepth, followUpsSoFarForTopic, retriesAtCurrentDepth, maxFollowUpsPerQuestion, maxDepthPerTopic } = input;

    // Budget check: too many follow-ups on this topic
    if (followUpsSoFarForTopic >= maxFollowUpsPerQuestion) {
      return { action: 'NEW_TOPIC', reason: 'DEEPER' };
    }

    // Budget check: too many retries at current depth
    if (retriesAtCurrentDepth >= 1) {
      // Move to next depth or new topic
      const nextDepth = this.nextRung(currentDepth);
      if (nextDepth && followUpsSoFarForTopic < maxFollowUpsPerQuestion) {
        return { action: 'DEEPER', reason: 'DEEPER', nextDepth };
      }
      return { action: 'NEW_TOPIC', reason: 'DEEPER' };
    }

    // Priority 1: POTENTIAL_INCONSISTENCY → EVIDENCE_CHECK (regardless of answer quality, §21)
    if (consistency === 'POTENTIAL_INCONSISTENCY') {
      return { action: 'EVIDENCE_CHECK', reason: 'EVIDENCE_CHECK' };
    }

    // Priority 2: UNCERTAIN consistency → VERIFICATION (one retry)
    if (consistency === 'UNCERTAIN') {
      return { action: 'VERIFICATION', reason: 'VERIFICATION' };
    }

    // Priority 3: DONT_KNOW → NEW_TOPIC (recorded as evidence, not interrogation §32)
    if (answerQuality === 'DONT_KNOW') {
      return { action: 'NEW_TOPIC', reason: 'DEEPER' };
    }

    // Priority 4: PARTIALLY_CORRECT / INSUFFICIENT → CLARIFICATION (one retry)
    if (answerQuality === 'PARTIALLY_CORRECT' || answerQuality === 'INSUFFICIENT') {
      return { action: 'CLARIFICATION', reason: 'CLARIFICATION' };
    }

    // Priority 5: INCORRECT → CLARIFICATION (one retry, anti-gaming §51) or NEW_TOPIC
    if (answerQuality === 'INCORRECT') {
      // Could retry once, but spec says anti-gaming - so move on
      return { action: 'NEW_TOPIC', reason: 'DEEPER' };
    }

    // Priority 6: CORRECT / MOSTLY_CORRECT → DEEPER (next rung on ladder §27) or NEW_TOPIC if exhausted
    if (answerQuality === 'CORRECT' || answerQuality === 'MOSTLY_CORRECT') {
      const nextDepth = this.nextRung(currentDepth);
      if (nextDepth && followUpsSoFarForTopic < maxFollowUpsPerQuestion) {
        return { action: 'DEEPER', reason: 'DEEPER', nextDepth };
      }
      return { action: 'NEW_TOPIC', reason: 'DEEPER' };
    }

    // Fallback
    return { action: 'NEW_TOPIC', reason: 'DEEPER' };
  }

  /**
   * Get next depth level per §27 progressive depth ladder
   */
  static nextRung(current: DepthLevel): DepthLevel | null {
    const ladder: DepthLevel[] = ['DEFINITION', 'APPLICATION', 'REASONING', 'TRADE_OFF', 'FAILURE_SCENARIO'];
    const idx = ladder.indexOf(current);
    if (idx >= 0 && idx < ladder.length - 1) {
      return ladder[idx + 1];
    }
    return null;
  }
}
