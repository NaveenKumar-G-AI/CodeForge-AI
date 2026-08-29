/**
 * CodeForge AI — Engine Module Exports
 */

export * from './mastery.js';
export * from './gaps.js';
export * from './difficulty.js';
export * from './recommendation.js';
export * from './roadmap.js';

// ============================================================================
// PARTS 16–32 ENGINES
// ============================================================================

export * from './correctness/index.js';
export * from './complexity/index.js';
export * from './quality/index.js';
export * from './reasoning/index.js';
export * from './consistency/index.js';
export * from './understanding/index.js';
export * from './debugging/index.js';
export * from './coach/index.js';
export * from './review/index.js';
export {
  computeSkillState as computeAdaptiveSkillState,
  scoreCandidate as scoreAdaptiveCandidate,
  selectNextChallenge,
  DEFAULT_WEIGHTS as DEFAULT_ADAPTIVE_WEIGHTS,
  computeEvidenceWeight as computeAdaptiveEvidenceWeight,
  initializePathState,
  evaluateStageTransition,
  advanceStage,
  getStageInfo,
  getStageChallengeProfile,
  STAGE_ORDER,
} from './adaptive/index.js';
export type { SelectionObjectiveWeights } from './adaptive/index.js';
export * from './signal/index.js';
export * from './growth/index.js';
export * from './gap/index.js';
export {
  computeReadiness as computeRoleReadiness,
  generateReadinessExplanation,
  getReadinessNextSteps,
} from './readiness/index.js';
export type { ReadinessInput } from './readiness/index.js';
export * from './gateway/index.js';

// ============================================================================
// ENGINE FACTORY
// ============================================================================

import { randomUUID } from 'crypto';
import { DatabaseClient } from '../db/client.js';
import { RepositoryRegistry } from '../repositories/index.js';
import {
  uuid,
  type CandidateEvidenceBundle,
  type CodeForgeIntelligencePorts,
  type Cohort,
  type CohortRoleAggregate,
  type CohortSkillAggregate,
  type CohortSnapshotRecord,
  type CohortTrainingInsight,
  type InterviewResponse,
  type RoleSkillRequirements,
  type SkillEvidenceRecord,
  type StructuredEvaluation,
  type TechnicalInterviewBlueprint,
  type TechnicalInterviewQuestion,
  type TechnicalInterviewSession,
} from '../domain/types.js';
import { RecommendationService, RecommendationServiceConfig } from './recommendation.js';
import { RoadmapService, RoadmapServiceConfig } from './roadmap.js';
import { initializeCohortIntelligenceService } from './cohort-intelligence/CohortIntelligenceService.js';
import type { CohortRepository } from './cohort-intelligence/CohortRepository.js';
import { initializeInterviewService } from './interview/InterviewService.js';
import type { InterviewRepository as TechnicalInterviewRepository } from './interview/InterviewRepository.js';
import type { AIGateway } from './interview/EvaluationPipeline.js';

export interface EngineRegistry {
  recommendation: RecommendationService;
  roadmap: RoadmapService;
  // Parts 16-32 engines would be instantiated here
}

