/**
 * CodeForge AI — Roadmap & Mastery Journey Engine
 *
 * Part 6: Priority computation, milestone tracking, readiness modeling,
 * daily/weekly planning, and recalculation triggers.
 */

import type {
  UUID,
  StudentSkillState,
  Milestone,
  DailyPlan,
  WeeklyPlan,
  PlannedActivity,
  ReadinessReport,
  PriorityBreakdown,
  ReadinessState,
  PriorityTier,
  GapStatus,
  Trend,
  MasteryLevel,
  SkillGap,
  ActivityType,
  Goal,
  Priority,
} from '../domain/types.js';
import { iso8601, uuid } from '../domain/types.js';
import {
  PRIORITY_CONFIG,
  READINESS_CONFIG,
  SCHEDULER_CONFIG,
  MASTERY_CONFIG,
} from '../config/index.js';
import { MASTERY_LEVELS, masteryRank, skillLevelRank } from '../domain/types.js';

// ============================================================================
// PRIORITY ENGINE
// ============================================================================

export interface PriorityInput {
  priorityTier: PriorityTier;
  gapStatus: GapStatus;
  required: boolean;
  blockingPowerNormalized: number; // 0..1
  daysRemaining: number | null;
  trend: Trend | null;
}

export function computePriority(input: PriorityInput): { score: number; breakdown: PriorityBreakdown } {
  const { weights, urgencyBaselineDays, tierWeight, gapSeverityWeight } = PRIORITY_CONFIG;

  const roleValue = tierWeight[input.priorityTier];
  const gapValue = gapSeverityWeight[input.gapStatus];
  const blockValue = input.blockingPowerNormalized;
  const requiredValue = input.required ? 1 : 0.3;
  const urgencyRaw = daysToUrgency(input.daysRemaining, urgencyBaselineDays);
  const urgencyValue = urgencyRaw * requiredValue;
  const trendValue = input.trend === 'DECLINING' ? 1 : 0;

  const role = { value: roleValue, weight: weights.role, contribution: roleValue * weights.role };
  const gap = { value: gapValue, weight: weights.gap, contribution: gapValue * weights.gap };
  const block = { value: blockValue, weight: weights.block, contribution: blockValue * weights.block };
  const required = { value: requiredValue, weight: weights.required, contribution: requiredValue * weights.required };
  const urgency = { value: urgencyValue, weight: weights.urgency, contribution: urgencyValue * weights.urgency };
  const trend = { value: trendValue, weight: weights.trend, contribution: trendValue * weights.trend };

  const score =
    role.contribution +
    gap.contribution +
    block.contribution +
    required.contribution +
    urgency.contribution +
    trend.contribution;

  const breakdown: PriorityBreakdown = { role, gap, block, required, urgency, trend };

  return { score: Math.max(0, Math.min(1, score)), breakdown };
}

function daysToUrgency(daysRemaining: number | null, baselineDays: number): number {
  if (daysRemaining === null) return 0;
  if (daysRemaining <= 0) return 1;
  const factor = 1 - daysRemaining / baselineDays;
  return Math.max(0, Math.min(1, factor));
}

// ============================================================================
// MILESTONE ENGINE
// ============================================================================

export interface MilestoneCompletionCheck {
  isComplete: boolean;
  missingSkills: UUID[];
  insufficientConfidence: UUID[];
  insufficientEvidence: UUID[];
  needsVerification: UUID[];
}

