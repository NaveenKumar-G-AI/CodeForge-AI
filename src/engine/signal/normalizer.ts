// Skill Signal Intelligence — Evidence Normalization
import {
  RawEvidenceInput,
  NormalizedEvidence,
  SignalEvidenceType,
  SignalEvidenceStatus,
  SignalAssessmentTier,
  SignalSkillState,
  SignalTrend,
  SignalFreshness,
  AggregationResult,
  SkillSignal,
  SignalStudentId,
  SignalSkillId,
  CorrelationId,
  SIGNAL_MODEL_VERSION,
} from '../../domain/types.js';

/**
 * Normalize raw evidence into standard 0-1 scale
 */
export function normalizeEvidence(input: RawEvidenceInput, policyVersion: string = 'v1'): NormalizedEvidence[] {
  const results: NormalizedEvidence[] = [];

  for (const skillId of input.skillIds) {
    const rawValue = input.payload;
    const normalizedValue = normalizeValue(input.sourceType, rawValue, skillId);

    results.push({
      evidenceId: `${input.sourceType}-${input.sourceId}-${skillId}-${input.evidenceVersion ?? 1}`,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      studentId: input.studentId,
      skillId,
      rawValue,
      normalizedValue,
      status: determineStatus(input.sourceType, rawValue, normalizedValue),
      difficulty: input.difficulty ?? 0.5,
      contextGroup: input.contextGroup ?? 'default',
      assessmentTier: input.assessmentTier ?? SignalAssessmentTier.PRACTICE,
      sourceReliability: getSourceReliability(input.sourceType),
      independence: 1.0, // Would compute from context
      isTransfer: false, // Would determine from context
      occurredAt: input.occurredAt,
      evidenceVersion: input.evidenceVersion ?? 1,
      policyVersion,
    });
  }

  return results;
}

function normalizeValue(sourceType: SignalEvidenceType, rawValue: any, skillId: string): number {
  // Normalize different evidence types to 0-1 scale
  switch (sourceType) {
    case 'CHALLENGE_RESULT':
      return rawValue?.outcome === 'SUCCESS' ? 1 : rawValue?.outcome === 'PARTIAL' ? 0.5 : 0;

    case 'CORRECTNESS_RESULT':
      return rawValue?.passRate ?? 0;

    case 'COMPLEXITY_RESULT':
      // Normalize complexity claim accuracy
      return rawValue?.accuracy ?? 0;

    case 'QUALITY_RESULT':
      // Normalize quality score (0-100 -> 0-1)
      return (rawValue?.overallScore ?? 0) / 100;

    case 'REASONING_RESULT':
      return rawValue?.overallScore ?? 0;

    case 'DEBUGGING_RESULT':
      return (rawValue?.dimensions?.reduce((s: number, d: any) => s + d.score, 0) ?? 0) / 1000;

    case 'UNDERSTANDING_RESULT':
      return rawValue?.overallConfidence ?? 0;

    case 'TRANSFER_RESULT':
      return rawValue?.transferScore ?? 0;

    case 'ASSESSMENT_RESULT':
      return rawValue?.score ?? 0;

    default:
      return 0;
  }
}

function determineStatus(
  sourceType: SignalEvidenceType,
  rawValue: any,
  normalizedValue: number
): SignalEvidenceStatus {
  // Check for suspicious patterns
  if (normalizedValue === 1 && rawValue?.timeToSolveSeconds < 10) {
    return SignalEvidenceStatus.SUSPICIOUS; // Too fast for perfect score
  }
  if (normalizedValue === 0 && rawValue?.attempts > 10) {
    return SignalEvidenceStatus.SUSPICIOUS; // Many attempts but no progress
  }
  return SignalEvidenceStatus.VALID;
}

export function getSourceReliability(sourceType: SignalEvidenceType): number {
  const reliability: Record<SignalEvidenceType, number> = {
    CHALLENGE_RESULT: 0.9,
    CORRECTNESS_RESULT: 0.95,
    COMPLEXITY_RESULT: 0.8,
    QUALITY_RESULT: 0.85,
    REASONING_RESULT: 0.7,
    DEBUGGING_RESULT: 0.8,
    UNDERSTANDING_RESULT: 0.75,
    TRANSFER_RESULT: 0.7,
    ASSESSMENT_RESULT: 0.9,
  };
  return reliability[sourceType] ?? 0.5;
}

/**
 * Aggregate normalized evidence into skill signals
 */
