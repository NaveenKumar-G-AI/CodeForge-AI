// Adaptive Challenge Engine — Challenge Selector
import {
  AdaptiveSkillLevel,
  AdaptiveSkillState,
  SkillEvidencePoint,
  ChallengeMetadata,
  ChallengeHealth,
  CompletedChallengeRecord,
  StudentModel,
  SelectionContext,
  SelectionObjectiveWeights,
  PathIntent,
  NextBestChallenge,
  CandidateScoreBreakdown,
  DifficultyDimensions,
  DIFFICULTY_DIMENSION_KEYS,
  AdaptiveEvidenceOutcome,
} from '../../domain/types.js';

/**
 * Default selector weights
 */
export const DEFAULT_WEIGHTS: SelectionObjectiveWeights = {
  version: 'v1',
  skillGapFit: 0.25,
  uncertaintyReduction: 0.15,
  learningValue: 0.15,
  difficultyFit: 0.12,
  roleRelevance: 0.1,
  curriculumFit: 0.08,
  prerequisiteFit: 0.05,
  transferValue: 0.05,
  retentionValue: 0.03,
  novelty: 0.02,
  estimatedTimeFit: 0.02,
  challengeQuality: 0.02,
  engagementFit: 0.02,
};

/**
 * Compute student skill state from evidence
 */
export function computeSkillState(
  skillId: string,
  evidence: SkillEvidencePoint[],
  allChallenges: Map<string, ChallengeMetadata>
): AdaptiveSkillState {
  const validEvidence = evidence.filter((e) => e.outcome !== 'PARTIAL' || e.correctness !== undefined);
  const total = validEvidence.length;

  if (total === 0) {
    return {
      skillId,
      level: 'UNKNOWN',
      score: 0,
      confidence: 0,
      trend: 'INSUFFICIENT_DATA',
      lastDemonstratedAt: null,
      evidenceCount: 0,
      distinctContexts: 0,
      rawRecencyScore: 0,
      dampened: false,
    };
  }

  // Compute weighted signal
  const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
  let weightedSum = 0;
  let totalWeight = 0;
  let recentWeightedSum = 0;
  let recentTotalWeight = 0;

  const distinctContexts = new Set<string>();
  const distinctFamilies = new Set<string>();

  for (const ev of validEvidence) {
    const weight = computeEvidenceWeight(ev);
    const value = ev.outcome === 'SUCCESS' ? 1 : ev.outcome === 'PARTIAL' ? 0.5 : 0;
    weightedSum += value * weight;
    totalWeight += weight;

    const ts = new Date(ev.timestamp).getTime();
    if (ts > recentCutoff) {
      recentWeightedSum += value * weight;
      recentTotalWeight += weight;
    }

    if (ev.challengeFamily) distinctFamilies.add(ev.challengeFamily);
    if (ev.transferGroup) distinctContexts.add(ev.transferGroup);
  }

  const signal = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const recentSignal = recentTotalWeight > 0 ? recentWeightedSum / recentTotalWeight : null;
  const diversity = Math.min(1, distinctFamilies.size / 3); // Normalize to 3 families

  // Determine level
  let level: AdaptiveSkillLevel;
  if (signal >= 0.9 && diversity >= 0.6) level = 'MASTERED';
  else if (signal >= 0.8) level = 'PROFICIENT';
  else if (signal >= 0.6) level = 'PRACTICED';
  else if (signal >= 0.4) level = 'DEVELOPING';
  else if (signal >= 0.2) level = 'INTRODUCED';
  else level = 'UNKNOWN';

  // Check for regression
  const recentEvidence = validEvidence
    .filter((e) => new Date(e.timestamp).getTime() > recentCutoff)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentFailures = recentEvidence.filter((e) => e.outcome === 'FAILURE').length;
  if (recentFailures >= 3 && recentSignal !== null && recentSignal < 0.4) {
    level = 'REGRESSING';
  }

  // Check for at-risk (high confidence but old evidence)
  const oldEvidence = validEvidence.filter((e) => new Date(e.timestamp).getTime() <= recentCutoff);
  if (oldEvidence.length > 0 && recentEvidence.length === 0 && signal >= 0.7) {
    level = 'AT_RISK';
  }

  // Trend
  let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
  if (validEvidence.length >= 5) {
    const firstHalf = validEvidence.slice(0, Math.floor(validEvidence.length / 2));
    const secondHalf = validEvidence.slice(Math.floor(validEvidence.length / 2));
    const firstAvg = firstHalf.reduce((s, e) => s + (e.outcome === 'SUCCESS' ? 1 : 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, e) => s + (e.outcome === 'SUCCESS' ? 1 : 0), 0) / secondHalf.length;
    if (secondAvg > firstAvg + 0.1) trend = 'IMPROVING';
    else if (firstAvg > secondAvg + 0.1) trend = 'DECLINING';
    else trend = 'STABLE';
  }

  // Recency
  const lastDemo = validEvidence.reduce((latest, e) => {
    const ts = new Date(e.timestamp).getTime();
    return ts > latest ? ts : latest;
  }, 0);

  // Recency score
  const daysSinceLast = (Date.now() - lastDemo) / (24 * 60 * 60 * 1000);
  let rawRecencyScore = 1;
  if (daysSinceLast > 7) rawRecencyScore = 0.8;
  if (daysSinceLast > 30) rawRecencyScore = 0.5;
  if (daysSinceLast > 90) rawRecencyScore = 0.2;

  const dampened = rawRecencyScore < 0.5;

  return {
    skillId,
    level,
    score: Math.round(signal * 100),
    confidence: Math.min(1, total / 10 + diversity * 0.3),
    trend,
    lastDemonstratedAt: lastDemo > 0 ? new Date(lastDemo).toISOString() : null,
    evidenceCount: total,
    distinctContexts: distinctContexts.size,
    rawRecencyScore,
    dampened,
  };
}

