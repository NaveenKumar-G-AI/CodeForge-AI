/**
 * CodeForge AI - Learning Session Orchestration Engine
 *
 * Part 7: Bridges roadmap planning and practice/interview work by building
 * executable learning sessions, tracking lifecycle state, and selecting the
 * next action for the student.
 */

import { randomUUID } from 'crypto';
import { SCHEDULER_CONFIG } from '../../config/index.js';
import {
  iso8601,
  uuid,
  NotFoundError,
  type ActivityType,
  type DailyPlan,
  type Evidence,
  type ISO8601,
  type LearningSession,
  type LearningSessionActivity,
  type LearningSessionActivityState,
  type LearningSessionEvent,
  type LearningSessionEventType,
  type LearningSessionFocus,
  type LearningSessionMode,
  type LearningSessionNextAction,
  type LearningSessionSkillCoverage,
  type LearningSessionSummary,
  type Priority,
  type Recommendation,
  type StudentSkillState,
  type UUID,
} from '../../domain/types.js';

export interface LearningSessionPlanInput {
  studentId: UUID;
  requestedMode?: LearningSessionMode;
  availableMinutes?: number;
  recommendations: Recommendation[];
  dailyPlan?: DailyPlan | null;
  skillStates: StudentSkillState[];
  recentEvidence?: Evidence[];
  now?: Date;
}

export interface ActivityCompletionInput {
  evidenceIds?: UUID[];
  score?: number | null;
  completedAt?: Date;
}

export interface ActivitySkipInput {
  reason?: string;
  skippedAt?: Date;
}

const PRIORITY_RANK: Record<Priority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  VERY_HIGH: 3,
  CRITICAL: 4,
};

const INTERVENTION_TO_ACTIVITY: Record<Recommendation['interventionType'], ActivityType> = {
  TARGETED_PRACTICE: 'TARGETED_PRACTICE',
  DEBUGGING: 'DEBUGGING',
  TRANSFER: 'TRANSFER',
  REVIEW: 'REVIEW',
  VERIFICATION: 'VERIFICATION',
  LEARN: 'LEARN',
  PREREQUISITE_REVIEW: 'REVIEW',
  EXPLORATION: 'EXPLORATION',
};

const TERMINAL_STATES = new Set<LearningSession['state']>(['COMPLETED', 'ABANDONED', 'EXPIRED']);

export class LearningSessionService {
  plan(input: LearningSessionPlanInput): LearningSession {
    return createLearningSessionPlan(input);
  }

  start(session: LearningSession, now: Date = new Date()): LearningSession {
    return startLearningSession(session, now);
  }

  pause(session: LearningSession, now: Date = new Date()): LearningSession {
    return pauseLearningSession(session, now);
  }

  resume(session: LearningSession, now: Date = new Date()): LearningSession {
    return resumeLearningSession(session, now);
  }

  startActivity(session: LearningSession, activityId: UUID, now: Date = new Date()): LearningSession {
    return startLearningSessionActivity(session, activityId, now);
  }

  completeActivity(session: LearningSession, activityId: UUID, input: ActivityCompletionInput = {}): LearningSession {
    return completeLearningSessionActivity(session, activityId, input);
  }

  skipActivity(session: LearningSession, activityId: UUID, input: ActivitySkipInput = {}): LearningSession {
    return skipLearningSessionActivity(session, activityId, input);
  }

  complete(session: LearningSession, now: Date = new Date()): LearningSession {
    return completeLearningSession(session, now);
  }

  abandon(session: LearningSession, reason?: string, now: Date = new Date()): LearningSession {
    return abandonLearningSession(session, reason, now);
  }

  nextAction(session: LearningSession, now: Date = new Date()): LearningSessionNextAction {
    return resolveNextSessionAction(session, now);
  }

  summarize(session: LearningSession, now: Date = new Date()): LearningSessionSummary {
    return summarizeLearningSession(session, now);
  }
}