export function checkMilestoneCompletion(
  milestone: Milestone,
  skillStates: Map<UUID, StudentSkillState>,
  evidence: Map<UUID, number>, // skillId -> independent evidence count
  verificationStatus: Map<UUID, boolean> // skillId -> verified
): MilestoneCompletionCheck {
  const { completionCriteria } = milestone;

  const missingSkills: UUID[] = [];
  const insufficientConfidence: UUID[] = [];
  const insufficientEvidence: UUID[] = [];
  const needsVerification: UUID[] = [];

  for (const skillId of milestone.requiredSkills) {
    const state = skillStates.get(skillId);
    if (!state) {
      missingSkills.push(skillId);
      continue;
    }

    // Check required skills at target
    if (completionCriteria.requiredSkillsAtTarget) {
      const targetRank = masteryRank('COMPETENT') ?? 0; // Default target
      const currentRank = masteryRank(state.masteryState as MasteryLevel);
      if (currentRank !== null && currentRank < targetRank) {
        missingSkills.push(skillId);
      }
    }

    // Check minimum confidence
    if (state.confidenceScore < completionCriteria.minConfidence) {
      insufficientConfidence.push(skillId);
    }

    // Check minimum independent evidence
    const indepCount = evidence.get(skillId) || 0;
    if (indepCount < completionCriteria.minIndependentEvidencePerRequiredSkill) {
      insufficientEvidence.push(skillId);
    }

    // Check verification
    if (completionCriteria.verificationRequired && !verificationStatus.get(skillId)) {
      needsVerification.push(skillId);
    }
  }

  const isComplete =
    missingSkills.length === 0 &&
    insufficientConfidence.length === 0 &&
    insufficientEvidence.length === 0 &&
    needsVerification.length === 0;

  return { isComplete, missingSkills, insufficientConfidence, insufficientEvidence, needsVerification };
}

export function updateMilestoneProgress(
  milestone: Milestone,
  check: MilestoneCompletionCheck
): number {
  if (check.isComplete) return 1.0;

  const totalSkills = milestone.requiredSkills.length;
  if (totalSkills === 0) return 1.0;

  const completed = totalSkills - check.missingSkills.length;
  const progress = completed / totalSkills;

  // Reduce progress for confidence/evidence/verification gaps
  const penalty =
    check.insufficientConfidence.length * 0.1 +
    check.insufficientEvidence.length * 0.1 +
    check.needsVerification.length * 0.15;

  return Math.max(0, progress - penalty);
}

// ============================================================================
// READINESS MODEL
// ============================================================================

export interface SkillReadiness {
  skillId: UUID;
  state: ReadinessState;
  score: number;
  masteryScore: number;
  confidence: number;
  gapStatus: GapStatus;
  blockingGaps: SkillGap[];
}

export function computeReadiness(
  skillStates: Map<UUID, StudentSkillState>,
  skillGaps: Map<UUID, SkillGap[]>,
  roleRequiredSkills: UUID[],
  targetDate: Date | null
): ReadinessReport {
  const skillReadiness: SkillReadiness[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const [skillId, state] of skillStates) {
    const gaps = skillGaps.get(skillId) || [];
    const gap = gaps.find(g => g.severity > 0.5);

    const weight = roleRequiredSkills.includes(skillId) ? 2 : 1;
    const skillScore = computeSkillReadinessScore(state, gaps, weight);
    const readinessState = scoreToReadinessState(skillScore);

    skillReadiness.push({
      skillId,
      state: readinessState,
      score: skillScore,
      masteryScore: state.masteryScore,
      confidence: state.confidenceScore,
      gapStatus: gap ? 'GAP' : 'COMPLETE',
      blockingGaps: gaps.filter(g => g.severity > 0.5),
    });

    totalWeightedScore += skillScore * weight;
    totalWeight += weight;
  }

  const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  const overallReadiness = scoreToReadinessState(overallScore);

  const blockingGaps = skillReadiness
    .flatMap(sr => sr.blockingGaps)
    .sort((a, b) => b.severity - a.severity);

  const estimatedDaysToReady = estimateDaysToReady(skillReadiness, targetDate);

  return {
    studentId: uuid(''), // Filled by caller
    roleId: null, // Filled by caller
    overallReadiness,
    skillReadiness: Object.fromEntries(skillReadiness.map(sr => [sr.skillId, { state: sr.state, score: sr.score }])),
    blockingGaps,
    estimatedDaysToReady,
    generatedAt: iso8601(new Date().toISOString()),
  };
}