export function computeEvidenceWeight(ev: SkillEvidencePoint): number {
  let weight = 1.0;

  // Assessment tier weight
  const tierWeights: Record<string, number> = {
    DIAGNOSTIC: 1.5,
    ASSESSMENT: 1.3,
    INTERVIEW: 1.2,
    PRACTICE: 1.0,
    PROJECT: 1.1,
  };
  weight *= tierWeights['PRACTICE'] || 1.0; // Would use ev.assessmentTier if available

  // Difficulty weight
  const avgDifficulty = Object.values(ev.dimensionsExercised).reduce((a, b) => a + b, 0) /
    Math.max(1, Object.keys(ev.dimensionsExercised).length);
  weight *= 0.5 + avgDifficulty * 0.5;

  // Transfer evidence bonus
  if (ev.transferGroup && ev.transferGroup !== 'none') weight *= 1.2;

  // Recency decay (exponential)
  const daysOld = (Date.now() - new Date(ev.timestamp).getTime()) / (24 * 60 * 60 * 1000);
  weight *= Math.exp(-daysOld / 60); // Half-life ~42 days

  return weight;
}

/**
 * Score a challenge candidate for a student
 */
export function scoreCandidate(
  challenge: ChallengeMetadata,
  health: ChallengeHealth,
  student: StudentModel,
  context: SelectionContext,
  weights: SelectionObjectiveWeights
): CandidateScoreBreakdown {
  const components: Record<string, number> = {};

  // 1. Skill Gap Fit
  components.skillGapFit = computeSkillGapFit(challenge, student);

  // 2. Uncertainty Reduction
  components.uncertaintyReduction = computeUncertaintyReduction(challenge, student);

  // 3. Learning Value
  components.learningValue = computeLearningValue(challenge, student);

  // 4. Difficulty Fit
  components.difficultyFit = computeDifficultyFit(challenge, student);

  // 5. Role Relevance
  components.roleRelevance = computeRoleRelevance(challenge, student);

  // 6. Curriculum Fit
  components.curriculumFit = computeCurriculumFit(challenge, student);

  // 7. Prerequisite Fit
  components.prerequisiteFit = computePrerequisiteFit(challenge, student);

  // 8. Transfer Value
  components.transferValue = computeTransferValue(challenge, student);

  // 9. Retention Value
  components.retentionValue = computeRetentionValue(challenge, student);

  // 10. Novelty
  components.novelty = computeNovelty(challenge, student);

  // 11. Estimated Time Fit
  components.estimatedTimeFit = computeTimeFit(challenge, context);

  // 12. Challenge Quality
  components.challengeQuality = health.qualityMultiplier;

  // 13. Engagement Fit
  components.engagementFit = computeEngagementFit(challenge, student);

  // Total weighted score
  let totalScore = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (key === 'version') continue;
    totalScore += (components[key] ?? 0) * weight;
  }

  return {
    challengeId: challenge.challengeId,
    totalScore: Math.round(totalScore * 1000) / 1000,
    components,
  };
}

function computeSkillGapFit(challenge: ChallengeMetadata, student: StudentModel): number {
  const primarySkill = student.skills[challenge.primarySkillId];
  if (!primarySkill || primarySkill.level === 'UNKNOWN') return 0.5;
  if (primarySkill.level === 'MASTERED' || primarySkill.level === 'AT_RISK' || primarySkill.level === 'REGRESSING')
    return 0.8;
  if (primarySkill.level === 'PROFICIENT') return 0.6;
  return 0.9; // DEVELOPING, PRACTICED, INTRODUCED
}

