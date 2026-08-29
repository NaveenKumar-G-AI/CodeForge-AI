// Code Quality Engine — Configuration Constants
import { QualityDimension, Severity, QualityConfidence } from '../../domain/types.js';

/** Base point deduction per severity level */
export const SEVERITY_BASE_DEDUCTION: Record<Severity, number> = {
  INFO: 1,
  LOW: 2,
  MEDIUM: 5,
  HIGH: 10,
  CRITICAL: 20,
};

/** Confidence multiplier — lower confidence findings deduct less */
export const CONFIDENCE_MULTIPLIER: Record<QualityConfidence, number> = {
  HIGH: 1.0,
  MEDIUM: 0.75,
  LOW: 0.5,
  UNKNOWN: 0.25,
};

/** Dimension weights — must sum to 1.0 */
export const DIMENSION_WEIGHTS: Record<QualityDimension, number> = {
  READABILITY: 0.15,
  MAINTAINABILITY: 0.15,
  STRUCTURAL_QUALITY: 0.15,
  SIMPLICITY: 0.1,
  CONSISTENCY: 0.1,
  DUPLICATION: 0.1,
  NAMING: 0.05,
  ROBUSTNESS: 0.1,
  ERROR_HANDLING: 0.05,
  ENGINEERING_PRACTICES: 0.05,
};

/** Score label thresholds */
export const SCORE_LABELS: Array<[number, string]> = [
  [90, 'EXCELLENT'],
  [80, 'GOOD'],
  [70, 'SATISFACTORY'],
  [60, 'NEEDS_IMPROVEMENT'],
  [0, 'POOR'],
];

/** Default rule set version */
export const DEFAULT_RULE_SET_VERSION = '1.0.0';
export const DEFAULT_ANALYSIS_VERSION = '1.0.0';