export function createLearningSessionPlan(input: LearningSessionPlanInput): LearningSession {
  const now = input.now ?? new Date();
  const targetMinutes = normalizeMinutes(
    input.availableMinutes ?? SCHEDULER_CONFIG.preferredSessionLengthMinutes,
    SCHEDULER_CONFIG.maxSessionMinutes
  );
  const mode = input.requestedMode ?? inferSessionMode(input);
  const skillStateById = new Map(input.skillStates.map((state) => [state.skillId, state]));

  const candidates = [
    ...activitiesFromDailyPlan(input.dailyPlan),
    ...activitiesFromRecommendations(input.recommendations),
  ];

  const deduped = dedupeActivities(candidates);
  const sorted = sortActivitiesForSession(deduped, input.recentEvidence ?? []);
  let activities = selectActivitiesForTimebox(sorted, targetMinutes);

  if (activities.length === 0) {
    activities = selectActivitiesForTimebox(
      buildReviewActivities(input.skillStates, now),
      targetMinutes
    );
  }

  const totalEstimatedMinutes = activities.reduce((sum, activity) => sum + activity.estimatedMinutes, 0);
  const createdAt = toIso(now);
  const expiresAt = toIso(addHours(now, 24));

  return {
    id: uuid(randomUUID()),
    studentId: input.studentId,
    mode,
    state: 'PLANNED',
    title: buildSessionTitle(mode, activities),
    focusSkills: buildFocusSkills(activities, skillStateById),
    activities,
    activeActivityId: null,
    targetMinutes,
    totalEstimatedMinutes,
    startedAt: null,
    endedAt: null,
    expiresAt,
    createdAt,
    updatedAt: createdAt,
    metadata: {
      source: 'part7_learning_session_orchestrator',
      plannedFrom: {
        dailyPlan: input.dailyPlan ? input.dailyPlan.date : null,
        recommendations: input.recommendations.length,
        skillStates: input.skillStates.length,
      },
    },
  };
}

export function startLearningSession(session: LearningSession, now: Date = new Date()): LearningSession {
  if (TERMINAL_STATES.has(session.state)) return touch(session, now);

  const active = session.activities.find((activity) => activity.state === 'ACTIVE');
  if (active) {
    return touch({ ...session, state: 'ACTIVE', activeActivityId: active.id, startedAt: session.startedAt ?? toIso(now) }, now);
  }

  const next = session.activities.find((activity) => activity.state === 'QUEUED');
  if (!next) {
    return completeLearningSession(session, now);
  }

  const startedAt = toIso(now);
  const activities = session.activities.map((activity) =>
    activity.id === next.id
      ? { ...activity, state: 'ACTIVE' as LearningSessionActivityState, startedAt }
      : activity
  );

  return touch({
    ...session,
    state: 'ACTIVE',
    activities,
    activeActivityId: next.id,
    startedAt: session.startedAt ?? startedAt,
  }, now);
}

export function pauseLearningSession(session: LearningSession, now: Date = new Date()): LearningSession {
  if (session.state !== 'ACTIVE') return touch(session, now);
  return touch({ ...session, state: 'PAUSED' }, now);
}

export function resumeLearningSession(session: LearningSession, now: Date = new Date()): LearningSession {
  if (TERMINAL_STATES.has(session.state)) return touch(session, now);
  if (session.state === 'ACTIVE') return touch(session, now);
  return startLearningSession({ ...session, state: 'PLANNED' }, now);
}

export function startLearningSessionActivity(
  session: LearningSession,
  activityId: UUID,
  now: Date = new Date()
): LearningSession {
  assertActivityExists(session, activityId);
  if (TERMINAL_STATES.has(session.state)) return touch(session, now);

  const startedAt = toIso(now);
  const activities = session.activities.map((activity) => {
    if (activity.id === activityId) {
      return {
        ...activity,
        state: activity.state === 'COMPLETED' || activity.state === 'SKIPPED'
          ? activity.state
          : 'ACTIVE' as LearningSessionActivityState,
        startedAt: activity.startedAt ?? startedAt,
      };
    }
    return activity.state === 'ACTIVE'
      ? { ...activity, state: 'QUEUED' as LearningSessionActivityState }
      : activity;
  });

  const selected = activities.find((activity) => activity.id === activityId);
  return touch({
    ...session,
    state: selected?.state === 'ACTIVE' ? 'ACTIVE' : session.state,
    activities,
    activeActivityId: selected?.state === 'ACTIVE' ? activityId : session.activeActivityId,
    startedAt: session.startedAt ?? startedAt,
  }, now);
}