function createInMemoryCohortRepository(): CohortRepository {
  const cohorts = new Map<string, Cohort>();
  const memberships = new Map<string, import('../domain/types.js').Membership>();
  const skillAggregates = new Map<string, CohortSkillAggregate>();
  const roleAggregates = new Map<string, CohortRoleAggregate>();
  const trainingInsights = new Map<string, CohortTrainingInsight>();
  const snapshots = new Map<string, CohortSnapshotRecord>();

  return {
    async createCohort(input) {
      const now = new Date();
      const cohort: Cohort = {
        id: randomUUID(),
        organizationId: input.organizationId,
        name: input.name,
        kind: input.kind,
        dimension: input.dimension,
        parentCohortId: input.parentCohortId ?? null,
        attributes: input.attributes ?? {},
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      cohorts.set(cohort.id, cohort);
      return cohort;
    },
    async getCohort(id) {
      return cohorts.get(id) ?? null;
    },
    async listCohorts(orgId) {
      return Array.from(cohorts.values()).filter(c => c.organizationId === orgId && c.isActive);
    },
    async updateCohort(id, updates) {
      const existing = cohorts.get(id);
      if (!existing) throw new Error('Cohort not found');
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      cohorts.set(id, updated);
      return updated;
    },
    async deleteCohort(id) {
      const existing = cohorts.get(id);
      if (existing) {
        cohorts.set(id, { ...existing, isActive: false, updatedAt: new Date() });
      }
    },
    async addMember(cohortId, studentId) {
      const cohort = cohorts.get(cohortId);
      if (!cohort) throw new Error('Cohort not found');
      const member = {
        id: randomUUID(),
        organizationId: cohort.organizationId,
        cohortId,
        studentId,
        joinedAt: new Date(),
        leftAt: null,
        isActive: true,
      };
      memberships.set(`${cohortId}:${studentId}`, member);
      return member;
    },
    async removeMember(cohortId, studentId) {
      const key = `${cohortId}:${studentId}`;
      const existing = memberships.get(key);
      if (existing) {
        memberships.set(key, { ...existing, isActive: false, leftAt: new Date() });
      }
    },
    async listMembers(cohortId) {
      return Array.from(memberships.values()).filter(m => m.cohortId === cohortId && m.isActive);
    },
    async getMember(cohortId, studentId) {
      const member = memberships.get(`${cohortId}:${studentId}`);
      return member?.isActive ? member : null;
    },
    async listCohortIdsForStudent(studentId) {
      return Array.from(memberships.values())
        .filter(m => m.studentId === studentId && m.isActive)
        .map(m => m.cohortId);
    },
    async upsertSkillAggregate(agg) {
      skillAggregates.set(`${agg.cohortId}:${agg.skillId}`, agg);
    },
    async getSkillAggregates(cohortId) {
      return Array.from(skillAggregates.values()).filter(a => a.cohortId === cohortId);
    },
    async upsertRoleAggregate(agg) {
      roleAggregates.set(`${agg.cohortId}:${agg.roleId}`, agg);
    },
    async getRoleAggregates(cohortId) {
      return Array.from(roleAggregates.values()).filter(a => a.cohortId === cohortId);
    },
    async upsertTrainingInsight(insight) {
      trainingInsights.set(`${insight.cohortId}:${insight.skillId}:${insight.priorityRank}`, insight);
    },
    async getTrainingInsights(cohortId) {
      return Array.from(trainingInsights.values()).filter(i => i.cohortId === cohortId);
    },
    async createSnapshot(snapshot) {
      snapshots.set(snapshot.id, snapshot);
    },
    async listSnapshots(cohortId) {
      return Array.from(snapshots.values()).filter(s => s.cohortId === cohortId);
    },
    async getCohortSize(cohortId) {
      return Array.from(memberships.values()).filter(m => m.cohortId === cohortId && m.isActive).length;
    },
    async getPrivacyPolicy() {
      return { minCohortSize: 10, minCoverageForClaim: 0.6 };
    },
  };
}

function createEmptyIntelligencePorts(): CodeForgeIntelligencePorts {
  return {
    skillSignal: {
      async listKnownSkills() { return []; },
      async getSkillSignalsForStudents() { return []; },
    },
    roleReadiness: {
      async listSupportedRoles() { return []; },
      async getRoleReadinessForStudents() { return []; },
    },
    growthTracking: {
      async getGrowthSamples() { return []; },
    },
    nextBestAction: {
      async getRecommendedFocusAreas() { return []; },
    },
  };
}

function createInMemoryTechnicalInterviewRepository(): TechnicalInterviewRepository {
  const blueprints = new Map<string, TechnicalInterviewBlueprint>();
  const sessions = new Map<string, TechnicalInterviewSession>();
  const questions = new Map<string, TechnicalInterviewQuestion>();
  const responses = new Map<string, InterviewResponse>();
  const evaluations = new Map<string, StructuredEvaluation>();
  const skillEvidence = new Map<string, SkillEvidenceRecord[]>();

  return {
    async createBlueprint(blueprint) {
      blueprints.set(blueprint.id, blueprint);
    },
    async getBlueprint(id) {
      return blueprints.get(id) ?? null;
    },
    async createSession(session) {
      sessions.set(session.id, session);
    },
    async getSession(id) {
      return sessions.get(id) ?? null;
    },
    async updateSession(id, updates) {
      const existing = sessions.get(id);
      if (!existing) throw new Error('Session not found');
      sessions.set(id, { ...existing, ...updates, updatedAt: new Date().toISOString() });
    },
    async addQuestion(question) {
      questions.set(question.id, question);
      const session = sessions.get(question.sessionId);
      if (session) {
        sessions.set(question.sessionId, {
          ...session,
          currentQuestionId: question.id,
          lastActivityAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    },
    async getQuestion(id) {
      return questions.get(id) ?? null;
    },
    async listQuestions(sessionId) {
      return Array.from(questions.values()).filter(q => q.sessionId === sessionId);
    },
    async addResponse(response) {
      responses.set(response.id, response);
    },
    async getResponse(id) {
      return responses.get(id) ?? null;
    },
    async listResponses(sessionId) {
      return Array.from(responses.values()).filter(r => r.sessionId === sessionId);
    },
    async addEvaluation(evaluation) {
      evaluations.set(evaluation.id, evaluation);
    },
    async getEvaluationForResponse(responseId) {
      return Array.from(evaluations.values()).find(e => e.responseId === responseId) ?? null;
    },
    async listEvaluations(sessionId) {
      const responseIds = new Set(
        Array.from(responses.values()).filter(r => r.sessionId === sessionId).map(r => r.id)
      );
      return Array.from(evaluations.values()).filter(e => responseIds.has(e.responseId));
    },
    async addSkillEvidence(sessionId, evidence) {
      skillEvidence.set(sessionId, [...(skillEvidence.get(sessionId) ?? []), ...evidence]);
    },
    async getSkillEvidence(sessionId) {
      return skillEvidence.get(sessionId) ?? [];
    },
    async recordEvent() {},
    async listSessionsForCandidate(candidateId) {
      return Array.from(sessions.values()).filter(s => s.candidateId === candidateId);
    },
  };
}

function createFallbackInterviewGateway(): AIGateway {
  return {
    async evaluateResponse(input) {
      return {
        answerQuality: 'PARTIALLY_CORRECT',
        consistency: 'UNCERTAIN',
        dimensions: Object.fromEntries(input.dimensions.map(d => [d, 'NOT_APPLICABLE'])),
        evidenceConfidence: 'LOW',
        rationaleSummary: 'Automated fallback evaluation completed without candidate-specific evidence.',
        grounded: false,
      };
    },
  };
}

function initializeAdvancedServices(): void {
  initializeCohortIntelligenceService({
    repo: createInMemoryCohortRepository(),
    ports: createEmptyIntelligencePorts(),
    aiProvider: null,
  });

  initializeInterviewService({
    repo: createInMemoryTechnicalInterviewRepository(),
    aiGateway: createFallbackInterviewGateway(),
    roleSkillModel: {
      async getRoleSkillRequirements(_orgId: string, role: string): Promise<RoleSkillRequirements> {
        return {
          role,
          skills: [{ skill: 'general-programming', importance: 'CORE', expectedDifficulty: 'MEDIUM' }],
        };
      },
    },
    candidateEvidence: {
      async getExistingEvidence(_orgId: string, candidateId: string, skills: string[]): Promise<CandidateEvidenceBundle> {
        return {
          candidateId,
          bySkill: Object.fromEntries(skills.map(skill => [skill, []])),
        };
      },
    },
    auditLog: {
      async record() {},
    },
  });
}

export function createEngineRegistry(db: DatabaseClient, repos: RepositoryRegistry): EngineRegistry {
  initializeAdvancedServices();

  // Recommendation service config
  const recommendationConfig: RecommendationServiceConfig = {
    getStudentSkillStates: async (studentId) => {
      const states = await repos.studentSkillState.findByStudent(studentId);
      return new Map(states.map(s => [s.skillId, s]));
    },
    getEvidence: async (studentId, skillId) => {
      return repos.evidence.findByStudentAndSkill(studentId, skillId);
    },
    getPrerequisites: async (skillId) => {
      // This would query skill_prerequisite table
      return [];
    },
    getChallengeRepository: () => {
      // Return adapter over repos.challenge
      return {
        getCandidatesForSkill: async (skillId, targetLevel, excludeIds) => {
          const challenges = await repos.challenge.findBySkill(skillId);
          return challenges.filter(c =>
            c.difficultyLevel === targetLevel &&
            !excludeIds.includes(c.id)
          );
        },
        getTransferCandidates: async (skillId, targetLevel, excludeIds) => {
          const challenges = await repos.challenge.findBySkill(skillId);
          return challenges.filter(c =>
            c.contextType === 'NOVEL' &&
            c.difficultyLevel === targetLevel &&
            !excludeIds.includes(c.id)
          );
        },
        getVerificationCandidates: async (skillId, targetLevel, excludeIds) => {
          const challenges = await repos.challenge.findBySkill(skillId);
          return challenges.filter(c =>
            c.isVerification &&
            c.difficultyLevel === targetLevel &&
            !excludeIds.includes(c.id)
          );
        },
        getPrerequisiteCandidates: async (skillId, targetLevel, excludeIds) => {
          const challenges = await repos.challenge.findBySkill(skillId);
          return challenges.filter(c =>
            c.difficultyLevel === targetLevel &&
            !excludeIds.includes(c.id)
          );
        },
        getExplorationCandidates: async (skillId, excludeIds) => {
          const challenges = await repos.challenge.findBySkill(skillId);
          return challenges.filter(c => !excludeIds.includes(c.id)).slice(0, 10);
        },
        getReviewCandidates: async (skillId, targetLevel, excludeIds) => {
          const challenges = await repos.challenge.findBySkill(skillId);
          return challenges.filter(c =>
            c.isVerification &&
            c.difficultyLevel === targetLevel &&
            !excludeIds.includes(c.id)
          );
        },
      };
    },
    getStudentRole: async (studentId) => {
      const context = await repos.studentCareerContext.findByStudent(studentId);
      if (!context) return null;
      // Would need to look up role priority
      return { roleId: context.primaryRoleId, priority: 'MEDIUM' as any };
    },
    getStudentGoal: async (studentId) => {
      // Would fetch from student profile
      return null;
    },
    getRecentRecommendations: async (studentId, limit) => {
      const recs = await repos.recommendation.findPendingByStudent(studentId);
      return recs.slice(0, limit);
    },
    getRecentAttempts: async (studentId, limit) => {
      const submissions = await repos.submission.findByStudent(studentId, limit);
      return submissions.map(s => s.challengeId);
    },
  };

  // Roadmap service config
  const roadmapConfig: RoadmapServiceConfig = {
    getStudentSkillStates: recommendationConfig.getStudentSkillStates,
    getSkillGaps: async (studentId) => {
      const states = await repos.studentSkillState.findByStudent(studentId);
      const gaps = new Map<ReturnType<typeof uuid>, any[]>();
      for (const state of states) {
        const evidence = await repos.evidence.findByStudentAndSkill(studentId, state.skillId);
        // Build gaps from state and evidence
        gaps.set(uuid(state.skillId), []);
      }
      return gaps;
    },
    getRecommendations: async (studentId) => {
      const recs = await repos.recommendation.findPendingByStudent(studentId);
      return recs.map(r => ({
        challengeId: r.challengeId,
        skillId: r.skillId,
        priority: 'MEDIUM' as any,
        estimatedMinutes: 30,
      }));
    },
    getMilestones: async (studentId) => {
      return repos.milestone.findByStudent(studentId);
    },
    getRoleRequiredSkills: async (studentId) => {
      const context = await repos.studentCareerContext.findByStudent(studentId);
      if (!context) return [];
      // Would fetch from role_skill table
      return [];
    },
    getTargetDate: async (studentId) => {
      // Would fetch from student profile
      return null;
    },
  };

  return {
    recommendation: new RecommendationService(recommendationConfig),
    roadmap: new RoadmapService(roadmapConfig),
  };
}

export default {
  createEngineRegistry,
};
