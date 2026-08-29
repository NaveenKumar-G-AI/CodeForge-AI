// Growth Intelligence Engine
import {
  GrowthEvidenceSource,
  GrowthEvidenceQuality,
  GrowthEvidenceOutcome,
  GrowthSkillEvidence,
  GrowthSkillState,
  GrowthState,
  GrowthEvent,
  GrowthMilestone,
  GrowthSnapshot,
  GrowthEvidenceRef,
  SkillObservation,
  GrowthMeasurement,
  GrowthUnavailable,
  GrowthResult,
  GrowthConfidence,
  GrowthEvidenceType,
  GrowthDifficultyLevel,
  GrowthEvidenceDimension,
  isGrowthAvailable,
} from '../../domain/types.js';

/**
 * Ingest raw evidence into growth evidence store
 */
export function ingestGrowthEvidence(input: {
  studentId: string;
  source: GrowthEvidenceSource;
  sourceRecordId: string;
  skillId: string;
  evidenceType: GrowthEvidenceQuality;
  outcome: GrowthEvidenceOutcome;
  strength: number;
  confidence: number;
  timestamp: string;
  challengeContext?: Record<string, unknown>;
  roleContext?: string;
  transferContext?: { isTransferAttempt: boolean; baseContext?: string; novelContext?: string };
  metadata?: Record<string, unknown>;
}): GrowthSkillEvidence {
  return {
    evidenceId: `${input.source}-${input.sourceRecordId}-${input.skillId}`,
    studentId: input.studentId,
    source: input.source,
    sourceRecordId: input.sourceRecordId,
    skillId: input.skillId,
    evidenceType: input.evidenceType,
    outcome: input.outcome,
    strength: Math.max(0, Math.min(1, input.strength)),
    confidence: Math.max(0, Math.min(1, input.confidence)),
    timestamp: input.timestamp,
    challengeContext: input.challengeContext,
    roleContext: input.roleContext,
    transferContext: input.transferContext,
    metadata: input.metadata,
    evidenceModelVersion: 'v1',
  };
}

/**
 * Update skill state from new evidence
 */