function computeUncertaintyReduction(challenge: ChallengeMetadata, student: StudentModel): number {
  const primarySkill = student.skills[challenge.primarySkillId];
  if (!primarySkill) return 0.5;
  return 1 - primarySkill.confidence; // Higher when confidence is low
}

function computeLearningValue(challenge: ChallengeMetadata, student: StudentModel): number {
  const primarySkill = student.skills[challenge.primarySkillId];
  if (!primarySkill) return 0.5;
  // Highest when developing/practiced, lower when mastered
  const levelValues: Record<AdaptiveSkillLevel, number> = {
    UNKNOWN: 0.3,
    INTRODUCED: 0.7,
    DEVELOPING: 0.9,
    PRACTICED: 0.8,
    PROFICIENT: 0.5,
    MASTERED: 0.1,
    AT_RISK: 0.6,
    REGRESSING: 0.7,
    UNCERTAIN: 0.5,
  };
  return levelValues[primarySkill.level] || 0.5;
}

function computeDifficultyFit(challenge: ChallengeMetadata, student: StudentModel): number {
  // Match challenge difficulty to student's current capability
  const studentAvg = Object.values(student.skills)
    .filter((s) => s.level !== 'UNKNOWN')
    .reduce((sum, s) => sum + s.score, 0) /
    Math.max(1, Object.values(student.skills).filter((s) => s.level !== 'UNKNOWN').length);

  const challengeDiff = averageDifficulty(challenge.difficulty);
  const diff = Math.abs(studentAvg - challengeDiff * 100);
  return Math.max(0, 1 - diff / 50); // Perfect fit at 0 diff, drops to 0 at 50 diff
}

function computeRoleRelevance(challenge: ChallengeMetadata, student: StudentModel): number {
  if (!student.targetRole) return 0.5;
  return challenge.targetRoles.includes(student.targetRole) ? 1.0 : 0.3;
}

function computeCurriculumFit(challenge: ChallengeMetadata, student: StudentModel): number {
  if (!student.curriculumConstraints?.requiredCurriculumTags) return 0.5;
  const required = new Set(student.curriculumConstraints.requiredCurriculumTags);
  const overlap = challenge.curriculumTags.filter((t) => required.has(t)).length;
  return required.size > 0 ? overlap / required.size : 0.5;
}

function computePrerequisiteFit(challenge: ChallengeMetadata, student: StudentModel): number {
  for (const prereq of challenge.prerequisites) {
    const skill = student.skills[prereq];
    if (!skill || skill.level === 'UNKNOWN' || skill.level === 'INTRODUCED') {
      return 0.2; // Missing prerequisite
    }
  }
  return 1.0;
}

function computeTransferValue(challenge: ChallengeMetadata, student: StudentModel): number {
  const primarySkill = student.skills[challenge.primarySkillId];
  if (!primarySkill) return 0.3;

  // High transfer value if skill is strong in one context but not tested in this transfer group
  const hasTransferEvidence = Object.values(student.evidenceBySkill).flat().some(
    (e) => e.skillId === challenge.primarySkillId && e.transferGroup === challenge.transferGroup
  );

  if (primarySkill.level === 'PROFICIENT' || primarySkill.level === 'MASTERED') {
    return hasTransferEvidence ? 0.3 : 0.9; // High value to test transfer
  }
  return 0.4;
}

function computeRetentionValue(challenge: ChallengeMetadata, student: StudentModel): number {
  const primarySkill = student.skills[challenge.primarySkillId];
  if (!primarySkill) return 0.3;

  // High value if skill is at risk of forgetting
  if (primarySkill.dampened || primarySkill.level === 'AT_RISK') return 0.9;

  // Check last demonstration
  if (primarySkill.lastDemonstratedAt) {
    const daysSince = (Date.now() - new Date(primarySkill.lastDemonstratedAt).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince > 60) return 0.8;
    if (daysSince > 30) return 0.5;
  }
  return 0.2;
}

