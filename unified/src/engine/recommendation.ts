/**
 * CodeForge AI — Recommendation Engine
 *
 * Parts 5, 3: End-to-end recommendation pipeline:
 * Gap Detection → Prerequisite Analysis → Difficulty Decision →
 * Candidate Retrieval → Ranking → Intervention Selection
 */

import type {
  UUID,
  Challenge,
  StudentSkillState,
  Evidence,
  Recommendation,
  GapType,
  GapAssessment,
  DifficultyLevel,
  Priority,
  RankingContext,
  RankedCandidate,
  AssistanceLevel,
  MasteryState,
  MasteryLevel,
  SkillLevel,
} from '../domain/types.js';
import { iso8601 } from '../domain/types.js';
import {
  RANKING_CONFIG,
  DIFFICULTY_CONFIG,
  MASTERY_CONFIG,
  PRIORITY_CONFIG,
} from '../config/index.js';
import {
  detectGap,
  rankGapsBySeverity,
  buildSkillGapDetail,
  createPrerequisiteAnalyzer,
  PrerequisiteAnalyzer,
} from './gaps.js';
import {
  decideDifficulty,
  difficultyFit,
  startingDifficultyForMastery,
} from './difficulty.js';
import { computeMastery, filterAlgorithmicEvidence } from './mastery.js';

// ============================================================================
// CANDIDATE RETRIEVAL INTERFACE
// ============================================================================

export interface ChallengeRepository {
  findById(id: UUID): Promise<Challenge | null>;
  findBySkill(skillId: UUID): Promise<Challenge[]>;
  findByDifficulty(level: DifficultyLevel): Promise<Challenge[]>;
  findActive(): Promise<Challenge[]>;
  getTestCases(challengeId: UUID, language?: string): Promise<any[]>;
}

export interface CandidateRetrieval {
  getCandidatesForSkill(skillId: UUID, targetLevel: DifficultyLevel, excludeIds: UUID[]): Promise<Challenge[]>;
  getTransferCandidates(skillId: UUID, targetLevel: DifficultyLevel, excludeIds: UUID[]): Promise<Challenge[]>;
  getVerificationCandidates(skillId: UUID, targetLevel: DifficultyLevel, excludeIds: UUID[]): Promise<Challenge[]>;
  getPrerequisiteCandidates(prereqSkillId: UUID, targetLevel: DifficultyLevel, excludeIds: UUID[]): Promise<Challenge[]>;
  getExplorationCandidates(skillId: UUID, excludeIds: UUID[]): Promise<Challenge[]>;
  getReviewCandidates(skillId: UUID, targetLevel: DifficultyLevel, excludeIds: UUID[]): Promise<Challenge[]>;
}

// ============================================================================
// INTERVENTION SELECTOR
// ============================================================================

export type InterventionType =
  | 'TARGETED_PRACTICE'
  | 'DEBUGGING'
  | 'TRANSFER'
  | 'REVIEW'
  | 'VERIFICATION'
  | 'LEARN'
  | 'PREREQUISITE_REVIEW'
  | 'EXPLORATION';

export interface InterventionSelector {
  selectIntervention(
    gapType: GapType,
    gapSeverity: number,
    targetDifficulty: DifficultyLevel,
    masteryState: MasteryState | SkillLevel,
    contextType: string
  ): InterventionType;
}

export function createInterventionSelector(): InterventionSelector {
  return {
    selectIntervention(
      gapType: GapType,
      gapSeverity: number,
      targetDifficulty: DifficultyLevel,
      masteryState: MasteryState | SkillLevel,
      contextType: string
    ): InterventionType {
      // Prerequisite gaps always get prerequisite review
      if (gapType === 'PREREQUISITE_GAP') {
        return 'PREREQUISITE_REVIEW';
      }

      // Transfer gaps get transfer practice
      if (gapType === 'TRANSFER_GAP') {
        return 'TRANSFER';
      }

      // Insufficient evidence gets exploration
      if (gapType === 'INSUFFICIENT_EVIDENCE') {
        return 'EXPLORATION';
      }

      // Critical gaps get targeted practice at lower difficulty
      if (gapType === 'CRITICAL_GAP') {
        return targetDifficulty === 'EASY' ? 'LEARN' : 'TARGETED_PRACTICE';
      }

      // Skill gaps: choose based on mastery state and severity
      if (gapType === 'SKILL_GAP' || gapType === 'GAP') {
        if (masteryState === 'NOVICE' || masteryState === 'WEAK' || masteryState === 'DEVELOPING') {
          return gapSeverity > 0.7 ? 'TARGETED_PRACTICE' : 'LEARN';
        }
        if (masteryState === 'COMPETENT' || masteryState === 'PROFICIENT') {
          return 'TARGETED_PRACTICE';
        }
        if (masteryState === 'STRONG' || masteryState === 'MASTERED') {
          return 'VERIFICATION';
        }
        return 'TARGETED_PRACTICE';
      }

      // No gap - verification or review
      if (gapType === 'NONE') {
        return masteryState === 'MASTERED' || masteryState === 'STRONG'
          ? 'VERIFICATION'
          : 'REVIEW';
      }

      return 'TARGETED_PRACTICE';
    },
  };
}