export function updateSkillState(
  currentState: GrowthSkillState | null,
  newEvidence: GrowthSkillEvidence[],
  allEvidence: GrowthSkillEvidence[]
): GrowthSkillState {
  const validEvidence = allEvidence.filter((e) => e.confidence > 0.3);
  const evidenceCount = validEvidence.length;

  if (evidenceCount === 0) {
    return {
      skillId: newEvidence[0]?.skillId ?? '',
      studentId: newEvidence[0]?.studentId ?? '',
      state: 'NO_EVIDENCE',
      confidence: 0,
      lastEvidenceAt: null,
      evidenceCount: 0,
      trend: 'INSUFFICIENT',
      trajectory: [],
      updatedAt: new Date().toISOString(),
    };
  }

  // Compute weighted signal
  let weightedSum = 0;
  let totalWeight = 0;
  const trajectory: number[] = [];

  // Sort by timestamp
  const sorted = [...validEvidence].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const ev of sorted) {
    const weight = ev.strength * ev.confidence;
    const value = ev.outcome === 'positive' ? 1 : ev.outcome === 'negative' ? 0 : 0.5;
    weightedSum += value * weight;
    totalWeight += weight;
    trajectory.push(Math.round((weightedSum / totalWeight) * 100));
  }

  const signal = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const lastEvidence = sorted[sorted.length - 1];

  // Determine state
  let state: GrowthState;
  if (signal >= 0.9) state = 'MASTERED';
  else if (signal >= 0.75) state = 'STRONG';
  else if (signal >= 0.6) state = 'PROFICIENT';
  else if (signal >= 0.35) state = 'DEVELOPING';
  else if (signal >= 0.15) state = 'EMERGING';
  else state = 'NO_EVIDENCE';

  // Check for regression
  if (trajectory.length >= 5) {
    const recent = trajectory.slice(-3);
    const older = trajectory.slice(-6, -3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    if (olderAvg - recentAvg > 20) state = 'REGRESSING';
  }

  // Check for at-risk (was good but no recent evidence)
  if (state !== 'NO_EVIDENCE' && state !== 'REGRESSING') {
    const daysSince = (Date.now() - new Date(lastEvidence.timestamp).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince > 60) state = 'AT_RISK';
    if (daysSince > 180) state = 'STALE';
  }

  // Confidence
  const avgConfidence = validEvidence.reduce((s, e) => s + e.confidence, 0) / validEvidence.length;
  const diversity = new Set(validEvidence.map((e) => e.source)).size / 5;
  const confidence = Math.min(1, avgConfidence * 0.7 + diversity * 0.3);

  // Trend
  let trend: GrowthSkillState['trend'] = 'INSUFFICIENT';
  if (trajectory.length >= 5) {
    const firstHalf = trajectory.slice(0, Math.floor(trajectory.length / 2));
    const secondHalf = trajectory.slice(Math.floor(trajectory.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    if (secondAvg > firstAvg + 10) trend = 'IMPROVING';
    else if (firstAvg > secondAvg + 10) trend = 'DECLINING';
    else trend = 'STABLE';
  }

  return {
    skillId: newEvidence[0].skillId,
    studentId: newEvidence[0].studentId,
    state,
    confidence: Math.round(confidence * 100) / 100,
    lastEvidenceAt: lastEvidence.timestamp,
    evidenceCount,
    trend,
    trajectory: trajectory.slice(-20), // Keep last 20 points
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Check for milestones
 */
export function checkMilestones(
  studentId: string,
  skillId: string,
  previousState: GrowthSkillState | null,
  currentState: GrowthSkillState,
  evidence: GrowthSkillEvidence[]
): GrowthMilestone[] {
  const milestones: GrowthMilestone[] = [];

  // First success
  if (!previousState && currentState.state !== 'NO_EVIDENCE' && currentState.state !== 'EMERGING') {
    milestones.push({
      id: `milestone-${studentId}-${skillId}-first`,
      studentId,
      skillId,
      type: 'FIRST_SUCCESS',
      reachedAt: new Date().toISOString(),
    });
  }

  // Level milestones
  const levelMilestones: Partial<Record<GrowthState, 'PROFICIENT' | 'STRONG' | 'MASTERED'>> = {
    PROFICIENT: 'PROFICIENT',
    STRONG: 'STRONG',
    MASTERED: 'MASTERED',
  };

  const levelType = levelMilestones[currentState.state];
  if (levelType && (!previousState || previousState.state !== currentState.state)) {
    milestones.push({
      id: `milestone-${studentId}-${skillId}-${levelType.toLowerCase()}`,
      studentId,
      skillId,
      type: levelType,
      reachedAt: new Date().toISOString(),
    });
  }

  // Transfer success
  const hasTransfer = evidence.some((e) => e.transferContext?.isTransferAttempt && e.outcome === 'positive');
  if (hasTransfer && currentState.state === 'PROFICIENT') {
    milestones.push({
      id: `milestone-${studentId}-${skillId}-transfer`,
      studentId,
      skillId,
      type: 'TRANSFER_SUCCESS',
      reachedAt: new Date().toISOString(),
    });
  }

  // Retention (skill maintained over 90 days)
  if (currentState.state === 'MASTERED' || currentState.state === 'STRONG') {
    const firstEvidence = evidence.reduce((earliest, e) =>
      new Date(e.timestamp) < new Date(earliest.timestamp) ? e : earliest
    );
    const daysSinceFirst = (Date.now() - new Date(firstEvidence.timestamp).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceFirst > 90) {
      milestones.push({
        id: `milestone-${studentId}-${skillId}-retention`,
        studentId,
        skillId,
        type: 'RETENTION',
        reachedAt: new Date().toISOString(),
      });
    }
  }

  // Consistency (stable high performance over 5+ evidence points)
  if (currentState.trajectory.length >= 5) {
    const recent = currentState.trajectory.slice(-5);
    const allHigh = recent.every((v) => v >= 70);
    if (allHigh) {
      milestones.push({
        id: `milestone-${studentId}-${skillId}-consistency`,
        studentId,
        skillId,
        type: 'CONSISTENCY',
        reachedAt: new Date().toISOString(),
      });
    }
  }

  return milestones;
}

/**
 * Compute growth measurement between two observations
 */
export function computeGrowth(
  baseline: SkillObservation,
  current: SkillObservation
): GrowthResult {
  if (!baseline.evidence || baseline.evidence.length === 0) {
    return { unavailable: true, skillId: baseline.skillId, reasons: ['No baseline evidence'] };
  }
  if (!current.evidence || current.evidence.length === 0) {
    return { unavailable: true, skillId: current.skillId, reasons: ['No current evidence'] };
  }

  // Check comparability
  const comparability = checkComparability(baseline, current);
  if (!comparability.comparable) {
    return { unavailable: true, skillId: current.skillId, reasons: comparability.reasons };
  }

  const absoluteChange = current.value - baseline.value;
  const relativeChange = baseline.value !== 0 ? absoluteChange / baseline.value : null;

  // Confidence based on evidence quality
  const baselineConfidence = computeObservationConfidence(baseline);
  const currentConfidence = computeObservationConfidence(current);
  const confidence = Math.min(baselineConfidence, currentConfidence);

  const confidenceLabels: GrowthConfidence[] = ['INSUFFICIENT', 'LOW', 'MODERATE', 'HIGH'];
  const confidenceLabel = confidenceLabels[Math.floor(confidence * 3.99)];

  return {
    unavailable: false,
    skillId: current.skillId,
    baselineValue: baseline.value,
    currentValue: current.value,
    absoluteChange: Math.round(absoluteChange * 100) / 100,
    relativeChange: relativeChange !== null ? Math.round(relativeChange * 10000) / 10000 : null,
    confidence: confidenceLabel,
    evidenceCount: baseline.evidence.length + current.evidence.length,
    firstObservedAt: baseline.observedAt,
    lastObservedAt: current.observedAt,
  };
}

export function checkComparability(
  baseline: SkillObservation,
  current: SkillObservation
): { comparable: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (baseline.calculationVersion !== current.calculationVersion) {
    reasons.push(`Calculation version mismatch: ${baseline.calculationVersion} vs ${current.calculationVersion}`);
  }
  if (baseline.sourceType !== current.sourceType) {
    reasons.push(`Source type mismatch: ${baseline.sourceType} vs ${current.sourceType}`);
  }
  if (baseline.assessmentType !== current.assessmentType) {
    reasons.push(`Assessment type mismatch: ${baseline.assessmentType} vs ${current.assessmentType}`);
  }

  return {
    comparable: reasons.length === 0,
    reasons,
  };
}

function computeObservationConfidence(obs: SkillObservation): number {
  let confidence = 0.5;
  for (const ev of obs.evidence) {
    if (ev.successful) confidence += 0.1;
    if (ev.demonstratesComplexityReasoning) confidence += 0.1;
    if (ev.difficulty === 'ADVANCED' || ev.difficulty === 'EXPERT') confidence += 0.1;
  }
  return Math.min(1, confidence);
}

/**
 * Build growth snapshot
 */
export function buildGrowthSnapshot(
  studentId: string,
  skillStates: GrowthSkillState[],
  milestones: GrowthMilestone[]
): GrowthSnapshot {
  return {
    id: `snapshot-${studentId}-${Date.now()}`,
    studentId,
    takenAt: new Date().toISOString(),
    skillStates,
    milestones,
    modelVersion: 'v1',
  };
}

/**
 * Detect growth events from state changes
 */
export function detectGrowthEvents(
  studentId: string,
  skillId: string,
  previousState: GrowthSkillState | null,
  currentState: GrowthSkillState,
  milestones: GrowthMilestone[]
): GrowthEvent[] {
  const events: GrowthEvent[] = [];

  // State changed
  if (previousState && previousState.state !== currentState.state) {
    events.push({
      id: `event-${studentId}-${skillId}-${Date.now()}`,
      studentId,
      skillId,
      type: 'STATE_CHANGED',
      payload: {
        from: previousState.state,
        to: currentState.state,
        confidence: currentState.confidence,
      } as Record<string, unknown>,
      occurredAt: new Date().toISOString(),
    } as GrowthEvent);
  }

  // Milestones reached
  for (const milestone of milestones) {
    events.push({
      id: `event-${milestone.id}`,
      studentId,
      skillId,
      type: 'MILESTONE_REACHED',
      payload: { milestoneType: milestone.type } as Record<string, unknown>,
      occurredAt: milestone.reachedAt,
    } as GrowthEvent);
  }

  // Regression detected
  if (currentState.trend === 'DECLINING' && previousState?.trend !== 'DECLINING') {
    events.push({
      id: `event-${studentId}-${skillId}-regression-${Date.now()}`,
      studentId,
      skillId,
      type: 'REGRESSION_DETECTED',
      payload: { previousTrend: previousState?.trend, trajectory: currentState.trajectory } as Record<string, unknown>,
      occurredAt: new Date().toISOString(),
    } as GrowthEvent);
  }

  return events;
}