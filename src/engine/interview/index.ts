/**
 * Technical Interview Engine - Feature 35
 * Evidence-verification interview orchestration layer
 *
 * This module handles:
 * - Interview blueprint creation (deterministic, no randomness)
 * - Session state machine (CREATED → READY → IN_PROGRESS → ...)
 * - Question generation with grounding in real evidence
 * - Response submission with idempotency
 * - Structured evaluation with qualitative bands (LOW/MODERATE/HIGH)
 * - Adaptive follow-up logic
 * - Coverage tracking (honest about incomplete)
 * - Evidence extraction (no fabricated mastery/readiness)
 */

// Re-export all types
export * from '../../domain/types.js';

// Core engine classes
export { InterviewOrchestrator } from './InterviewOrchestrator.js';
export { BlueprintBuilder } from './BlueprintBuilder.js';
export { QuestionSelector } from './QuestionSelector.js';
export { EvaluationPipeline } from './EvaluationPipeline.js';
export { EvidenceExtractor } from './EvidenceExtractor.js';
export { AdaptiveFollowUp } from './AdaptiveFollowUp.js';
export { CoverageTracker } from './CoverageTracker.js';
export { QuestionValidator } from './QuestionValidator.js';
export { SessionProgress } from './SessionProgress.js';
export { StateMachine } from './StateMachine.js';

// Repository interfaces
export { InterviewRepository } from './InterviewRepository.js';

// Service instance
export { interviewService } from './InterviewService.js';
