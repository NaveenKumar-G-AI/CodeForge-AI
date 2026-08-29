// Code Correctness Engine — deterministic classification, requirement coverage, regression, confidence
export { classify, clusterFailures } from './classify.js';
export { confidenceFromEvidenceCount, combineConfidence } from './confidence.js';
export { computeRequirementCoverage } from './requirementCoverage.js';
export { computeDelta } from './regression.js';

// Re-export types from domain
export type {
  CorrectnessStatus,
  ConfidenceLevel,
  ErrorCategory,
  CorrectnessTestOutcome,
  DeterministicVerdict,
  EvidenceConfidence,
  FailureCluster,
  SubmissionRef,
  CompilationEvidence,
  CorrectnessTestResult,
  CorrectnessExecutionEvidence,
  StaticFinding,
  CorrectnessRequirement as Requirement,
  RequirementCoverage,
  AIDegradationReason,
  CorrectnessDelta,
  CorrectnessAssessment,
  AIAnalysisResult,
  RootCause,
  AIFinding,
  MismatchType,
  SupportedLanguage,
  UUID,
  ISO8601,
} from '../../domain/types.js';