export function completeLearningSessionActivity(
  session: LearningSession,
  activityId: UUID,
  input: ActivityCompletionInput = {}
): LearningSession {
  assertActivityExists(session, activityId);
  const now = input.completedAt ?? new Date();
  const completedAt = toIso(now);
  const score = input.score === undefined ? null : clamp(input.score ?? 0, 0, 1);
  let completedWasActive = false;

  let activities = session.activities.map((activity) => {
    if (activity.id !== activityId) return activity;
    completedWasActive = activity.state === 'ACTIVE' || session.activeActivityId === activityId;
    return {
      ...activity,
      state: 'COMPLETED' as LearningSessionActivityState,
      evidenceIds: mergeUnique(activity.evidenceIds, input.evidenceIds ?? []),
      score,
      startedAt: activity.startedAt ?? completedAt,
      completedAt,
      skippedAt: null,
    };
  });

  let activeActivityId = completedWasActive ? null : session.activeActivityId;
  let state = session.state === 'PLANNED' ? 'ACTIVE' : session.state;

  if (completedWasActive && state === 'ACTIVE') {
    const next = activities.find((activity) => activity.state === 'QUEUED');
    if (next) {
      activeActivityId = next.id;
      activities = activities.map((activity) =>
        activity.id === next.id
          ? { ...activity, state: 'ACTIVE' as LearningSessionActivityState, startedAt: completedAt }
          : activity
      );
    }
  }

  const hasOpenActivities = activities.some((activity) => activity.state === 'QUEUED' || activity.state === 'ACTIVE');
  if (!hasOpenActivities) {
    state = 'COMPLETED';
    activeActivityId = null;
  }

  return touch({
    ...session,
    state,
    activities,
    activeActivityId,
    startedAt: session.startedAt ?? completedAt,
    endedAt: state === 'COMPLETED' ? completedAt : session.endedAt,
  }, now);
}

export function skipLearningSessionActivity(
  session: LearningSession,
  activityId: UUID,
  input: ActivitySkipInput = {}
): LearningSession {
  assertActivityExists(session, activityId);
  const now = input.skippedAt ?? new Date();
  const skippedAt = toIso(now);
  let skippedWasActive = false;

  let activities = session.activities.map((activity) => {
    if (activity.id !== activityId) return activity;
    skippedWasActive = activity.state === 'ACTIVE' || session.activeActivityId === activityId;
    return {
      ...activity,
      state: 'SKIPPED' as LearningSessionActivityState,
      skippedAt,
      metadata: {
        ...activity.metadata,
        skipReason: input.reason ?? 'student_skipped',
      },
    };
  });

  let activeActivityId = skippedWasActive ? null : session.activeActivityId;
  let state = session.state;

  if (skippedWasActive && state === 'ACTIVE') {
    const next = activities.find((activity) => activity.state === 'QUEUED');
    if (next) {
      activeActivityId = next.id;
      activities = activities.map((activity) =>
        activity.id === next.id
          ? { ...activity, state: 'ACTIVE' as LearningSessionActivityState, startedAt: skippedAt }
          : activity
      );
    }
  }

  const hasOpenActivities = activities.some((activity) => activity.state === 'QUEUED' || activity.state === 'ACTIVE');
  if (!hasOpenActivities) {
    state = 'COMPLETED';
    activeActivityId = null;
  }

  return touch({
    ...session,
    state,
    activities,
    activeActivityId,
    endedAt: state === 'COMPLETED' ? skippedAt : session.endedAt,
  }, now);
}

export function completeLearningSession(session: LearningSession, now: Date = new Date()): LearningSession {
  const endedAt = toIso(now);
  return touch({
    ...session,
    state: 'COMPLETED',
    activeActivityId: null,
    startedAt: session.startedAt ?? endedAt,
    endedAt,
  }, now);
}