function computeSkillReadinessScore(
  state: StudentSkillState,
  gaps: SkillGap[],
  weight: number
): number {
  // Base score from mastery (0-1)
  let score = state.masteryScore / 100;

  // Confidence boost
  score *= 0.5 + state.confidenceScore * 0.5;

  // Gap penalty
  for (const gap of gaps) {
    score *= (1 - gap.severity * 0.5);
  }

  // Stale penalty
  if (state.masteryState === 'STALE') {
    score *= 0.7;
  }

  return Math.max(0, Math.min(1, score));
}

function scoreToReadinessState(score: number): ReadinessState {
  for (const band of READINESS_CONFIG.bands) {
    if (score <= band.max) return band.state;
  }
  return 'STRONG';
}

function estimateDaysToReady(
  skillReadiness: SkillReadiness[],
  targetDate: Date | null
): number | null {
  const notReady = skillReadiness.filter(s => s.state !== 'READY' && s.state !== 'STRONG');
  if (notReady.length === 0) return 0;

  // Estimate based on gap severity and daily capacity
  const totalGapSeverity = notReady.reduce((sum, s) =>
    sum + s.blockingGaps.reduce((gs, g) => gs + g.severity, 0), 0);

  // Assume ~15 minutes per 0.1 gap severity per day
  const minutesPerDay = SCHEDULER_CONFIG.maxDailyMinutes;
  const estimatedMinutes = totalGapSeverity * 150;
  const estimatedDays = Math.ceil(estimatedMinutes / minutesPerDay);

  if (targetDate) {
    const daysUntilTarget = Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.min(estimatedDays, Math.max(1, daysUntilTarget));
  }

  return estimatedDays;
}

// ============================================================================
// DAILY/WEEKLY PLANNER
// ============================================================================

export interface PlannerInput {
  studentId: UUID;
  skillStates: Map<UUID, StudentSkillState>;
  skillGaps: Map<UUID, SkillGap[]>;
  recommendations: Array<{ challengeId: UUID; skillId: UUID; priority: Priority; estimatedMinutes: number }>;
  milestones: Milestone[];
  roleRequiredSkills: UUID[];
  targetDate: Date | null;
  previousPlan?: DailyPlan[];
}

export function generateDailyPlan(input: PlannerInput, date: Date): DailyPlan {
  const activities: PlannedActivity[] = [];
  let totalMinutes = 0;

  // Sort recommendations by priority
  const sortedRecs = [...input.recommendations].sort((a, b) => {
    const priorityOrder: Record<Priority, number> = { CRITICAL: 4, VERY_HIGH: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  for (const rec of sortedRecs) {
    if (totalMinutes + rec.estimatedMinutes > SCHEDULER_CONFIG.maxDailyMinutes) break;

    const state = input.skillStates.get(rec.skillId);
    const gaps = input.skillGaps.get(rec.skillId) || [];
    const hasCriticalGap = gaps.some(g => g.severity > 0.8);

    let activityType: ActivityType = 'PRACTICE';
    if (hasCriticalGap) activityType = 'TARGETED_PRACTICE';
    else if (state?.masteryState === 'NOVICE') activityType = 'LEARN';
    else if (state?.masteryState === 'STRONG' || state?.masteryState === 'MASTERED') activityType = 'VERIFICATION';

    activities.push({
      id: randomUUID(),
      type: activityType,
      skillId: rec.skillId,
      challengeId: rec.challengeId,
      estimatedMinutes: rec.estimatedMinutes,
      priority: rec.priority,
      reason: `Priority ${rec.priority} activity for skill ${rec.skillId}`,
    });

    totalMinutes += rec.estimatedMinutes;
  }

  // Add review activities if space allows
  const reviewSkills = Array.from(input.skillStates.entries())
    .filter(([_, state]) => state.masteryState === 'STALE' || state.masteryState === 'STRONG')
    .map(([skillId]) => skillId)
    .slice(0, 2);

  for (const skillId of reviewSkills) {
    if (totalMinutes >= SCHEDULER_CONFIG.maxDailyMinutes) break;
    // Add a quick review activity (would need a review challenge)
  }

  return {
    date: date.toISOString().split('T')[0],
    studentId: input.studentId,
    activities,
    totalEstimatedMinutes: totalMinutes,
  };
}

export function generateWeeklyPlan(
  input: PlannerInput,
  weekStart: Date
): WeeklyPlan {
  const dailyPlans: DailyPlan[] = [];
  const focusSkills = new Set<UUID>();
  const reviewSkills = new Set<UUID>();

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);

    const daily = generateDailyPlan(input, date);
    dailyPlans.push(daily);

    for (const activity of daily.activities) {
      if (activity.priority === 'CRITICAL' || activity.priority === 'VERY_HIGH' || activity.priority === 'HIGH') {
        focusSkills.add(activity.skillId);
      }
      if (activity.type === 'REVIEW' || activity.type === 'VERIFICATION') {
        reviewSkills.add(activity.skillId);
      }
    }
  }

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    studentId: input.studentId,
    dailyPlans,
    focusSkills: Array.from(focusSkills),
    reviewSkills: Array.from(reviewSkills),
  };
}

