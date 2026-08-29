/**
 * CodeForge AI — Mastery Estimation Engine
 *
 * Parts 5, 9: Weighted evidence-based mastery computation with
 * recency decay, difficulty weighting, independence weighting,
 * repeated mistake penalties, and prerequisite gating.
 */

import type {
  UUID,
  Evidence,
  StudentSkillState,
  MasteryLevel,
  SkillLevel,
  AssistanceLevel,
  Trend,
} from '../domain/types.js';
import { MASTERY_LEVELS, SKILL_LEVELS, iso8601 } from '../domain/types.js';
import {
  MASTERY_CONFIG,
  GAP_CONFIG,
} from '../config/index.js';

// ============================================================================
// RECENCY WEIGHTING
// ============================================================================

/**
 * Calculate recency weight using exponential decay.
 * Half-life configured in MASTERY_CONFIG.recencyHalfLifeDays
 */
export function calculateRecencyWeight(createdAt: string, now: Date = new Date()): number {
  const created = new Date(createdAt);
  const ageDays = Math.max(0, (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return Math.pow(0.5, ageDays / MASTERY_CONFIG.recencyHalfLifeDays);
}

// ============================================================================
// DIFFICULTY WEIGHTING
// ============================================================================

/**
 * Map difficulty score (1-10) to weight multiplier.
 * Linear interpolation between min and max.
 */
export function calculateDifficultyWeight(difficultyScore: number): number {
  const { difficultyWeightMin, difficultyWeightMax } = MASTERY_CONFIG;
  const normalized = Math.max(0, Math.min(1, (difficultyScore - 1) / 9));
  return difficultyWeightMin + normalized * (difficultyWeightMax - difficultyWeightMin);
}

// ============================================================================
// INDEPENDENCE WEIGHTING
// ============================================================================

export function calculateIndependenceWeight(assistanceUsed: AssistanceLevel): number {
  return MASTERY_CONFIG.independenceMultiplier[assistanceUsed];
}

// ============================================================================
// EVIDENCE WEIGHT CALCULATION
// ============================================================================

export interface EvidenceWeight {
  evidence: Evidence;
  weight: number;
  rawScore: number;
  difficultyWeight: number;
  independenceWeight: number;
  recencyWeight: number;
}

export function calculateEvidenceWeight(evidence: Evidence, now: Date = new Date()): EvidenceWeight {
  const difficultyWeight = calculateDifficultyWeight(evidence.difficultyScore);
  const independenceWeight = calculateIndependenceWeight(evidence.assistanceUsed);
  const recencyWeight = calculateRecencyWeight(evidence.createdAt, now);

  const weight = difficultyWeight * independenceWeight * recencyWeight;

  return {
    evidence,
    weight,
    rawScore: evidence.rawScore,
    difficultyWeight,
    independenceWeight,
    recencyWeight,
  };
}

export function filterAlgorithmicEvidence(evidence: Evidence[]): Evidence[] {
  return evidence.filter(e => !e.languageIssue);
}

// ============================================================================
// MASTERY COMPUTATION
// ============================================================================

export interface MasteryComputation {
  masteryScore: number;              // 0-100
  weightedAverage: number;           // 0-1, before penalties/caps
  repeatedMistakePenalty: number;    // 0-1 multiplier
  prerequisiteCap: number | null;    // 0-1 cap from prerequisites
  evidenceUsed: number;
  independentEvidenceCount: number;
  distinctChallenges: number;
  distinctDifficultyLevels: number;
  isVerified: boolean;
}

export function computeMastery(
  evidence: Evidence[],
  prerequisiteStates: Map<UUID, StudentSkillState> = new Map(),
  now: Date = new Date()
): MasteryComputation {
  // Filter out language-issue evidence for algorithmic skills
  const algorithmicEvidence = filterAlgorithmicEvidence(evidence);

  if (algorithmicEvidence.length === 0) {
    return {
      masteryScore: 0,
      weightedAverage: 0,
      repeatedMistakePenalty: 1,
      prerequisiteCap: null,
      evidenceUsed: 0,
      independentEvidenceCount: 0,
      distinctChallenges: 0,
      distinctDifficultyLevels: 0,
      isVerified: false,
    };
  }

  // Calculate weights for each piece of evidence
  const weighted = algorithmicEvidence.map(e => calculateEvidenceWeight(e, now));

  // Weighted average
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  const weightedSum = weighted.reduce((sum, w) => sum + w.rawScore * w.weight, 0);
  const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Repeated mistake penalty
  const repeatedMistakePenalty = calculateRepeatedMistakePenalty(algorithmicEvidence);

  // Prerequisite cap
  const prerequisiteCap = calculatePrerequisiteCap(prerequisiteStates);

  // Apply penalties
  let finalScore = weightedAverage * repeatedMistakePenalty;
  if (prerequisiteCap !== null) {
    finalScore = Math.min(finalScore, prerequisiteCap);
  }

  // Count distinct challenges and difficulty levels
  const challengeIds = new Set(algorithmicEvidence.map(e => e.challengeId));
  const difficultyLevels = new Set(
    algorithmicEvidence.map(e => Math.round(e.difficultyScore))
  );
  const independentCount = algorithmicEvidence.filter(e => e.independent).length;

  // Check verification gates
  const isVerified = checkVerificationGates(algorithmicEvidence);

  return {
    masteryScore: Math.round(finalScore * 100),
    weightedAverage,
    repeatedMistakePenalty,
    prerequisiteCap,
    evidenceUsed: algorithmicEvidence.length,
    independentEvidenceCount: independentCount,
    distinctChallenges: challengeIds.size,
    distinctDifficultyLevels: difficultyLevels.size,
    isVerified,
  };
}

function calculateRepeatedMistakePenalty(evidence: Evidence[]): number {
  const { repeatedMistakeWindow, repeatedMistakeThresholdFraction, repeatedMistakePenalty } = MASTERY_CONFIG;

  if (evidence.length < repeatedMistakeWindow) {
    return 1;
  }

  // Look at the most recent `window` pieces of evidence
  const recent = [...evidence]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, repeatedMistakeWindow);

  // Count mistake categories
  const mistakeCounts = new Map<string, number>();
  for (const e of recent) {
    if (e.mistakeCategory) {
      mistakeCounts.set(e.mistakeCategory, (mistakeCounts.get(e.mistakeCategory) || 0) + 1);
    }
  }

  // Check if any mistake category exceeds threshold
  for (const [, count] of mistakeCounts) {
    if (count / recent.length >= repeatedMistakeThresholdFraction) {
      return repeatedMistakePenalty;
    }
  }

  return 1;
}

function calculatePrerequisiteCap(prerequisiteStates: Map<UUID, StudentSkillState>): number | null {
  let minPrerequisiteScore: number | null = null;

  for (const [, state] of prerequisiteStates) {
    if (state.masteryState === 'NOVICE' || state.masteryState === 'DEVELOPING') {
      // Prerequisite not ready - cap at prerequisite's score
      const prereqScore = state.masteryScore / 100;
      if (minPrerequisiteScore === null || prereqScore < minPrerequisiteScore) {
        minPrerequisiteScore = prereqScore;
      }
    }
  }

  return minPrerequisiteScore;
}

function checkVerificationGates(evidence: Evidence[]): boolean {
  const { verifiedRequiresIndependent, verifiedRequiresTransfer, verifiedRequiresHighStakes } = MASTERY_CONFIG;

  if (!verifiedRequiresIndependent && !verifiedRequiresTransfer && !verifiedRequiresHighStakes) {
    return true;
  }

  let hasIndependent = false;
  let hasTransfer = false;
  let hasHighStakes = false;

  for (const e of evidence) {
    if (e.independent) hasIndependent = true;
    if (e.contextType === 'NOVEL' || e.contextType === 'TRANSFER') hasTransfer = true;
    if (e.contextType === 'VERIFICATION') hasHighStakes = true;
  }

  if (verifiedRequiresIndependent && !hasIndependent) return false;
  if (verifiedRequiresTransfer && !hasTransfer) return false;
  if (verifiedRequiresHighStakes && !hasHighStakes) return false;

  return true;
}

// ============================================================================
// CONFIDENCE COMPUTATION
// ============================================================================

export function computeConfidence(evidence: Evidence[], masteryScore: number): number {
  if (evidence.length === 0) return 0;

  const algorithmicEvidence = evidence.filter(e => !e.languageIssue);
  if (algorithmicEvidence.length === 0) return 0;

  // Base confidence from evidence count (logarithmic)
  const evidenceCountFactor = Math.min(1, Math.log(algorithmicEvidence.length + 1) / Math.log(11));

  // Consistency factor - low variance in recent scores
  const recent = [...algorithmicEvidence]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  let consistencyFactor = 1;
  if (recent.length >= 2) {
    const scores = recent.map(e => e.rawScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    consistencyFactor = Math.max(0.3, 1 - stdDev * 2); // Penalize high variance
  }

  // Independence factor
  const independentCount = algorithmicEvidence.filter(e => e.independent).length;
  const independenceFactor = Math.min(1, independentCount / 3);

  // Distinct challenge factor
  const distinctChallenges = new Set(algorithmicEvidence.map(e => e.challengeId)).size;
  const distinctFactor = Math.min(1, distinctChallenges / 5);

  // Combine factors
  const confidence = (
    evidenceCountFactor * 0.3 +
    consistencyFactor * 0.3 +
    independenceFactor * 0.2 +
    distinctFactor * 0.2
  );

  return Math.max(0, Math.min(1, confidence));
}

// ============================================================================
// TREND COMPUTATION
// ============================================================================

export function computeTrend(evidence: Evidence[]): Trend {
  const algorithmicEvidence = evidence.filter(e => !e.languageIssue);

  if (algorithmicEvidence.length < 2) return 'STABLE';

  // Sort by date ascending
  const sorted = [...algorithmicEvidence].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Compare first half vs second half
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  if (firstHalf.length === 0 || secondHalf.length === 0) return 'STABLE';

  const firstAvg = firstHalf.reduce((sum, e) => sum + e.rawScore, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, e) => sum + e.rawScore, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;

  if (diff > 0.15) return 'IMPROVING';
  if (diff < -0.15) return 'DECLINING';
  return 'STABLE';
}

// ============================================================================
// CONTRADICTION DETECTION
// ============================================================================

export function detectContradiction(evidence: Evidence[]): boolean {
  const algorithmicEvidence = evidence.filter(e => !e.languageIssue);

  if (algorithmicEvidence.length < 3) return false;

  // Sort by date
  const sorted = [...algorithmicEvidence].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Check for dramatic swings (high-low-high or low-high-low)
  for (let i = 2; i < sorted.length; i++) {
    const a = sorted[i - 2].rawScore;
    const b = sorted[i - 1].rawScore;
    const c = sorted[i].rawScore;

    // High-low-high pattern
    if (a > 0.7 && b < 0.3 && c > 0.7) return true;
    // Low-high-low pattern
    if (a < 0.3 && b > 0.7 && c < 0.3) return true;
  }

  return false;
}

// ============================================================================
// MASTERY STATE DERIVATION
// ============================================================================

export interface MasteryStateDerivation {
  masteryState: MasteryLevel;
  skillLevel: SkillLevel;
  isStale: boolean;
  gates: {
    hasMinimumEvidence: boolean;
    hasIndependentSuccess: boolean;
    hasTransferEvidence: boolean;
    hasHighStakesEvidence: boolean;
    meetsScoreThreshold: boolean;
    prerequisiteMet: boolean;
  };
}

export function deriveMasteryState(computation: MasteryComputation, evidence: Evidence[], staleThresholdDays: number = MASTERY_CONFIG.staleThresholdDays): MasteryStateDerivation {
  const { masteryScore, evidenceUsed, independentEvidenceCount, distinctChallenges, isVerified } = computation;

  // Check staleness
  const now = new Date();
  const recentEvidence = evidence.filter(e => {
    const ageDays = (now.getTime() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays <= staleThresholdDays;
  });
  const isStale = recentEvidence.length === 0 && evidenceUsed > 0;

  // Gates
  const gates = {
    hasMinimumEvidence: evidenceUsed >= 3,
    hasIndependentSuccess: independentEvidenceCount > 0,
    hasTransferEvidence: evidence.some(e => e.contextType === 'NOVEL' || e.contextType === 'TRANSFER'),
    hasHighStakesEvidence: evidence.some(e => e.contextType === 'VERIFICATION'),
    meetsScoreThreshold: masteryScore >= 20, // At least NOVICE threshold
    prerequisiteMet: computation.prerequisiteCap === null || computation.prerequisiteCap >= 0.4,
  };

  // Determine mastery state
  let masteryState: MasteryLevel = 'NOVICE';

  if (masteryScore >= 80 && isVerified && gates.prerequisiteMet) {
    masteryState = 'MASTERED';
  } else if (masteryScore >= 60 && gates.hasIndependentSuccess && gates.prerequisiteMet) {
    masteryState = 'STRONG';
  } else if (masteryScore >= 40 && gates.hasMinimumEvidence && gates.prerequisiteMet) {
    masteryState = 'COMPETENT';
  } else if (masteryScore >= 20 && gates.hasMinimumEvidence) {
    masteryState = 'DEVELOPING';
  } else {
    masteryState = 'NOVICE';
  }

  // Apply stale decay
  if (isStale && masteryState !== 'NOVICE') {
    // Decay one level
    const idx = MASTERY_LEVELS.indexOf(masteryState);
    if (idx > 0) {
      masteryState = MASTERY_LEVELS[idx - 1];
    }
  }

  // Derive skill level (4-tier)
  let skillLevel: SkillLevel = 'WEAK';
  if (masteryScore >= 80) skillLevel = 'STRONG';
  else if (masteryScore >= 60) skillLevel = 'PROFICIENT';
  else if (masteryScore >= 30) skillLevel = 'DEVELOPING';

  return {
    masteryState,
    skillLevel,
    isStale,
    gates,
  };
}

// ============================================================================
// FULL MASTERY UPDATE
// ============================================================================

export interface MasteryUpdateResult {
  studentId: UUID;
  skillId: UUID;
  previousState: StudentSkillState | null;
  newState: StudentSkillState;
  computation: MasteryComputation;
  derivation: MasteryStateDerivation;
}

export async function updateMastery(
  studentId: UUID,
  skillId: UUID,
  evidence: Evidence[],
  prerequisiteStates: Map<UUID, StudentSkillState>,
  previousState: StudentSkillState | null
): Promise<MasteryUpdateResult> {
  const computation = computeMastery(evidence, prerequisiteStates);
  const derivation = deriveMasteryState(computation, evidence);
  const confidence = computeConfidence(evidence, computation.masteryScore);
  const trend = computeTrend(evidence);
  const contradiction = detectContradiction(evidence);

  const newState: StudentSkillState = {
    studentId,
    skillId,
    masteryScore: computation.masteryScore,
    confidenceScore: confidence,
    masteryState: derivation.masteryState,
    trend,
    evidenceCount: computation.evidenceUsed,
    independentSuccessCount: computation.independentEvidenceCount,
    distinctChallengesCount: computation.distinctChallenges,
    contradictionFlag: contradiction,
    masteryVerified: derivation.gates.hasIndependentSuccess &&
                     derivation.gates.hasTransferEvidence &&
                     derivation.gates.hasHighStakesEvidence &&
                     derivation.gates.prerequisiteMet,
    lastAssessedAt: iso8601(new Date().toISOString()),
    nextReviewAt: derivation.isStale ? iso8601(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) : null,
  };

  return {
    studentId,
    skillId,
    previousState,
    newState,
    computation,
    derivation,
  };
}

export default {
  calculateRecencyWeight,
  calculateDifficultyWeight,
  calculateIndependenceWeight,
  calculateEvidenceWeight,
  filterAlgorithmicEvidence,
  computeMastery,
  computeConfidence,
  computeTrend,
  detectContradiction,
  deriveMasteryState,
  updateMastery,
};