export function abandonLearningSession(
  session: LearningSession,
  reason?: string,
  now: Date = new Date()
): LearningSession {
  const endedAt = toIso(now);
  return touch({
    ...session,
    state: 'ABANDONED',
    activeActivityId: null,
    endedAt,
    metadata: {
      ...session.metadata,
      abandonedReason: reason ?? 'not_provided',
    },
  }, now);
}

export function expireLearningSession(session: LearningSession, now: Date = new Date()): LearningSession {
  if (TERMINAL_STATES.has(session.state)) return touch(session, now);
  return touch({
    ...session,
    state: 'EXPIRED',
    activeActivityId: null,
    endedAt: toIso(now),
  }, now);
}

export function resolveNextSessionAction(
  session: LearningSession,
  now: Date = new Date()
): LearningSessionNextAction {
  if (!TERMINAL_STATES.has(session.state) && new Date(session.expiresAt).getTime() < now.getTime()) {
    return noAction('Session expired. Create a fresh session before continuing.');
  }

  if (session.state === 'PLANNED') {
    return {
      type: 'START_SESSION',
      label: 'Start session',
      reason: 'The learning session is planned and ready.',
      activityId: null,
      challengeId: null,
      skillId: session.focusSkills[0]?.skillId ?? null,
      priority: session.focusSkills[0]?.priority ?? null,
    };
  }

  if (session.state === 'PAUSED') {
    return {
      type: 'RESUME_SESSION',
      label: 'Resume session',
      reason: 'The session is paused.',
      activityId: session.activeActivityId,
      challengeId: null,
      skillId: session.focusSkills[0]?.skillId ?? null,
      priority: session.focusSkills[0]?.priority ?? null,
    };
  }

  if (session.state === 'COMPLETED') {
    return {
      type: 'FINISH_SESSION',
      label: 'Review summary',
      reason: 'All planned work in this session is closed.',
      activityId: null,
      challengeId: null,
      skillId: null,
      priority: null,
    };
  }

  if (session.state === 'ABANDONED' || session.state === 'EXPIRED') {
    return noAction(`Session is ${session.state.toLowerCase()}.`);
  }

  const active = session.activities.find((activity) => activity.id === session.activeActivityId && activity.state === 'ACTIVE')
    ?? session.activities.find((activity) => activity.state === 'ACTIVE');
  if (active) {
    return {
      type: active.challengeId ? 'SUBMIT_ATTEMPT' : 'CONTINUE_ACTIVITY',
      label: active.challengeId ? 'Continue challenge' : 'Continue activity',
      reason: active.reason,
      activityId: active.id,
      challengeId: active.challengeId,
      skillId: active.skillId,
      priority: active.priority,
    };
  }

  const next = session.activities.find((activity) => activity.state === 'QUEUED');
  if (next) {
    return {
      type: 'START_ACTIVITY',
      label: 'Start next activity',
      reason: next.reason,
      activityId: next.id,
      challengeId: next.challengeId,
      skillId: next.skillId,
      priority: next.priority,
    };
  }

  return {
    type: 'FINISH_SESSION',
    label: 'Complete session',
    reason: 'No queued or active activities remain.',
    activityId: null,
    challengeId: null,
    skillId: null,
    priority: null,
  };
}

export function summarizeLearningSession(
  session: LearningSession,
  now: Date = new Date()
): LearningSessionSummary {
  const completed = session.activities.filter((activity) => activity.state === 'COMPLETED');
  const skipped = session.activities.filter((activity) => activity.state === 'SKIPPED');
  const evidenceCount = session.activities.reduce((sum, activity) => sum + activity.evidenceIds.length, 0);
  const minutesCompleted = completed.reduce((sum, activity) => sum + activity.estimatedMinutes, 0);
  const totalActivities = session.activities.length;

  return {
    sessionId: session.id,
    studentId: session.studentId,
    state: session.state,
    completionRatio: totalActivities === 0 ? 0 : round(completed.length / totalActivities, 4),
    completedActivities: completed.length,
    skippedActivities: skipped.length,
    totalActivities,
    minutesPlanned: session.totalEstimatedMinutes,
    minutesCompleted,
    evidenceCount,
    skillCoverage: buildSkillCoverage(session.activities),
    nextAction: resolveNextSessionAction(session, now),
    generatedAt: toIso(now),
  };
}

