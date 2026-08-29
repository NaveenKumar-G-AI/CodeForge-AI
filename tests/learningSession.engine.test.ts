import { describe, expect, it } from 'vitest';
import {
  completeLearningSessionActivity,
  createLearningSessionPlan,
  resolveNextSessionAction,
  startLearningSession,
  summarizeLearningSession,
} from '../src/engine/learning-session/index.js';
import {
  iso8601,
  uuid,
  type DailyPlan,
  type Recommendation,
  type StudentSkillState,
  type UUID,
} from '../src/domain/types.js';

const now = new Date('2026-08-29T09:00:00.000Z');
const studentId = uuid('00000000-0000-4000-8000-000000000001');
const skillA = uuid('00000000-0000-4000-8000-000000000101');
const skillB = uuid('00000000-0000-4000-8000-000000000102');
const challengeA = uuid('00000000-0000-4000-8000-000000000201');
const challengeB = uuid('00000000-0000-4000-8000-000000000202');

describe('Part 7 learning session engine', () => {
  it('plans a time-boxed session from roadmap activities and recommendations', () => {
    const plan = createLearningSessionPlan({
      studentId,
      availableMinutes: 55,
      dailyPlan: dailyPlan(),
      recommendations: [
        recommendation({
          id: uuid('00000000-0000-4000-8000-000000000301'),
          skillId: skillA,
          challengeId: challengeA,
          rankingScore: 0.9,
          estimatedMinutes: 20,
        }),
        recommendation({
          id: uuid('00000000-0000-4000-8000-000000000302'),
          skillId: skillB,
          challengeId: challengeB,
          rankingScore: 0.95,
          estimatedMinutes: 20,
        }),
      ],
      skillStates: [skillState(skillA), skillState(skillB)],
      now,
    });

    expect(plan.mode).toBe('ROADMAP_BLOCK');
    expect(plan.state).toBe('PLANNED');
    expect(plan.activities).toHaveLength(2);
    expect(plan.totalEstimatedMinutes).toBeLessThanOrEqual(55);
    expect(plan.focusSkills.map((focus) => focus.skillId)).toContain(skillB);
    expect(resolveNextSessionAction(plan).type).toBe('START_SESSION');
  });

  it('creates review fallback activities when no roadmap work is available', () => {
    const plan = createLearningSessionPlan({
      studentId,
      recommendations: [],
      dailyPlan: null,
      skillStates: [
        skillState(skillA, {
          masteryState: 'STALE',
          nextReviewAt: iso8601('2026-08-20T00:00:00.000Z'),
        }),
      ],
      now,
    });

    expect(plan.mode).toBe('REVIEW');
    expect(plan.activities).toHaveLength(1);
    expect(plan.activities[0].type).toBe('REVIEW');
    expect(plan.focusSkills[0].masteryState).toBe('STALE');
  });

  it('advances lifecycle and summarizes completed work', () => {
    const plan = createLearningSessionPlan({
      studentId,
      availableMinutes: 20,
      dailyPlan: null,
      recommendations: [
        recommendation({
          id: uuid('00000000-0000-4000-8000-000000000303'),
          skillId: skillA,
          challengeId: challengeA,
          rankingScore: 0.7,
          estimatedMinutes: 15,
        }),
      ],
      skillStates: [skillState(skillA)],
      now,
    });

    const started = startLearningSession(plan, now);
    expect(started.state).toBe('ACTIVE');
    expect(started.activeActivityId).not.toBeNull();
    expect(resolveNextSessionAction(started).type).toBe('SUBMIT_ATTEMPT');

    const completed = completeLearningSessionActivity(started, started.activeActivityId!, {
      evidenceIds: [uuid('00000000-0000-4000-8000-000000000401')],
      score: 0.92,
      completedAt: new Date('2026-08-29T09:15:00.000Z'),
    });
    const summary = summarizeLearningSession(completed, new Date('2026-08-29T09:16:00.000Z'));

    expect(completed.state).toBe('COMPLETED');
    expect(summary.completionRatio).toBe(1);
    expect(summary.completedActivities).toBe(1);
    expect(summary.evidenceCount).toBe(1);
    expect(summary.skillCoverage[0].averageScore).toBe(0.92);
  });
});

function dailyPlan(): DailyPlan {
  return {
    date: '2026-08-29',
    studentId,
    totalEstimatedMinutes: 30,
    activities: [
      {
        id: uuid('00000000-0000-4000-8000-000000000501'),
        type: 'PRACTICE',
        skillId: skillA,
        challengeId: challengeA,
        estimatedMinutes: 30,
        priority: 'MEDIUM',
        reason: 'Roadmap practice block.',
      },
    ],
  };
}

function recommendation(input: {
  id: UUID;
  skillId: UUID;
  challengeId: UUID;
  rankingScore: number;
  estimatedMinutes: number;
}): Recommendation {
  return {
    id: input.id,
    studentId,
    challengeId: input.challengeId,
    skillId: input.skillId,
    gapType: 'SKILL_GAP',
    interventionType: 'TARGETED_PRACTICE',
    learningObjective: 'Practice the target skill.',
    reason: 'Recommended by adaptive engine.',
    rankingScore: input.rankingScore,
    isRepetition: false,
    isExploration: false,
    evidenceSnapshot: { estimatedMinutes: input.estimatedMinutes },
    status: 'PENDING',
    createdAt: iso8601('2026-08-29T08:00:00.000Z'),
    acceptedAt: null,
    completedAt: null,
  };
}

function skillState(skillId: UUID, overrides: Partial<StudentSkillState> = {}): StudentSkillState {
  return {
    studentId,
    skillId,
    masteryScore: 45,
    confidenceScore: 0.6,
    masteryState: 'DEVELOPING',
    trend: 'STABLE',
    evidenceCount: 3,
    independentSuccessCount: 1,
    distinctChallengesCount: 2,
    contradictionFlag: false,
    masteryVerified: false,
    lastAssessedAt: iso8601('2026-08-28T12:00:00.000Z'),
    nextReviewAt: null,
    ...overrides,
  };
}