// ============================================================================
// RANKING ENGINE
// ============================================================================

export function scoreCandidate(
  challenge: Challenge,
  ctx: RankingContext
): RankedCandidate {
  const breakdown: Record<string, number> = {};
  const normalizedRolePriority = priorityScore(ctx.rolePriority);

  // 1. Gap severity alignment (how well does this challenge target the gap?)
  const gapScore = ctx.gapType ? calculateGapAlignmentScore(challenge, ctx) : 0;
  breakdown.gap = gapScore;

  // 2. Role priority (how important is this skill for the student's role?)
  const roleScore = normalizedRolePriority * RANKING_CONFIG.weights.role;
  breakdown.role = roleScore / RANKING_CONFIG.weights.role; // normalize

  // 3. Difficulty fit (how close is challenge to target difficulty?)
  const difficultyScore = difficultyFit(challenge.difficultyLevel, ctx.targetDifficultyLevel);
  breakdown.difficultyFit = difficultyScore;

  // 4. Freshness penalty (recently attempted)
  const freshnessScore = calculateFreshnessScore(challenge, ctx);
  breakdown.freshness = freshnessScore;

  // 5. Diversity bonus (targeting different skills recently)
  const diversityScore = calculateDiversityScore(challenge, ctx);
  breakdown.diversity = diversityScore;

  // 6. Quality score (challenge analytics)
  const qualityScore = calculateQualityScore(challenge);
  breakdown.quality = qualityScore;

  // 7. Goal boost
  const goalScore = ctx.goalBoostsSkillGap ? 1 : 0;
  breakdown.goal = goalScore;

  // 8. Transfer gap bonus
  const transferScore = ctx.isTransferTarget && challenge.contextType === 'NOVEL' ? 1 : 0;
  breakdown.transfer = transferScore;

  // 9. Spaced review bonus
  const reviewScore = ctx.skillHasDueReview ? 1 : 0;
  breakdown.review = reviewScore;

  // Calculate weighted sum
  const weights = RANKING_CONFIG.weights;
  const score =
    gapScore * weights.gap +
    normalizedRolePriority * weights.role +
    difficultyScore * weights.difficultyFit +
    freshnessScore * weights.freshness +
    diversityScore * weights.diversity +
    qualityScore * weights.quality +
    goalScore * weights.goal +
    transferScore * weights.transfer +
    reviewScore * weights.review;

  return {
    challenge,
    score,
    breakdown,
  };
}

function priorityScore(priority: Priority | number | null | undefined): number {
  if (typeof priority === 'number') return Math.max(0, Math.min(1, priority));
  if (!priority) return 0;
  return PRIORITY_CONFIG.tierWeight[priority] ?? 0;
}

function calculateGapAlignmentScore(challenge: Challenge, ctx: RankingContext): number {
  if (!ctx.gapType) return 0;

  // For transfer gaps, prefer NOVEL context challenges
  if (ctx.gapType === 'TRANSFER_GAP' && ctx.isTransferTarget) {
    return challenge.contextType === 'NOVEL' ? 1 : 0.3;
  }

  // For prerequisite gaps, prefer the prerequisite skill's challenges
  if (ctx.gapType === 'PREREQUISITE_GAP') {
    return challenge.primarySkillId === ctx.targetSkillId ? 1 : 0.5;
  }

  // For skill gaps, prefer primary skill match
  if (ctx.gapType === 'SKILL_GAP' || ctx.gapType === 'CRITICAL_GAP' || ctx.gapType === 'GAP') {
    return challenge.primarySkillId === ctx.targetSkillId ? 1 : 0.5;
  }

  // For insufficient evidence, any relevant challenge
  if (ctx.gapType === 'INSUFFICIENT_EVIDENCE') {
    return challenge.primarySkillId === ctx.targetSkillId ? 0.8 : 0.4;
  }

  return 0.5;
}