export function aggregateEvidence(
  studentId: SignalStudentId,
  skillId: SignalSkillId,
  evidence: NormalizedEvidence[],
  policyVersion: string
): AggregationResult {
  const validEvidence = evidence.filter((e) => e.status === SignalEvidenceStatus.VALID);

  const total = evidence.length;
  const validCount = validEvidence.length;

  if (validCount === 0) {
    return {
      skillId,
      studentId,
      policyVersion,
      evidenceCount: total,
      validEvidenceCount: 0,
      weightedSignal: 0,
      recentWeightedSignal: null,
      historicalWeightedSignal: null,
      diversity: 0,
      distinctContexts: 0,
      transferEvidenceCount: 0,
      transferWeightedSignal: null,
      lastDemonstratedAt: null,
      firstObservedAt: null,
      avgSourceReliability: 0,
      contradictionMagnitude: 0,
      excludedCount: total,
    };
  }

  // Time-weighted aggregation
  const now = Date.now();
  const recentCutoff = now - 30 * 24 * 60 * 60 * 1000;

  let weightedSum = 0;
  let totalWeight = 0;
  let recentWeightedSum = 0;
  let recentTotalWeight = 0;
  let historicalWeightedSum = 0;
  let historicalTotalWeight = 0;

  const contexts = new Set<string>();
  let transferCount = 0;
  let transferWeightedSum = 0;
  let transferTotalWeight = 0;
  let lastDemo = 0;
  let firstObs = now;

  for (const ev of validEvidence) {
    const weight = ev.sourceReliability * ev.independence;
    const timeWeight = Math.exp(-(now - new Date(ev.occurredAt).getTime()) / (60 * 24 * 60 * 60 * 1000));
    const finalWeight = weight * timeWeight;

    weightedSum += ev.normalizedValue * finalWeight;
    totalWeight += finalWeight;

    const ts = new Date(ev.occurredAt).getTime();
    if (ts > recentCutoff) {
      recentWeightedSum += ev.normalizedValue * finalWeight;
      recentTotalWeight += finalWeight;
    } else {
      historicalWeightedSum += ev.normalizedValue * finalWeight;
      historicalTotalWeight += finalWeight;
    }

    contexts.add(ev.contextGroup);
    if (ev.isTransfer) {
      transferCount++;
      transferWeightedSum += ev.normalizedValue * finalWeight;
      transferTotalWeight += finalWeight;
    }

    if (ts > lastDemo) lastDemo = ts;
    if (ts < firstObs) firstObs = ts;
  }

  // Contradiction detection: variance in normalized values
  const values = validEvidence.map((e) => e.normalizedValue);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const contradictionMagnitude = Math.min(1, variance * 4); // Scale variance

  return {
    skillId,
    studentId,
    policyVersion,
    evidenceCount: total,
    validEvidenceCount: validCount,
    weightedSignal: totalWeight > 0 ? weightedSum / totalWeight : 0,
    recentWeightedSignal: recentTotalWeight > 0 ? recentWeightedSum / recentTotalWeight : null,
    historicalWeightedSignal: historicalTotalWeight > 0 ? historicalWeightedSum / historicalTotalWeight : null,
    diversity: Math.min(1, contexts.size / 5),
    distinctContexts: contexts.size,
    transferEvidenceCount: transferCount,
    transferWeightedSignal: transferTotalWeight > 0 ? transferWeightedSum / transferTotalWeight : null,
    lastDemonstratedAt: lastDemo > 0 ? new Date(lastDemo).toISOString() : null,
    firstObservedAt: firstObs < now ? new Date(firstObs).toISOString() : null,
    avgSourceReliability: validEvidence.reduce((s, e) => s + e.sourceReliability, 0) / validCount,
    contradictionMagnitude,
    excludedCount: total - validCount,
  };
}

/**
 * Derive skill state from aggregation
 */