// ============================================================================
// RECALCULATION TRIGGERS
// ============================================================================

export type RecalcTrigger =
  | 'INITIAL'
  | 'EVIDENCE_UPDATE'
  | 'MILESTONE_COMPLETED'
  | 'DEADLINE_CHANGED'
  | 'TIME_CHANGED'
  | 'ROLE_CHANGED'
  | 'GOAL_CHANGED'
  | 'MANUAL';

export interface RecalculationEngine {
  shouldRecalculate(
    trigger: RecalcTrigger,
    lastRecalculatedAt: Date,
    context: {
      evidenceUpdated?: boolean;
      milestoneCompleted?: boolean;
      deadlineChanged?: boolean;
      roleChanged?: boolean;
      goalChanged?: boolean;
    }
  ): boolean;
}

export function createRecalculationEngine(): RecalculationEngine {
  const MIN_RECALC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  return {
    shouldRecalculate(trigger, lastRecalculatedAt, context) {
      // Always recalculate on manual trigger
      if (trigger === 'MANUAL') return true;

      // Always recalculate on initial
      if (trigger === 'INITIAL') return true;

      // Rate limit
      if (Date.now() - lastRecalculatedAt.getTime() < MIN_RECALC_INTERVAL_MS) {
        return false;
      }

      // Check specific triggers
      switch (trigger) {
        case 'EVIDENCE_UPDATE':
          return context.evidenceUpdated === true;
        case 'MILESTONE_COMPLETED':
          return context.milestoneCompleted === true;
        case 'DEADLINE_CHANGED':
          return context.deadlineChanged === true;
        case 'ROLE_CHANGED':
          return context.roleChanged === true;
        case 'GOAL_CHANGED':
          return context.goalChanged === true;
        case 'TIME_CHANGED':
          // Recalculate daily at midnight
          return true;
        default:
          return false;
      }
    },
  };
}

// ============================================================================
// ROADMAP SERVICE
// ============================================================================

export interface RoadmapServiceConfig {
  getStudentSkillStates: (studentId: UUID) => Promise<Map<UUID, StudentSkillState>>;
  getSkillGaps: (studentId: UUID) => Promise<Map<UUID, SkillGap[]>>;
  getRecommendations: (studentId: UUID) => Promise<Array<{ challengeId: UUID; skillId: UUID; priority: Priority; estimatedMinutes: number }>>;
  getMilestones: (studentId: UUID) => Promise<Milestone[]>;
  getRoleRequiredSkills: (studentId: UUID) => Promise<UUID[]>;
  getTargetDate: (studentId: UUID) => Promise<Date | null>;
}

export class RoadmapService {
  private config: RoadmapServiceConfig;
  private recalcEngine: RecalculationEngine;

  constructor(config: RoadmapServiceConfig) {
    this.config = config;
    this.recalcEngine = createRecalculationEngine();
  }