export function createLearningSessionEvent(
  session: LearningSession,
  type: LearningSessionEventType,
  payload: Record<string, unknown> = {},
  activityId: UUID | null = null,
  now: Date = new Date()
): LearningSessionEvent {
  return {
    id: uuid(randomUUID()),
    sessionId: session.id,
    studentId: session.studentId,
    type,
    activityId,
    payload,
    createdAt: toIso(now),
  };
}

function activitiesFromDailyPlan(dailyPlan?: DailyPlan | null): LearningSessionActivity[] {
  if (!dailyPlan) return [];
  return dailyPlan.activities.map((activity, index) => ({
    id: uuid(randomUUID()),
    type: activity.type,
    skillId: activity.skillId,
    challengeId: activity.challengeId,
    recommendationId: null,
    state: 'QUEUED',
    estimatedMinutes: normalizeMinutes(activity.estimatedMinutes, SCHEDULER_CONFIG.maxSessionMinutes),
    priority: activity.priority,
    reason: activity.reason,
    evidenceIds: [],
    score: null,
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    metadata: {
      source: 'daily_plan',
      sourceActivityId: activity.id,
      sourceOrder: index,
      planDate: dailyPlan.date,
    },
  }));
}

function activitiesFromRecommendations(recommendations: Recommendation[]): LearningSessionActivity[] {
  return recommendations
    .filter((recommendation) => recommendation.status === 'PENDING' || recommendation.status === 'ACCEPTED')
    .map((recommendation, index) => ({
      id: uuid(randomUUID()),
      type: INTERVENTION_TO_ACTIVITY[recommendation.interventionType],
      skillId: recommendation.skillId,
      challengeId: recommendation.challengeId,
      recommendationId: recommendation.id,
      state: 'QUEUED',
      estimatedMinutes: estimateMinutesForRecommendation(recommendation),
      priority: priorityFromRecommendation(recommendation),
      reason: recommendation.reason || recommendation.learningObjective,
      evidenceIds: [],
      score: null,
      startedAt: null,
      completedAt: null,
      skippedAt: null,
      metadata: {
        source: 'recommendation',
        sourceOrder: index,
        gapType: recommendation.gapType,
        interventionType: recommendation.interventionType,
        rankingScore: recommendation.rankingScore,
      },
    }));
}

function buildReviewActivities(skillStates: StudentSkillState[], now: Date): LearningSessionActivity[] {
  const dueSkills = [...skillStates]
    .filter((state) => state.masteryState === 'STALE' || isDueForReview(state, now))
    .sort((a, b) => reviewUrgency(b, now) - reviewUrgency(a, now))
    .slice(0, 4);

  return dueSkills.map((state) => ({
    id: uuid(randomUUID()),
    type: state.masteryState === 'STALE' ? 'REVIEW' : 'VERIFICATION',
    skillId: state.skillId,
    challengeId: null,
    recommendationId: null,
    state: 'QUEUED',
    estimatedMinutes: Math.min(20, SCHEDULER_CONFIG.maxSessionMinutes),
    priority: state.masteryState === 'STALE' ? 'HIGH' : 'MEDIUM',
    reason: state.masteryState === 'STALE'
      ? 'Skill is stale and needs a retention review.'
      : 'Skill is due for a short verification check.',
    evidenceIds: [],
    score: null,
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    metadata: {
      source: 'review_fallback',
      masteryState: state.masteryState,
      nextReviewAt: state.nextReviewAt,
    },
  }));
}