function computeNovelty(challenge: ChallengeMetadata, student: StudentModel): number {
  // Has this exact challenge been done recently?
  const recentCompletion = student.completedChallenges.find(
    (c) => c.challengeId === challenge.challengeId &&
    new Date(c.completedAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
  );
  return recentCompletion ? 0.1 : 1.0;
}

function computeTimeFit(challenge: ChallengeMetadata, context: SelectionContext): number {
  if (!context.availableTimeMinutes) return 0.5;
  const ratio = challenge.estimatedTimeMinutes / context.availableTimeMinutes;
  if (ratio <= 1) return 1.0;
  if (ratio <= 1.5) return 0.7;
  return 0.3;
}

function computeEngagementFit(challenge: ChallengeMetadata, student: StudentModel): number {
  // Simple heuristic: variety of challenge families recently
  const recentFamilies = student.completedChallenges
    .filter((c) => new Date(c.completedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
    .map((c) => c.challengeFamily);
  const uniqueRecent = new Set(recentFamilies).size;
  return challenge.challengeFamily === 'general' ? 0.5 : uniqueRecent > 3 ? 0.8 : 0.6;
}

function averageDifficulty(diff: DifficultyDimensions): number {
  const values = DIFFICULTY_DIMENSION_KEYS.map((k) => diff[k]);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Select next best challenge
 */
export function selectNextChallenge(
  candidates: ChallengeMetadata[],
  healthMap: Map<string, ChallengeHealth>,
  student: StudentModel,
  context: SelectionContext,
  weights: SelectionObjectiveWeights = DEFAULT_WEIGHTS
): { selected: NextBestChallenge | null; breakdown: CandidateScoreBreakdown[]; noEligibleReason?: string } {
  // Filter eligible candidates
  let eligible = candidates.filter((c) => c.status === 'ACTIVE');

  // Apply hard constraints
  if (context.language) {
    eligible = eligible.filter((c) => c.supportedLanguages.includes(context.language!));
  }
  const availableTime = context.availableTimeMinutes;
  if (availableTime != null) {
    eligible = eligible.filter((c) => c.estimatedTimeMinutes <= availableTime * 1.2);
  }

  // Prerequisite check
  eligible = eligible.filter((c) => computePrerequisiteFit(c, student) > 0.2);

  if (eligible.length === 0) {
    return {
      selected: null,
      breakdown: [],
      noEligibleReason: 'No challenges meet hard constraints (language, time, prerequisites)',
    };
  }

  // Score all candidates
  const breakdown = eligible.map((c) => scoreCandidate(c, healthMap.get(c.challengeId)!, student, context, weights));

  // Sort by score
  breakdown.sort((a, b) => b.totalScore - a.totalScore);

  const selectedBreakdown = breakdown[0];
  const challenge = eligible.find((c) => c.challengeId === selectedBreakdown.challengeId)!;

  // Determine path intent
  const primarySkill = student.skills[challenge.primarySkillId];
  let pathIntent: PathIntent = 'PROGRESSION';
  if (context.mode === 'ASSESSMENT') pathIntent = 'ROLE_ASSESSMENT';
  else if (context.requestedRepetitionReason) {
    // Map reasonCompleted to PathIntent
    const reasonMap: Record<string, PathIntent> = {
      REMEDIATION: 'REMEDIATION',
      REASSESSMENT: 'ROLE_ASSESSMENT',
      MASTERY_CONFIRMATION: 'RETENTION_CHECK',
      SPACED_RETENTION: 'RETENTION_CHECK',
      ASSESSMENT_RETAKE: 'ROLE_ASSESSMENT',
      STANDARD: 'REINFORCEMENT',
    };
    pathIntent = reasonMap[context.requestedRepetitionReason] || 'PROGRESSION';
  } else if (primarySkill?.level === 'UNKNOWN' || primarySkill?.level === 'INTRODUCED') pathIntent = 'DIAGNOSTIC';
  else if (primarySkill?.level === 'AT_RISK' || primarySkill?.level === 'REGRESSING') pathIntent = 'REMEDIATION';
  else if (primarySkill?.level === 'PROFICIENT' && !primarySkill.dampened) pathIntent = 'TRANSFER';
  else if (primarySkill?.dampened) pathIntent = 'RETENTION_CHECK';
  else pathIntent = 'REINFORCEMENT';

  const selected: NextBestChallenge = {
    challengeId: challenge.challengeId,
    selectionReason: buildSelectionReason(selectedBreakdown),
    primaryLearningTarget: challenge.primarySkillId,
    supportingTargets: challenge.supportingSkillIds,
    difficultyFit: selectedBreakdown.components.difficultyFit,
    uncertaintyValue: selectedBreakdown.components.uncertaintyReduction,
    roleRelevance: selectedBreakdown.components.roleRelevance,
    confidence: Math.min(1, student.skills[challenge.primarySkillId]?.confidence ?? 0.5),
    selectorVersion: weights.version,
    pathIntent,
  };

  return { selected, breakdown };
}

function buildSelectionReason(breakdown: CandidateScoreBreakdown): string {
  const top = Object.entries(breakdown.components)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${Math.round(v * 100)}%`);
  return `Selected based on: ${top.join(', ')}`;
}