function calculateFreshnessScore(challenge: Challenge, ctx: RankingContext): number {
  if (ctx.deliberateRepetitionChallengeId === challenge.id) {
    return 1; // Don't penalize deliberate repetition
  }

  const recentIndex = ctx.recentlyAttemptedChallengeIds.indexOf(challenge.id);
  if (recentIndex === -1) return 1;

  // Exponential decay: 0.5 penalty for most recent, decaying to 0
  return Math.max(0, 1 - 0.5 * Math.pow(0.5, recentIndex));
}

function calculateDiversityScore(challenge: Challenge, ctx: RankingContext): number {
  // Bonus for targeting skills not recently targeted
  const allSkillIds = [challenge.primarySkillId, ...challenge.secondarySkillIds];
  const recentlyTargeted = new Set(ctx.recentlyTargetedSkillIds);

  const newSkills = allSkillIds.filter(id => !recentlyTargeted.has(id));
  return newSkills.length > 0 ? 1 : 0;
}

function calculateQualityScore(challenge: Challenge): number {
  if (!challenge.qualityAnalytics) return 0.5;

  const { passRate, avgHintsUsed, attemptCount } = challenge.qualityAnalytics;

  // Prefer challenges with good pass rates (0.3-0.8) and moderate hints
  let score = 0.5;

  if (passRate >= 0.3 && passRate <= 0.8) score += 0.2;
  if (avgHintsUsed <= 2) score += 0.1;
  if (attemptCount >= 10) score += 0.1; // Well-tested
  if (attemptCount >= 50) score += 0.1; // Very well-tested

  return Math.min(1, score);
}

export function rankCandidates(
  candidates: Challenge[],
  ctx: RankingContext
): RankedCandidate[] {
  return candidates
    .map(c => scoreCandidate(c, ctx))
    .sort((a, b) => b.score - a.score);
}

// ============================================================================
// RECOMMENDATION SERVICE
// ============================================================================

export interface RecommendationServiceConfig {
  getStudentSkillStates: (studentId: UUID) => Promise<Map<UUID, StudentSkillState>>;
  getEvidence: (studentId: UUID, skillId: UUID) => Promise<Evidence[]>;
  getPrerequisites: (skillId: UUID) => Promise<UUID[]>;
  getChallengeRepository: () => CandidateRetrieval;
  getStudentRole: (studentId: UUID) => Promise<{ roleId: UUID; priority: Priority } | null>;
  getStudentGoal: (studentId: UUID) => Promise<string | null>;
  getRecentRecommendations: (studentId: UUID, limit: number) => Promise<Recommendation[]>;
  getRecentAttempts: (studentId: UUID, limit: number) => Promise<UUID[]>;
}

export class RecommendationService {
  private config: RecommendationServiceConfig;
  private prerequisiteAnalyzer: PrerequisiteAnalyzer;
  private interventionSelector: InterventionSelector;

  constructor(config: RecommendationServiceConfig) {
    this.config = config;
    this.prerequisiteAnalyzer = createPrerequisiteAnalyzer(
      async (skillId) => config.getPrerequisites(skillId),
      async (studentId, skillId) => {
        const states = await config.getStudentSkillStates(studentId);
        return states.get(skillId) || null;
      }
    );
    this.interventionSelector = createInterventionSelector();
  }

  async getNextRecommendation(studentId: UUID): Promise<Recommendation | null> {
    // 1. Get student's skill states and role
    const [skillStates, roleInfo, goal, recentRecs, recentAttempts] = await Promise.all([
      this.config.getStudentSkillStates(studentId),
      this.config.getStudentRole(studentId),
      this.config.getStudentGoal(studentId),
      this.config.getRecentRecommendations(studentId, 10),
      this.config.getRecentAttempts(studentId, 20),
    ]);

    // 2. Detect gaps for all skills
    const gaps: GapAssessment[] = [];
    for (const [skillId, state] of skillStates) {
      const evidence = await this.config.getEvidence(studentId, skillId);
      const prereqStates = new Map<UUID, StudentSkillState>();

      // Get prerequisite states for this skill
      const prereqs = await this.config.getPrerequisites(skillId);
      for (const p of prereqs) {
        const ps = skillStates.get(p);
        if (ps) prereqStates.set(p, ps);
      }

      const gap = detectGap(state, evidence, prereqStates);
      if (gap && gap.gapType !== 'NONE') {
        gaps.push(gap);
      }
    }

    if (gaps.length === 0) {
      // No gaps - recommend verification or exploration
      return this.createExplorationRecommendation(studentId, skillStates, recentAttempts);
    }

    // 3. Rank gaps by severity
    const rankedGaps = rankGapsBySeverity(gaps);
    const topGap = rankedGaps[0];

    // 4. Check for prerequisite gap (may redirect to prerequisite)
    if (topGap.gapType === 'SKILL_GAP' || topGap.gapType === 'CRITICAL_GAP' || topGap.gapType === 'GAP') {
      const prereqGap = await this.prerequisiteAnalyzer.analyze(studentId, topGap.skillId);
      if (prereqGap) {
        return this.createRecommendationForGap(studentId, prereqGap, skillStates, roleInfo, goal, recentRecs, recentAttempts);
      }
    }

    // 5. Create recommendation for the top gap
    return this.createRecommendationForGap(studentId, topGap, skillStates, roleInfo, goal, recentRecs, recentAttempts);
  }