function inferSessionMode(input: LearningSessionPlanInput): LearningSessionMode {
  const plannedTypes = input.dailyPlan?.activities.map((activity) => activity.type) ?? [];
  if (plannedTypes.includes('INTERVIEW_CHALLENGE')) return 'INTERVIEW_PREP';
  if (plannedTypes.includes('REVIEW') || input.skillStates.some((state) => state.masteryState === 'STALE')) return 'REVIEW';
  if (input.recommendations.some((rec) => rec.gapType === 'CRITICAL_GAP' || rec.interventionType === 'PREREQUISITE_REVIEW')) return 'RECOVERY';
  if (input.dailyPlan && input.dailyPlan.activities.length > 0) return 'ROADMAP_BLOCK';
  if (input.recommendations.some((rec) => rec.interventionType === 'VERIFICATION')) return 'ASSESSMENT_PREP';
  return 'FOCUSED_PRACTICE';
}

function buildSessionTitle(mode: LearningSessionMode, activities: LearningSessionActivity[]): string {
  const titleByMode: Record<LearningSessionMode, string> = {
    FOCUSED_PRACTICE: 'Focused Practice Session',
    ROADMAP_BLOCK: 'Roadmap Learning Block',
    REVIEW: 'Review Session',
    ASSESSMENT_PREP: 'Assessment Prep Session',
    INTERVIEW_PREP: 'Interview Prep Session',
    RECOVERY: 'Recovery Practice Session',
  };

  if (activities.length === 0) return titleByMode[mode];
  const top = activities[0];
  return `${titleByMode[mode]} - ${top.priority.toLowerCase()} priority`;
}

function buildFocusSkills(
  activities: LearningSessionActivity[],
  skillStateById: Map<UUID, StudentSkillState>
): LearningSessionFocus[] {
  const bySkill = new Map<UUID, LearningSessionFocus>();

  for (const activity of activities) {
    const existing = bySkill.get(activity.skillId);
    const state = skillStateById.get(activity.skillId);
    if (!existing) {
      bySkill.set(activity.skillId, {
        skillId: activity.skillId,
        priority: activity.priority,
        reason: activity.reason,
        targetMinutes: activity.estimatedMinutes,
        masteryState: state?.masteryState ?? null,
      });
      continue;
    }

    existing.targetMinutes += activity.estimatedMinutes;
    if (PRIORITY_RANK[activity.priority] > PRIORITY_RANK[existing.priority]) {
      existing.priority = activity.priority;
      existing.reason = activity.reason;
    }
  }

  return Array.from(bySkill.values())
    .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.targetMinutes - a.targetMinutes);
}