export function deriveSkillState(
  aggregation: AggregationResult,
  previousState: SignalSkillState | null
): { state: SignalSkillState; trend: SignalTrend; freshness: SignalFreshness; confidence: number } {
  const { weightedSignal, recentWeightedSignal, historicalWeightedSignal, contradictionMagnitude, validEvidenceCount, diversity, lastDemonstratedAt } = aggregation;

  // Determine state
  let state: SignalSkillState;
  if (validEvidenceCount === 0) state = SignalSkillState.UNKNOWN;
  else if (weightedSignal >= 0.9 && diversity >= 0.6) state = SignalSkillState.MASTERED;
  else if (weightedSignal >= 0.8) state = SignalSkillState.PROFICIENT;
  else if (weightedSignal >= 0.6) state = SignalSkillState.PRACTICED;
  else if (weightedSignal >= 0.4) state = SignalSkillState.DEVELOPING;
  else if (weightedSignal >= 0.2) state = SignalSkillState.INTRODUCED;
  else state = SignalSkillState.UNKNOWN;

  // Check for special states
  if (contradictionMagnitude > 0.5) state = SignalSkillState.UNCERTAIN;
  if (recentWeightedSignal !== null && recentWeightedSignal < 0.3 && weightedSignal > 0.5) state = SignalSkillState.REGRESSING;
  if (lastDemonstratedAt) {
    const daysSince = (Date.now() - new Date(lastDemonstratedAt).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince > 60 && state !== SignalSkillState.UNKNOWN && state !== SignalSkillState.REGRESSING) state = SignalSkillState.AT_RISK;
    if (daysSince > 180 && state !== SignalSkillState.UNKNOWN) state = SignalSkillState.AT_RISK;
  }

  // Determine trend
  let trend: SignalTrend = SignalTrend.INSUFFICIENT_DATA;
  if (recentWeightedSignal !== null && historicalWeightedSignal !== null) {
    const diff = recentWeightedSignal - historicalWeightedSignal;
    if (diff > 0.1) trend = SignalTrend.IMPROVING;
    else if (diff < -0.1) trend = SignalTrend.DECLINING;
    else trend = SignalTrend.STABLE;
  } else if (validEvidenceCount >= 5) {
    // Could compute from evidence time series
    trend = SignalTrend.STABLE;
  }

  // Determine freshness
  let freshness: SignalFreshness = SignalFreshness.UNKNOWN;
  if (lastDemonstratedAt) {
    const daysSince = (Date.now() - new Date(lastDemonstratedAt).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince <= 7) freshness = SignalFreshness.RECENT;
    else if (daysSince <= 30) freshness = SignalFreshness.AGING;
    else if (daysSince <= 90) freshness = SignalFreshness.STALE;
    else freshness = SignalFreshness.VERY_STALE;
  }

  // Confidence
  let confidence = Math.min(1, validEvidenceCount / 10 + diversity * 0.3);
  if (contradictionMagnitude > 0.3) confidence *= 0.7;
  if (state === SignalSkillState.UNCERTAIN) confidence = Math.min(confidence, 0.4);

  return { state, trend, freshness, confidence };
}

/**
 * Build skill signal from aggregation
 */
export function buildSkillSignal(
  studentId: SignalStudentId,
  skillId: SignalSkillId,
  aggregation: AggregationResult,
  previousSignal: SkillSignal | null
): SkillSignal {
  const { state, trend, freshness, confidence } = deriveSkillState(aggregation, previousSignal?.state ?? null);

  // Compute retention (how well skill holds over time)
  let retention: number | null = null;
  if (aggregation.historicalWeightedSignal !== null && aggregation.recentWeightedSignal !== null) {
    retention = aggregation.recentWeightedSignal / aggregation.historicalWeightedSignal;
    retention = Math.max(0, Math.min(1, retention));
  }

  // Transfer confidence
  let transferConfidence = 0;
  if (aggregation.transferEvidenceCount > 0 && aggregation.transferWeightedSignal !== null) {
    transferConfidence = aggregation.transferWeightedSignal * Math.min(1, aggregation.transferEvidenceCount / 3);
  }

  const version = (previousSignal?.version ?? 0) + 1;

  return {
    skillId,
    studentId,
    signal: Math.round(aggregation.weightedSignal * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    state,
    trend,
    freshness,
    evidenceCount: aggregation.validEvidenceCount,
    diversity: aggregation.diversity,
    transferConfidence: Math.round(transferConfidence * 100) / 100,
    retention: retention ? Math.round(retention * 100) / 100 : null,
    lastDemonstratedAt: aggregation.lastDemonstratedAt,
    firstObservedAt: aggregation.firstObservedAt,
    contradiction: aggregation.contradictionMagnitude > 0.5,
    modelVersion: SIGNAL_MODEL_VERSION,
    policyVersion: aggregation.policyVersion,
    updatedAt: new Date().toISOString(),
    version,
  };
}

/**
 * Generate explanation for skill signal
 */
export function generateSignalExplanation(signal: SkillSignal): string {
  const parts: string[] = [];

  parts.push(`Skill signal: ${Math.round(signal.signal * 100)}% (confidence: ${Math.round(signal.confidence * 100)}%)`);
  parts.push(`State: ${signal.state}`);

  if (signal.trend !== SignalTrend.INSUFFICIENT_DATA) {
    parts.push(`Trend: ${signal.trend.toLowerCase()}`);
  }

  if (signal.freshness !== SignalFreshness.UNKNOWN) {
    parts.push(`Evidence freshness: ${signal.freshness.toLowerCase()}`);
  }

  if (signal.evidenceCount > 0) {
    parts.push(`Based on ${signal.evidenceCount} evidence point${signal.evidenceCount > 1 ? 's' : ''}`);
  }

  if (signal.diversity > 0) {
    parts.push(`Diversity: ${Math.round(signal.diversity * 100)}%`);
  }

  if (signal.contradiction) {
    parts.push('⚠️ Contradictory evidence detected');
  }

  if (signal.transferConfidence > 0) {
    parts.push(`Transfer confidence: ${Math.round(signal.transferConfidence * 100)}%`);
  }

  if (signal.retention !== null) {
    parts.push(`Retention: ${Math.round(signal.retention * 100)}%`);
  }

  return parts.join(' | ');
}