  private async createRecommendationForGap(
    studentId: UUID,
    gap: GapAssessment,
    skillStates: Map<UUID, StudentSkillState>,
    roleInfo: { roleId: UUID; priority: Priority } | null,
    goal: string | null,
    recentRecs: Recommendation[],
    recentAttempts: UUID[]
  ): Promise<Recommendation> {
    const state = skillStates.get(gap.skillId);
    const evidence = await this.config.getEvidence(studentId, gap.skillId);
    const targetDifficulty = decideDifficulty(evidence, startingDifficultyForMastery(state?.masteryState || 'NOVICE')).targetLevel;

    // Get candidate challenges
    const repo = this.config.getChallengeRepository();
    const excludeIds = new Set([...recentAttempts, ...recentRecs.map(r => r.challengeId)]);

    let candidates: Challenge[];
    if (gap.gapType === 'TRANSFER_GAP') {
      candidates = await repo.getTransferCandidates(gap.skillId, targetDifficulty, Array.from(excludeIds));
    } else if (gap.gapType === 'PREREQUISITE_GAP') {
      candidates = await repo.getPrerequisiteCandidates(gap.skillId, targetDifficulty, Array.from(excludeIds));
    } else if (gap.gapType === 'INSUFFICIENT_EVIDENCE') {
      candidates = await repo.getExplorationCandidates(gap.skillId, Array.from(excludeIds));
    } else {
      candidates = await repo.getCandidatesForSkill(gap.skillId, targetDifficulty, Array.from(excludeIds));
    }

    if (candidates.length === 0) {
      // Fallback to any active challenge for this skill
      candidates = await repo.getCandidatesForSkill(gap.skillId, targetDifficulty, Array.from(excludeIds));
    }

    // Build ranking context
    const ctx: RankingContext = {
      targetSkillId: gap.skillId,
      gapType: gap.gapType,
      gapSeverity: gap.severity,
      targetDifficultyLevel: targetDifficulty,
      rolePriority: roleInfo?.priority || null,
      goalBoostsSkillGap: goal === 'DSA_MASTERY' || goal === 'PLACEMENT_PREPARATION',
      goalPrefersInterviewStyle: goal === 'INTERVIEW_PREPARATION',
      recentlyAttemptedChallengeIds: recentAttempts,
      deliberateRepetitionChallengeId: null,
      skillHasDueReview: false, // Would check spaced repetition
      isTransferTarget: gap.gapType === 'TRANSFER_GAP',
      recentlyTargetedSkillIds: recentRecs.map(r => r.skillId),
    };

    // Rank candidates
    const ranked = rankCandidates(candidates, ctx);

    if (ranked.length === 0) {
      throw new Error(`No candidates found for skill ${gap.skillId}`);
    }

    const best = ranked[0];

    // Select intervention
    const interventionType = this.interventionSelector.selectIntervention(
      gap.gapType,
      gap.severity,
      targetDifficulty,
      state?.masteryState || 'NOVICE',
      'STANDARD'
    );

    // Build learning objective
    const learningObjective = this.buildLearningObjective(gap, interventionType, best.challenge);

    // Build reason
    const reason = this.buildReason(gap, interventionType, best.challenge, state);

    // Create recommendation
    const recommendation: Recommendation = {
      id: randomUUID(),
      studentId,
      challengeId: best.challenge.id,
      skillId: gap.skillId,
      gapType: gap.gapType,
      interventionType,
      learningObjective,
      reason,
      rankingScore: best.score,
      isRepetition: recentAttempts.includes(best.challenge.id),
      isExploration: gap.gapType === 'INSUFFICIENT_EVIDENCE',
      evidenceSnapshot: {
        gapType: gap.gapType,
        gapSeverity: gap.severity,
        masteryScore: state?.masteryScore || 0,
        masteryState: state?.masteryState || 'NOVICE',
        targetDifficulty,
        rankedCandidates: ranked.slice(0, 3).map(r => ({
          challengeId: r.challenge.id,
          score: r.score,
        })),
      },
      status: 'PENDING',
      createdAt: iso8601(new Date().toISOString()),
      acceptedAt: null,
      completedAt: null,
    };

    return recommendation;
  }