function dedupeActivities(activities: LearningSessionActivity[]): LearningSessionActivity[] {
  const seen = new Set<string>();
  const deduped: LearningSessionActivity[] = [];

  for (const activity of activities) {
    const key = activity.challengeId
      ? `challenge:${activity.challengeId}`
      : `skill:${activity.skillId}:${activity.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(activity);
  }

  return deduped;
}

function sortActivitiesForSession(
  activities: LearningSessionActivity[],
  recentEvidence: Evidence[]
): LearningSessionActivity[] {
  const recentSkillCounts = new Map<UUID, number>();
  for (const evidence of recentEvidence) {
    recentSkillCounts.set(evidence.skillId, (recentSkillCounts.get(evidence.skillId) ?? 0) + 1);
  }

  return [...activities].sort((a, b) => {
    const priorityDelta = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (priorityDelta !== 0) return priorityDelta;

    const recencyDelta = (recentSkillCounts.get(a.skillId) ?? 0) - (recentSkillCounts.get(b.skillId) ?? 0);
    if (recencyDelta !== 0) return recencyDelta;

    return sourceOrder(a) - sourceOrder(b);
  });
}

function selectActivitiesForTimebox(
  activities: LearningSessionActivity[],
  targetMinutes: number
): LearningSessionActivity[] {
  const selected: LearningSessionActivity[] = [];
  let total = 0;

  for (const activity of activities) {
    if (selected.length > 0 && total + activity.estimatedMinutes > targetMinutes) continue;
    selected.push(activity);
    total += activity.estimatedMinutes;
    if (total >= targetMinutes) break;
  }

  return selected;
}

function buildSkillCoverage(activities: LearningSessionActivity[]): LearningSessionSkillCoverage[] {
  const bySkill = new Map<UUID, LearningSessionSkillCoverage & { scoreTotal: number; scoreCount: number }>();

  for (const activity of activities) {
    const existing = bySkill.get(activity.skillId) ?? {
      skillId: activity.skillId,
      plannedActivities: 0,
      completedActivities: 0,
      evidenceCount: 0,
      averageScore: null,
      scoreTotal: 0,
      scoreCount: 0,
    };

    existing.plannedActivities++;
    if (activity.state === 'COMPLETED') existing.completedActivities++;
    existing.evidenceCount += activity.evidenceIds.length;
    if (activity.score !== null) {
      existing.scoreTotal += activity.score;
      existing.scoreCount++;
      existing.averageScore = round(existing.scoreTotal / existing.scoreCount, 4);
    }
    bySkill.set(activity.skillId, existing);
  }

  return Array.from(bySkill.values()).map(({ scoreTotal: _scoreTotal, scoreCount: _scoreCount, ...coverage }) => coverage);
}

function priorityFromRecommendation(recommendation: Recommendation): Priority {
  if (recommendation.gapType === 'CRITICAL_GAP' || recommendation.interventionType === 'PREREQUISITE_REVIEW') return 'CRITICAL';
  if (recommendation.rankingScore >= 0.85) return 'VERY_HIGH';
  if (recommendation.rankingScore >= 0.7) return 'HIGH';
  if (recommendation.rankingScore >= 0.4) return 'MEDIUM';
  return 'LOW';
}

function estimateMinutesForRecommendation(recommendation: Recommendation): number {
  const snapshotMinutes = recommendation.evidenceSnapshot.estimatedMinutes;
  if (typeof snapshotMinutes === 'number' && Number.isFinite(snapshotMinutes)) {
    return normalizeMinutes(snapshotMinutes, SCHEDULER_CONFIG.maxSessionMinutes);
  }

  const defaultMinutes: Record<Recommendation['interventionType'], number> = {
    LEARN: 30,
    TARGETED_PRACTICE: 35,
    DEBUGGING: 40,
    TRANSFER: 45,
    REVIEW: 20,
    VERIFICATION: 25,
    PREREQUISITE_REVIEW: 25,
    EXPLORATION: 30,
  };

  return defaultMinutes[recommendation.interventionType];
}

function isDueForReview(state: StudentSkillState, now: Date): boolean {
  if (!state.nextReviewAt) return false;
  return new Date(state.nextReviewAt).getTime() <= now.getTime();
}

function reviewUrgency(state: StudentSkillState, now: Date): number {
  const dueScore = state.nextReviewAt
    ? Math.max(0, Math.ceil((now.getTime() - new Date(state.nextReviewAt).getTime()) / 86400000))
    : 0;
  const staleBonus = state.masteryState === 'STALE' ? 100 : 0;
  const confidencePenalty = Math.round((1 - state.confidenceScore) * 10);
  return staleBonus + dueScore + confidencePenalty;
}

function sourceOrder(activity: LearningSessionActivity): number {
  const value = activity.metadata.sourceOrder;
  return typeof value === 'number' ? value : Number.MAX_SAFE_INTEGER;
}

function assertActivityExists(session: LearningSession, activityId: UUID): void {
  if (!session.activities.some((activity) => activity.id === activityId)) {
    throw new NotFoundError('Learning session activity not found');
  }
}

function normalizeMinutes(minutes: number, max: number): number {
  if (!Number.isFinite(minutes)) return Math.min(45, max);
  return Math.max(5, Math.min(max, Math.round(minutes)));
}

function touch(session: LearningSession, now: Date): LearningSession {
  return {
    ...session,
    updatedAt: toIso(now),
  };
}

function noAction(reason: string): LearningSessionNextAction {
  return {
    type: 'NO_ACTION_AVAILABLE',
    label: 'No action available',
    reason,
    activityId: null,
    challengeId: null,
    skillId: null,
    priority: null,
  };
}

function mergeUnique<T>(left: T[], right: T[]): T[] {
  return Array.from(new Set([...left, ...right]));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function toIso(date: Date): ISO8601 {
  return iso8601(date.toISOString());
}