  async generateRoadmap(studentId: UUID, trigger: RecalcTrigger = 'MANUAL'): Promise<{
    readiness: ReadinessReport;
    dailyPlan: DailyPlan;
    weeklyPlan: WeeklyPlan;
    milestones: Milestone[];
  }> {
    const [skillStates, skillGaps, recommendations, milestones, roleRequiredSkills, targetDate] = await Promise.all([
      this.config.getStudentSkillStates(studentId),
      this.config.getSkillGaps(studentId),
      this.config.getRecommendations(studentId),
      this.config.getMilestones(studentId),
      this.config.getRoleRequiredSkills(studentId),
      this.config.getTargetDate(studentId),
    ]);

    const readiness = computeReadiness(skillStates, skillGaps, roleRequiredSkills, targetDate);
    readiness.studentId = studentId;

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    const dailyPlan = generateDailyPlan({
      studentId,
      skillStates,
      skillGaps,
      recommendations,
      milestones,
      roleRequiredSkills,
      targetDate,
    }, today);

    const weeklyPlan = generateWeeklyPlan({
      studentId,
      skillStates,
      skillGaps,
      recommendations,
      milestones,
      roleRequiredSkills,
      targetDate,
    }, weekStart);

    // Update milestone progress
    for (const milestone of milestones) {
      const evidence = new Map<UUID, number>(); // Would fetch from evidence repo
      const verification = new Map<UUID, boolean>(); // Would fetch from mastery
      const check = checkMilestoneCompletion(milestone, skillStates, evidence, verification);
      milestone.progress = updateMilestoneProgress(milestone, check);
      if (check.isComplete && milestone.status !== 'COMPLETED') {
        milestone.status = 'COMPLETED';
      }
    }

    return { readiness, dailyPlan, weeklyPlan, milestones };
  }

  async getReadiness(studentId: UUID): Promise<ReadinessReport> {
    const [skillStates, skillGaps, roleRequiredSkills, targetDate] = await Promise.all([
      this.config.getStudentSkillStates(studentId),
      this.config.getSkillGaps(studentId),
      this.config.getRoleRequiredSkills(studentId),
      this.config.getTargetDate(studentId),
    ]);

    const readiness = computeReadiness(skillStates, skillGaps, roleRequiredSkills, targetDate);
    readiness.studentId = studentId;
    return readiness;
  }

  async getDailyPlan(studentId: UUID, date: Date = new Date()): Promise<DailyPlan> {
    const [skillStates, skillGaps, recommendations, milestones, roleRequiredSkills, targetDate] = await Promise.all([
      this.config.getStudentSkillStates(studentId),
      this.config.getSkillGaps(studentId),
      this.config.getRecommendations(studentId),
      this.config.getMilestones(studentId),
      this.config.getRoleRequiredSkills(studentId),
      this.config.getTargetDate(studentId),
    ]);

    return generateDailyPlan({
      studentId,
      skillStates,
      skillGaps,
      recommendations,
      milestones,
      roleRequiredSkills,
      targetDate,
    }, date);
  }

  async getWeeklyPlan(studentId: UUID, weekStart: Date = new Date()): Promise<WeeklyPlan> {
    const [skillStates, skillGaps, recommendations, milestones, roleRequiredSkills, targetDate] = await Promise.all([
      this.config.getStudentSkillStates(studentId),
      this.config.getSkillGaps(studentId),
      this.config.getRecommendations(studentId),
      this.config.getMilestones(studentId),
      this.config.getRoleRequiredSkills(studentId),
      this.config.getTargetDate(studentId),
    ]);

    return generateWeeklyPlan({
      studentId,
      skillStates,
      skillGaps,
      recommendations,
      milestones,
      roleRequiredSkills,
      targetDate,
    }, weekStart);
  }
}

function randomUUID(): UUID {
  return crypto.randomUUID() as UUID;
}

export default {
  computePriority,
  checkMilestoneCompletion,
  updateMilestoneProgress,
  computeReadiness,
  generateDailyPlan,
  generateWeeklyPlan,
  createRecalculationEngine,
  RoadmapService,
};