  private async createExplorationRecommendation(
    studentId: UUID,
    skillStates: Map<UUID, StudentSkillState>,
    recentAttempts: UUID[]
  ): Promise<Recommendation> {
    // Find a skill the student hasn't practiced much
    const repo = this.config.getChallengeRepository();
    const excludeIds = new Set(recentAttempts);

    // Get all active skills with low evidence
    let bestSkill: UUID | null = null;
    let minEvidence = Infinity;

    for (const [skillId, state] of skillStates) {
      if (state.evidenceCount < 3 && state.evidenceCount < minEvidence) {
        minEvidence = state.evidenceCount;
        bestSkill = skillId;
      }
    }

    if (!bestSkill) {
      // Pick any skill
      bestSkill = skillStates.keys().next().value || null;
    }

    if (!bestSkill) {
      throw new Error('No skills available for exploration');
    }

    const candidates = await repo.getExplorationCandidates(bestSkill, Array.from(excludeIds));

    if (candidates.length === 0) {
      throw new Error('No exploration candidates available');
    }

    const challenge = candidates[0];

    return {
      id: randomUUID(),
      studentId,
      challengeId: challenge.id,
      skillId: bestSkill,
      gapType: 'INSUFFICIENT_EVIDENCE',
      interventionType: 'EXPLORATION',
      learningObjective: `Explore ${challenge.title} to build foundational understanding`,
      reason: `You haven't practiced this skill much yet. This challenge will help you build initial familiarity.`,
      rankingScore: 0.5,
      isRepetition: false,
      isExploration: true,
      evidenceSnapshot: { exploration: true },
      status: 'PENDING',
      createdAt: iso8601(new Date().toISOString()),
      acceptedAt: null,
      completedAt: null,
    };
  }

  private buildLearningObjective(gap: GapAssessment, interventionType: InterventionType, challenge: Challenge): string {
    const objectives: Record<InterventionType, string> = {
      TARGETED_PRACTICE: `Practice ${challenge.title} to address ${gap.gapType.replace('_', ' ').toLowerCase()}`,
      DEBUGGING: `Debug your approach to ${challenge.title} by analyzing failing test cases`,
      TRANSFER: `Apply ${challenge.primarySkillId} knowledge to a novel context in ${challenge.title}`,
      REVIEW: `Review ${challenge.title} to reinforce your understanding`,
      VERIFICATION: `Verify your mastery of ${challenge.primarySkillId} with ${challenge.title}`,
      LEARN: `Learn the fundamentals needed for ${challenge.title}`,
      PREREQUISITE_REVIEW: `Strengthen prerequisite ${gap.skillId} before tackling dependent skills`,
      EXPLORATION: `Explore ${challenge.title} to discover new concepts`,
    };

    return objectives[interventionType] || `Work on ${challenge.title}`;
  }

  private buildReason(
    gap: GapAssessment,
    interventionType: InterventionType,
    challenge: Challenge,
    state: StudentSkillState | undefined
  ): string {
    const parts: string[] = [];

    if (state) {
      parts.push(`Your ${challenge.primarySkillId} skill is at ${state.masteryState} (${state.masteryScore}% mastery).`);
    }

    parts.push(gap.explanation);

    if (interventionType === 'PREREQUISITE_REVIEW') {
      parts.push(`This challenge focuses on the prerequisite ${gap.skillId} which is needed for further progress.`);
    } else if (interventionType === 'TRANSFER') {
      parts.push(`This challenge tests your ability to apply the skill in a new context.`);
    }

    return parts.join(' ');
  }
}

function randomUUID(): UUID {
  return crypto.randomUUID() as UUID;
}

export default {
  createInterventionSelector,
  scoreCandidate,
  rankCandidates,
  RecommendationService,
};
