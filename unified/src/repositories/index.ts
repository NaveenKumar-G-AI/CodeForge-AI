/**
 * CodeForge AI — Unified Repository Interfaces
 *
 * Type-safe repository interfaces for all domain entities.
 * Implementations can use PostgreSQL, SQLite, or in-memory stores.
 */

import type {
  UUID,
  ISO8601,
  CareerDomain,
  RoleFamily,
  Role,
  RoleVersion,
  Competency,
  Skill,
  Technology,
  Institution,
  Student,
  StudentCareerContext,
  StudentRoleHistoryEntry,
  RoleVariant,
  Challenge,
  TestCase,
  StudentSkillState,
  Evidence,
  Misconception,
  Recommendation,
  Milestone,
  DailyPlan,
  WeeklyPlan,
  DiagnosticSession,
  DiagnosticAttempt,
  InterviewBlueprint,
  Interview,
  InterviewSession,
  InterviewProblem,
  InterviewEvent,
  InterviewEvaluation,
  IncidentBlueprint,
  Incident,
  IncidentHypothesis,
  IncidentAction,
  IncidentLogEntry,
  IncidentMetric,
  IncidentTrace,
  Postmortem,
  Project,
  ProjectTestCase,
  ProjectSubmission,
  ProjectEvaluation,
  ProjectRevision,
  Submission,
  SubmissionResult,
  NormalizedExecutionResult,
  CoachSession,
  CoachMessage,
  CoachObservation,
  HintLadderSession,
  HintRung,
  AuditEvent,
  DifficultyLevel,
  SupportedLanguage,
  TestCategory,
  AssistanceLevel,
  MasteryLevel,
  GapType,
  Verdict,
  InterviewState,
  SubmissionState,
  ProjectType,
  IncidentSeverity,
  IncidentPhase,
  HypothesisStatus,
  IncidentActionType,
  HintLadderState,
  HintType,
} from '../domain/types.js';

// ============================================================================
// BASE REPOSITORY INTERFACE
// ============================================================================

export interface Repository<T extends { id: UUID }> {
  findById(id: UUID): Promise<T | null>;
  findAll(options?: { limit?: number; offset?: number }): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(entity: T): Promise<T>;
  delete(id: UUID): Promise<void>;
}

export interface StudentRepository extends Repository<Student> {
  findByInstitution(institutionId: UUID): Promise<Student[]>;
  findByEmail(email: string): Promise<Student | null>;
  findByAuthSubject(authSubject: UUID): Promise<Student | null>;
}

export interface CareerDomainRepository extends Repository<CareerDomain> {
  findBySlug(slug: string): Promise<CareerDomain | null>;
  findActive(): Promise<CareerDomain[]>;
}

export interface RoleFamilyRepository extends Repository<RoleFamily> {
  findBySlug(slug: string): Promise<RoleFamily | null>;
  findByCareerDomain(careerDomainId: UUID): Promise<RoleFamily[]>;
  findActive(): Promise<RoleFamily[]>;
}

export interface RoleRepository extends Repository<Role> {
  findBySlug(slug: string): Promise<Role | null>;
  findByFamily(roleFamilyId: UUID): Promise<Role[]>;
  findActive(): Promise<Role[]>;
  findWithDetails(slug: string): Promise<RoleDetail | null>;
}

export interface RoleVersionRepository extends Repository<RoleVersion> {
  findByRole(roleId: UUID): Promise<RoleVersion[]>;
  findCurrent(roleId: UUID): Promise<RoleVersion | null>;
}

export interface RoleDetail {
  role: Role;
  version: RoleVersion;
  family: RoleFamily;
  domain: CareerDomain;
  competencies: Array<{
    competency: Competency;
    importance: string;
    expectedProficiency: string;
    required: boolean;
  }>;
  skills: Array<{
    skill: Skill;
    importance: string;
    expectedProficiency: string;
  }>;
  technologies: Array<{
    technology: Technology;
    usageType: string;
  }>;
}

export interface CompetencyRepository extends Repository<Competency> {
  findBySlug(slug: string): Promise<Competency | null>;
  findByParent(parentId: UUID): Promise<Competency[]>;
  findRoots(): Promise<Competency[]>;
}

export interface SkillRepository extends Repository<Skill> {
  findBySlug(slug: string): Promise<Skill | null>;
  findByCompetency(competencyId: UUID): Promise<Skill[]>;
  findByParent(parentId: UUID): Promise<Skill[]>;
  findRoots(): Promise<Skill[]>;
  findPrerequisites(skillId: UUID): Promise<Skill[]>;
  findDependents(skillId: UUID): Promise<Skill[]>;
}

export interface TechnologyRepository extends Repository<Technology> {
  findBySlug(slug: string): Promise<Technology | null>;
  findByType(type: string): Promise<Technology[]>;
}

export interface InstitutionRepository extends Repository<Institution> {
  findByDomain(domain: string): Promise<Institution | null>;
}

export interface StudentCareerContextRepository {
  findByStudent(studentId: UUID): Promise<StudentCareerContext | null>;
  upsert(context: StudentCareerContext): Promise<StudentCareerContext>;
  delete(studentId: UUID): Promise<void>;
}

export interface StudentRoleHistoryRepository {
  findByStudent(studentId: UUID): Promise<StudentRoleHistoryEntry[]>;
  create(entry: StudentRoleHistoryEntry): Promise<StudentRoleHistoryEntry>;
  endRole(studentId: UUID, roleId: UUID, slot: string): Promise<void>;
}

export interface RoleVariantRepository {
  findByInstitutionAndRole(institutionId: UUID, roleId: UUID): Promise<RoleVariant | null>;
  findByInstitution(institutionId: UUID): Promise<RoleVariant[]>;
  upsert(variant: RoleVariant): Promise<RoleVariant>;
}

// ============================================================================
// CHALLENGE REPOSITORIES (Parts 3, 5)
// ============================================================================

export interface ChallengeRepository extends Repository<Challenge> {
  findBySkill(skillId: UUID): Promise<Challenge[]>;
  findByDifficulty(level: DifficultyLevel): Promise<Challenge[]>;
  findActive(): Promise<Challenge[]>;
  findByStatus(status: string): Promise<Challenge[]>;
  getTestCases(challengeId: UUID, language?: SupportedLanguage): Promise<TestCase[]>;
  findByPrimarySkill(skillId: UUID): Promise<Challenge[]>;
  findByContextType(contextType: string): Promise<Challenge[]>;
  findVerification(): Promise<Challenge[]>;
  findByQualityStatus(status: string): Promise<Challenge[]>;
}

export interface TestCaseRepository extends Repository<TestCase> {
  findByChallenge(challengeId: UUID): Promise<TestCase[]>;
  findPublicByChallenge(challengeId: UUID): Promise<TestCase[]>;
  findHiddenByChallenge(challengeId: UUID): Promise<TestCase[]>;
}

// ============================================================================
// MASTERY & EVIDENCE REPOSITORIES (Parts 5, 9)
// ============================================================================

export interface StudentSkillStateRepository {
  findByStudent(studentId: UUID): Promise<StudentSkillState[]>;
  findByStudentAndSkill(studentId: UUID, skillId: UUID): Promise<StudentSkillState | null>;
  upsert(state: StudentSkillState): Promise<StudentSkillState>;
  updateMasteryState(studentId: UUID, skillId: UUID, state: MasteryLevel): Promise<void>;
  incrementEvidenceCount(studentId: UUID, skillId: UUID): Promise<void>;
  setNextReview(studentId: UUID, skillId: UUID, date: ISO8601): Promise<void>;
  findStaleSkills(studentId: UUID, thresholdDays: number): Promise<StudentSkillState[]>;
  findByMasteryState(studentId: UUID, state: MasteryLevel): Promise<StudentSkillState[]>;
}

export interface EvidenceRepository {
  findByStudent(studentId: UUID, limit?: number): Promise<Evidence[]>;
  findByStudentAndSkill(studentId: UUID, skillId: UUID): Promise<Evidence[]>;
  findByAttempt(attemptId: UUID): Promise<Evidence[]>;
  findByChallenge(challengeId: UUID): Promise<Evidence[]>;
  findRecentByStudent(studentId: UUID, limit: number): Promise<Evidence[]>;
  create(evidence: Evidence): Promise<Evidence>;
  createBatch(evidence: Evidence[]): Promise<Evidence[]>;
  countByStudentAndSkill(studentId: UUID, skillId: UUID): Promise<number>;
  findByContextType(studentId: UUID, skillId: UUID, contextType: string): Promise<Evidence[]>;
}

export interface MisconceptionRepository {
  findByStudentAndSkill(studentId: UUID, skillId: UUID): Promise<Misconception[]>;
  findActiveByStudent(studentId: UUID): Promise<Misconception[]>;
  upsert(misconception: Misconception): Promise<Misconception>;
  resolve(studentId: UUID, skillId: UUID, category: string): Promise<void>;
}

// ============================================================================
// RECOMMENDATION & ROADMAP REPOSITORIES (Parts 5, 6)
// ============================================================================

export interface RecommendationRepository {
  findPendingByStudent(studentId: UUID): Promise<Recommendation[]>;
  findByStudentAndChallenge(studentId: UUID, challengeId: UUID): Promise<Recommendation | null>;
  findById(id: UUID): Promise<Recommendation | null>;
  create(rec: Recommendation): Promise<Recommendation>;
  update(rec: Recommendation): Promise<Recommendation>;
  accept(id: UUID): Promise<void>;
  complete(id: UUID): Promise<void>;
  dismiss(id: UUID): Promise<void>;
  expireOld(olderThan: ISO8601): Promise<number>;
}

export interface MilestoneRepository extends Repository<Milestone> {
  findByStudent(studentId: UUID): Promise<Milestone[]>;
  findByStudentAndStatus(studentId: UUID, status: string): Promise<Milestone[]>;
  updateProgress(id: UUID, progress: number): Promise<void>;
  updateStatus(id: UUID, status: string): Promise<void>;
}

export interface DailyPlanRepository {
  findByStudentAndDate(studentId: UUID, date: string): Promise<DailyPlan | null>;
  findByStudentAndRange(studentId: UUID, start: string, end: string): Promise<DailyPlan[]>;
  upsert(plan: DailyPlan): Promise<DailyPlan>;
  delete(studentId: UUID, date: string): Promise<void>;
}

export interface WeeklyPlanRepository {
  findByStudentAndWeek(studentId: UUID, weekStart: string): Promise<WeeklyPlan | null>;
  findByStudentAndRange(studentId: UUID, start: string, end: string): Promise<WeeklyPlan[]>;
  upsert(plan: WeeklyPlan): Promise<WeeklyPlan>;
}

// ============================================================================
// DIAGNOSTIC REPOSITORIES (Part 2)
// ============================================================================

export interface DiagnosticSessionRepository {
  findById(id: UUID): Promise<DiagnosticSession | null>;
  findByStudent(studentId: UUID): Promise<DiagnosticSession[]>;
  findActiveByStudent(studentId: UUID): Promise<DiagnosticSession | null>;
  create(session: DiagnosticSession): Promise<DiagnosticSession>;
  update(session: DiagnosticSession): Promise<DiagnosticSession>;
}

export interface DiagnosticAttemptRepository {
  findBySession(sessionId: UUID): Promise<DiagnosticAttempt[]>;
  create(attempt: DiagnosticAttempt): Promise<DiagnosticAttempt>;
}

// ============================================================================
// INTERVIEW REPOSITORIES (Part 8)
// ============================================================================

export interface InterviewBlueprintRepository extends Repository<InterviewBlueprint> {
  findByType(type: string): Promise<InterviewBlueprint[]>;
}

export interface InterviewRepository extends Repository<Interview> {
  findByStudent(studentId: UUID): Promise<Interview[]>;
  findActiveByStudent(studentId: UUID): Promise<Interview | null>;
  findByBlueprint(blueprintId: UUID): Promise<Interview[]>;
}

export interface InterviewSessionRepository {
  findByInterview(interviewId: UUID): Promise<InterviewSession[]>;
  findActiveByInterview(interviewId: UUID): Promise<InterviewSession | null>;
  create(session: InterviewSession): Promise<InterviewSession>;
  update(session: InterviewSession): Promise<InterviewSession>;
  disconnect(interviewId: UUID): Promise<void>;
}

export interface InterviewProblemRepository {
  findByInterview(interviewId: UUID): Promise<InterviewProblem[]>;
  findCurrent(interviewId: UUID): Promise<InterviewProblem | null>;
  updateState(id: UUID, state: string): Promise<void>;
  incrementHints(id: UUID): Promise<void>;
  setHintLevel(id: UUID, level: string): Promise<void>;
  markSolutionViewed(id: UUID): Promise<void>;
}

export interface InterviewEventRepository {
  findByInterview(interviewId: UUID): Promise<InterviewEvent[]>;
  findByProblem(problemId: UUID): Promise<InterviewEvent[]>;
  create(event: InterviewEvent): Promise<InterviewEvent>;
}

export interface InterviewEvaluationRepository {
  findByInterview(interviewId: UUID): Promise<InterviewEvaluation[]>;
  findByProblem(problemId: UUID): Promise<InterviewEvaluation | null>;
  create(evaluation: InterviewEvaluation): Promise<InterviewEvaluation>;
}

// ============================================================================
// INCIDENT REPOSITORIES (Part 11)
// ============================================================================

export interface IncidentBlueprintRepository extends Repository<IncidentBlueprint> {
  findBySeverity(severity: string): Promise<IncidentBlueprint[]>;
}

export interface IncidentRepository extends Repository<Incident> {
  findByStudent(studentId: UUID): Promise<Incident[]>;
  findActiveByStudent(studentId: UUID): Promise<Incident | null>;
  findByBlueprint(blueprintId: UUID): Promise<Incident[]>;
  findByStatus(status: string): Promise<Incident[]>;
}

export interface IncidentHypothesisRepository {
  findByIncident(incidentId: UUID): Promise<IncidentHypothesis[]>;
  findByStudent(studentId: UUID): Promise<IncidentHypothesis[]>;
  create(hypothesis: IncidentHypothesis): Promise<IncidentHypothesis>;
  update(hypothesis: IncidentHypothesis): Promise<IncidentHypothesis>;
  confirm(id: UUID): Promise<void>;
  reject(id: UUID): Promise<void>;
}

export interface IncidentActionRepository {
  findByIncident(incidentId: UUID): Promise<IncidentAction[]>;
  create(action: IncidentAction): Promise<IncidentAction>;
}

export interface IncidentLogRepository {
  findByIncident(incidentId: UUID, limit?: number): Promise<IncidentLogEntry[]>;
  create(log: IncidentLogEntry): Promise<IncidentLogEntry>;
  createBatch(logs: IncidentLogEntry[]): Promise<IncidentLogEntry[]>;
}

export interface IncidentMetricRepository {
  findByIncident(incidentId: UUID): Promise<IncidentMetric[]>;
  findByIncidentAndName(incidentId: UUID, name: string): Promise<IncidentMetric[]>;
  create(metric: IncidentMetric): Promise<IncidentMetric>;
  createBatch(metrics: IncidentMetric[]): Promise<IncidentMetric[]>;
}

export interface IncidentTraceRepository {
  findByIncident(incidentId: UUID): Promise<IncidentTrace[]>;
  create(trace: IncidentTrace): Promise<IncidentTrace>;
  createBatch(traces: IncidentTrace[]): Promise<IncidentTrace[]>;
}

export interface PostmortemRepository extends Repository<Postmortem> {
  findByIncident(incidentId: UUID): Promise<Postmortem | null>;
  findByStudent(studentId: UUID): Promise<Postmortem[]>;
}

// ============================================================================
// ENGINEERING SIMULATOR REPOSITORIES (Part 10)
// ============================================================================

export interface ProjectRepository extends Repository<Project> {
  findByType(type: ProjectType): Promise<Project[]>;
  findByDifficulty(difficulty: string): Promise<Project[]>;
  findBySkill(skillId: UUID): Promise<Project[]>;
}

export interface ProjectTestCaseRepository {
  findByProject(projectId: UUID): Promise<ProjectTestCase[]>;
  findPublicByProject(projectId: UUID): Promise<ProjectTestCase[]>;
}

export interface ProjectSubmissionRepository {
  findById(id: UUID): Promise<ProjectSubmission | null>;
  findByStudent(studentId: UUID): Promise<ProjectSubmission[]>;
  findByProject(projectId: UUID): Promise<ProjectSubmission[]>;
  create(submission: ProjectSubmission): Promise<ProjectSubmission>;
}

export interface ProjectEvaluationRepository {
  findBySubmission(submissionId: UUID): Promise<ProjectEvaluation | null>;
  findByStudent(studentId: UUID): Promise<ProjectEvaluation[]>;
  create(evaluation: ProjectEvaluation): Promise<ProjectEvaluation>;
}

export interface ProjectRevisionRepository {
  findBySubmission(submissionId: UUID): Promise<ProjectRevision[]>;
  create(revision: ProjectRevision): Promise<ProjectRevision>;
}

// ============================================================================
// SUBMISSION SYSTEM REPOSITORIES (Parts 12, 13)
// ============================================================================

export interface SubmissionRepository extends Repository<Submission> {
  findByStudent(studentId: UUID, limit?: number): Promise<Submission[]>;
  findByChallenge(challengeId: UUID): Promise<Submission[]>;
  findByState(state: SubmissionState): Promise<Submission[]>;
  findByIdempotencyKey(key: string): Promise<Submission | null>;
  updateState(id: UUID, state: SubmissionState): Promise<void>;
  assignWorker(id: UUID, workerId: string): Promise<void>;
  incrementAttempts(id: UUID): Promise<void>;
}

export interface SubmissionResultRepository {
  findBySubmission(submissionId: UUID): Promise<SubmissionResult | null>;
  create(result: SubmissionResult): Promise<SubmissionResult>;
  update(result: SubmissionResult): Promise<SubmissionResult>;
}

export interface NormalizedExecutionResultRepository {
  findBySubmission(submissionId: UUID): Promise<NormalizedExecutionResult | null>;
  create(result: NormalizedExecutionResult): Promise<NormalizedExecutionResult>;
}

// ============================================================================
// AI COACH REPOSITORIES (Part 14)
// ============================================================================

export interface CoachSessionRepository {
  findById(id: UUID): Promise<CoachSession | null>;
  findByStudent(studentId: UUID): Promise<CoachSession[]>;
  findActiveByStudentAndChallenge(studentId: UUID, challengeId: UUID): Promise<CoachSession | null>;
  create(session: CoachSession): Promise<CoachSession>;
  update(session: CoachSession): Promise<CoachSession>;
  complete(id: UUID): Promise<void>;
}

export interface CoachMessageRepository {
  findBySession(sessionId: UUID): Promise<CoachMessage[]>;
  create(message: CoachMessage): Promise<CoachMessage>;
}

export interface CoachObservationRepository {
  findBySession(sessionId: UUID): Promise<CoachObservation[]>;
  create(observation: CoachObservation): Promise<CoachObservation>;
}

// ============================================================================
// HINT LADDER REPOSITORIES (Part 15)
// ============================================================================

export interface HintLadderSessionRepository {
  findById(id: UUID): Promise<HintLadderSession | null>;
  findByStudentAndChallenge(studentId: UUID, challengeId: UUID): Promise<HintLadderSession | null>;
  findActiveByStudent(studentId: UUID): Promise<HintLadderSession | null>;
  create(session: HintLadderSession): Promise<HintLadderSession>;
  update(session: HintLadderSession): Promise<HintLadderSession>;
}

export interface HintRungRepository {
  findBySession(sessionId: UUID): Promise<HintRung[]>;
  create(rung: HintRung): Promise<HintRung>;
  update(rung: HintRung): Promise<HintRung>;
  markDelivered(id: UUID): Promise<void>;
  setEffectiveness(id: UUID, effectiveness: string): Promise<void>;
  setStudentResponse(id: UUID, response: string): Promise<void>;
}

// ============================================================================
// AUDIT REPOSITORY
// ============================================================================

export interface AuditRepository {
  create(event: AuditEvent): Promise<AuditEvent>;
  findByStudent(studentId: UUID, limit?: number): Promise<AuditEvent[]>;
  findByType(eventType: string, limit?: number): Promise<AuditEvent[]>;
  findByAttempt(attemptId: UUID): Promise<AuditEvent[]>;
}

// ============================================================================
// REPOSITORY REGISTRY
// ============================================================================

export interface RepositoryRegistry {
  // Part 1
  careerDomain: CareerDomainRepository;
  roleFamily: RoleFamilyRepository;
  role: RoleRepository;
  roleVersion: RoleVersionRepository;
  competency: CompetencyRepository;
  skill: SkillRepository;
  technology: TechnologyRepository;
  institution: InstitutionRepository;
  student: StudentRepository;
  studentCareerContext: StudentCareerContextRepository;
  studentRoleHistory: StudentRoleHistoryRepository;
  roleVariant: RoleVariantRepository;

  // Part 3, 5
  challenge: ChallengeRepository;
  testCase: TestCaseRepository;

  // Part 5, 9
  studentSkillState: StudentSkillStateRepository;
  evidence: EvidenceRepository;
  misconception: MisconceptionRepository;

  // Part 5, 6
  recommendation: RecommendationRepository;
  milestone: MilestoneRepository;
  dailyPlan: DailyPlanRepository;
  weeklyPlan: WeeklyPlanRepository;

  // Part 2
  diagnosticSession: DiagnosticSessionRepository;
  diagnosticAttempt: DiagnosticAttemptRepository;

  // Part 8
  interviewBlueprint: InterviewBlueprintRepository;
  interview: InterviewRepository;
  interviewSession: InterviewSessionRepository;
  interviewProblem: InterviewProblemRepository;
  interviewEvent: InterviewEventRepository;
  interviewEvaluation: InterviewEvaluationRepository;

  // Part 11
  incidentBlueprint: IncidentBlueprintRepository;
  incident: IncidentRepository;
  incidentHypothesis: IncidentHypothesisRepository;
  incidentAction: IncidentActionRepository;
  incidentLog: IncidentLogRepository;
  incidentMetric: IncidentMetricRepository;
  incidentTrace: IncidentTraceRepository;
  postmortem: PostmortemRepository;

  // Part 10
  project: ProjectRepository;
  projectTestCase: ProjectTestCaseRepository;
  projectSubmission: ProjectSubmissionRepository;
  projectEvaluation: ProjectEvaluationRepository;
  projectRevision: ProjectRevisionRepository;

  // Part 12, 13
  submission: SubmissionRepository;
  submissionResult: SubmissionResultRepository;
  normalizedExecutionResult: NormalizedExecutionResultRepository;

  // Part 14
  coachSession: CoachSessionRepository;
  coachMessage: CoachMessageRepository;
  coachObservation: CoachObservationRepository;

  // Part 15
  hintLadderSession: HintLadderSessionRepository;
  hintRung: HintRungRepository;

  // Audit
  audit: AuditRepository;
}

// ============================================================================
// FACTORY FUNCTION TYPE
// ============================================================================

export type RepositoryFactory = (db: any) => RepositoryRegistry;

type AnyEntity = { id: UUID; [key: string]: any };

function createEntityRepository<T extends AnyEntity>(): Repository<T> & { items: Map<UUID, T> } {
  const items = new Map<UUID, T>();
  return {
    items,
    async findById(id: UUID): Promise<T | null> {
      return items.get(id) ?? null;
    },
    async findAll(options?: { limit?: number; offset?: number }): Promise<T[]> {
      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? items.size;
      return Array.from(items.values()).slice(offset, offset + limit);
    },
    async create(entity: T): Promise<T> {
      items.set(entity.id, entity);
      return entity;
    },
    async update(entity: T): Promise<T> {
      items.set(entity.id, entity);
      return entity;
    },
    async delete(id: UUID): Promise<void> {
      items.delete(id);
    },
  };
}

function withCrud<T extends AnyEntity, E extends Record<string, any>>(extra: (repo: ReturnType<typeof createEntityRepository<T>>) => E): Repository<T> & E {
  const repo = createEntityRepository<T>();
  return Object.assign(repo, extra(repo));
}

function noRecord<T>(): Promise<T | null> {
  return Promise.resolve(null);
}

function noRecords<T>(): Promise<T[]> {
  return Promise.resolve([]);
}

export function createRepositoryRegistry(db: any): RepositoryRegistry {
  console.warn('Using in-memory repository registry. Configure concrete database repositories for persistent production data.');

  const testCase = withCrud<TestCase, Omit<TestCaseRepository, keyof Repository<TestCase>>>((repo) => ({
    async findByChallenge(challengeId) {
      return Array.from(repo.items.values()).filter(t => (t as any).challengeId === challengeId);
    },
    async findPublicByChallenge(challengeId) {
      return (await this.findByChallenge(challengeId)).filter(t => !t.hidden);
    },
    async findHiddenByChallenge(challengeId) {
      return (await this.findByChallenge(challengeId)).filter(t => t.hidden);
    },
  }));

  const submissionResults = new Map<UUID, SubmissionResult>();
  const normalizedResults = new Map<UUID, NormalizedExecutionResult>();
  const studentSkillStates = new Map<string, StudentSkillState>();
  const careerContexts = new Map<UUID, StudentCareerContext>();
  const dailyPlans = new Map<string, DailyPlan>();
  const weeklyPlans = new Map<string, WeeklyPlan>();

  return {
    careerDomain: withCrud<CareerDomain, Omit<CareerDomainRepository, keyof Repository<CareerDomain>>>((repo) => ({
      async findBySlug(slug) { return Array.from(repo.items.values()).find(x => x.slug === slug) ?? null; },
      async findActive() { return Array.from(repo.items.values()).filter(x => x.status === 'ACTIVE'); },
    })),
    roleFamily: withCrud<RoleFamily, Omit<RoleFamilyRepository, keyof Repository<RoleFamily>>>((repo) => ({
      async findBySlug(slug) { return Array.from(repo.items.values()).find(x => x.slug === slug) ?? null; },
      async findByCareerDomain(careerDomainId) { return Array.from(repo.items.values()).filter(x => x.careerDomainId === careerDomainId); },
      async findActive() { return Array.from(repo.items.values()).filter(x => x.status === 'ACTIVE'); },
    })),
    role: withCrud<Role, Omit<RoleRepository, keyof Repository<Role>>>((repo) => ({
      async findBySlug(slug) { return Array.from(repo.items.values()).find(x => x.slug === slug) ?? null; },
      async findByFamily(roleFamilyId) { return Array.from(repo.items.values()).filter(x => x.roleFamilyId === roleFamilyId); },
      async findActive() { return Array.from(repo.items.values()).filter(x => x.status === 'ACTIVE'); },
      async findWithDetails() { return null; },
    })),
    roleVersion: withCrud<RoleVersion, Omit<RoleVersionRepository, keyof Repository<RoleVersion>>>((repo) => ({
      async findByRole(roleId) { return Array.from(repo.items.values()).filter(x => x.roleId === roleId); },
      async findCurrent(roleId) {
        return Array.from(repo.items.values())
          .filter(x => x.roleId === roleId)
          .sort((a, b) => b.version - a.version)[0] ?? null;
      },
    })),
    competency: withCrud<Competency, Omit<CompetencyRepository, keyof Repository<Competency>>>((repo) => ({
      async findBySlug(slug) { return Array.from(repo.items.values()).find(x => x.slug === slug) ?? null; },
      async findByParent(parentId) { return Array.from(repo.items.values()).filter(x => x.parentCompetencyId === parentId); },
      async findRoots() { return Array.from(repo.items.values()).filter(x => x.parentCompetencyId === null); },
    })),
    skill: withCrud<Skill, Omit<SkillRepository, keyof Repository<Skill>>>((repo) => ({
      async findBySlug(slug) { return Array.from(repo.items.values()).find(x => x.slug === slug) ?? null; },
      async findByCompetency(competencyId) { return Array.from(repo.items.values()).filter(x => x.competencyId === competencyId); },
      async findByParent() { return []; },
      async findRoots() { return []; },
      async findPrerequisites() { return []; },
      async findDependents() { return []; },
    })),
    technology: withCrud<Technology, Omit<TechnologyRepository, keyof Repository<Technology>>>((repo) => ({
      async findBySlug(slug) { return Array.from(repo.items.values()).find(x => x.slug === slug) ?? null; },
      async findByType(type) { return Array.from(repo.items.values()).filter(x => x.type === type); },
    })),
    institution: withCrud<Institution, Omit<InstitutionRepository, keyof Repository<Institution>>>((repo) => ({
      async findByDomain(domain) { return Array.from(repo.items.values()).find(x => x.domain === domain) ?? null; },
    })),
    student: withCrud<Student, Omit<StudentRepository, keyof Repository<Student>>>((repo) => ({
      async findByInstitution(institutionId) { return Array.from(repo.items.values()).filter(x => x.institutionId === institutionId); },
      async findByEmail() { return null; },
      async findByAuthSubject(authSubject) { return repo.items.get(authSubject) ?? null; },
    })),
    studentCareerContext: {
      async findByStudent(studentId) { return careerContexts.get(studentId) ?? null; },
      async upsert(context) { careerContexts.set(context.studentId, context); return context; },
      async delete(studentId) { careerContexts.delete(studentId); },
    },
    studentRoleHistory: {
      async findByStudent() { return []; },
      async create(entry) { return entry; },
      async endRole() {},
    },
    roleVariant: {
      async findByInstitutionAndRole() { return null; },
      async findByInstitution() { return []; },
      async upsert(variant) { return variant; },
    },
    challenge: withCrud<Challenge, Omit<ChallengeRepository, keyof Repository<Challenge>>>((repo) => ({
      async findBySkill(skillId) { return Array.from(repo.items.values()).filter(c => c.primarySkillId === skillId || c.secondarySkillIds.includes(skillId)); },
      async findByDifficulty(level) { return Array.from(repo.items.values()).filter(c => c.difficultyLevel === level); },
      async findActive() { return Array.from(repo.items.values()).filter(c => c.status === 'ACTIVE'); },
      async findByStatus(status) { return Array.from(repo.items.values()).filter(c => c.status === status); },
      async getTestCases(challengeId) { return testCase.findByChallenge(challengeId); },
      async findByPrimarySkill(skillId) { return Array.from(repo.items.values()).filter(c => c.primarySkillId === skillId); },
      async findByContextType(contextType) { return Array.from(repo.items.values()).filter(c => c.contextType === contextType); },
      async findVerification() { return Array.from(repo.items.values()).filter(c => c.isVerification); },
      async findByQualityStatus(status) { return Array.from(repo.items.values()).filter(c => c.qualityStatus === status); },
    })),
    testCase,
    studentSkillState: {
      async findByStudent(studentId) { return Array.from(studentSkillStates.values()).filter(s => s.studentId === studentId); },
      async findByStudentAndSkill(studentId, skillId) { return studentSkillStates.get(`${studentId}:${skillId}`) ?? null; },
      async upsert(state) { studentSkillStates.set(`${state.studentId}:${state.skillId}`, state); return state; },
      async updateMasteryState(studentId, skillId, masteryState) {
        const existing = studentSkillStates.get(`${studentId}:${skillId}`);
        if (existing) existing.masteryState = masteryState;
      },
      async incrementEvidenceCount(studentId, skillId) {
        const existing = studentSkillStates.get(`${studentId}:${skillId}`);
        if (existing) existing.evidenceCount++;
      },
      async setNextReview(studentId, skillId, date) {
        const existing = studentSkillStates.get(`${studentId}:${skillId}`);
        if (existing) existing.nextReviewAt = date;
      },
      async findStaleSkills(studentId) { return Array.from(studentSkillStates.values()).filter(s => s.studentId === studentId && s.masteryState === 'STALE'); },
      async findByMasteryState(studentId, state) { return Array.from(studentSkillStates.values()).filter(s => s.studentId === studentId && s.masteryState === state); },
    },
    evidence: Object.assign(withCrud<Evidence, Record<string, never>>(() => ({})), {
      async findByStudent(this: any, studentId: UUID, limit?: number) {
        const rows = Array.from((this.items as Map<UUID, Evidence>).values()).filter(e => e.studentId === studentId);
        return typeof limit === 'number' ? rows.slice(0, limit) : rows;
      },
      async findByStudentAndSkill(this: any, studentId: UUID, skillId: UUID) { return Array.from((this.items as Map<UUID, Evidence>).values()).filter(e => e.studentId === studentId && e.skillId === skillId); },
      async findByAttempt(this: any, attemptId: UUID) { return Array.from((this.items as Map<UUID, Evidence>).values()).filter(e => e.attemptId === attemptId); },
      async findByChallenge(this: any, challengeId: UUID) { return Array.from((this.items as Map<UUID, Evidence>).values()).filter(e => e.challengeId === challengeId); },
      async findRecentByStudent(this: any, studentId: UUID, limit: number) { return (await this.findByStudent(studentId)).slice(0, limit); },
      async createBatch(this: any, evidence: Evidence[]) { for (const item of evidence) this.items.set(item.id, item); return evidence; },
      async countByStudentAndSkill(this: any, studentId: UUID, skillId: UUID) { return (await this.findByStudentAndSkill(studentId, skillId)).length; },
      async findByContextType(this: any, studentId: UUID, skillId: UUID, contextType: string) { return (await this.findByStudentAndSkill(studentId, skillId)).filter((e: Evidence) => e.contextType === contextType); },
    }) as EvidenceRepository,
    misconception: {
      findByStudentAndSkill: noRecords,
      findActiveByStudent: noRecords,
      async upsert(misconception) { return misconception; },
      async resolve() {},
    },
    recommendation: Object.assign(withCrud<Recommendation, Record<string, never>>(() => ({})), {
      async findPendingByStudent(this: any, studentId: UUID) { return Array.from((this.items as Map<UUID, Recommendation>).values()).filter(r => r.studentId === studentId && r.status === 'PENDING'); },
      async findByStudentAndChallenge(this: any, studentId: UUID, challengeId: UUID) { return Array.from((this.items as Map<UUID, Recommendation>).values()).find(r => r.studentId === studentId && r.challengeId === challengeId) ?? null; },
      async accept(this: any, id: UUID) { const item = this.items.get(id); if (item) item.status = 'ACCEPTED'; },
      async complete(this: any, id: UUID) { const item = this.items.get(id); if (item) item.status = 'COMPLETED'; },
      async dismiss(this: any, id: UUID) { const item = this.items.get(id); if (item) item.status = 'DISMISSED'; },
      async expireOld() { return 0; },
    }) as RecommendationRepository,
    milestone: Object.assign(withCrud<Milestone, Omit<MilestoneRepository, keyof Repository<Milestone>>>(() => ({
      async findByStudent() { return []; },
      async findByStudentAndStatus() { return []; },
      async updateProgress() {},
      async updateStatus() {},
    }))),
    dailyPlan: {
      async findByStudentAndDate(studentId, date) { return dailyPlans.get(`${studentId}:${date}`) ?? null; },
      async findByStudentAndRange(studentId) { return Array.from(dailyPlans.values()).filter(p => p.studentId === studentId); },
      async upsert(plan) { dailyPlans.set(`${plan.studentId}:${plan.date}`, plan); return plan; },
      async delete(studentId, date) { dailyPlans.delete(`${studentId}:${date}`); },
    },
    weeklyPlan: {
      async findByStudentAndWeek(studentId, weekStart) { return weeklyPlans.get(`${studentId}:${weekStart}`) ?? null; },
      async findByStudentAndRange(studentId) { return Array.from(weeklyPlans.values()).filter(p => p.studentId === studentId); },
      async upsert(plan) { weeklyPlans.set(`${plan.studentId}:${plan.weekStart}`, plan); return plan; },
    },
    diagnosticSession: Object.assign(withCrud<DiagnosticSession, Omit<DiagnosticSessionRepository, keyof Repository<DiagnosticSession>>>(() => ({
      async findByStudent() { return []; },
      async findActiveByStudent() { return null; },
    }))),
    diagnosticAttempt: { findBySession: noRecords, async create(attempt) { return attempt; } },
    interviewBlueprint: withCrud<InterviewBlueprint, Omit<InterviewBlueprintRepository, keyof Repository<InterviewBlueprint>>>(() => ({ async findByType() { return []; } })),
    interview: withCrud<Interview, Omit<InterviewRepository, keyof Repository<Interview>>>(() => ({ async findByStudent() { return []; }, async findActiveByStudent() { return null; }, async findByBlueprint() { return []; } })),
    interviewSession: { findByInterview: noRecords, findActiveByInterview: noRecord, async create(session) { return session; }, async update(session) { return session; }, async disconnect() {} },
    interviewProblem: { findByInterview: noRecords, findCurrent: noRecord, async updateState() {}, async incrementHints() {}, async setHintLevel() {}, async markSolutionViewed() {} },
    interviewEvent: { findByInterview: noRecords, findByProblem: noRecords, async create(event) { return event; } },
    interviewEvaluation: { findByInterview: noRecords, findByProblem: noRecord, async create(evaluation) { return evaluation; } },
    incidentBlueprint: withCrud<IncidentBlueprint, Omit<IncidentBlueprintRepository, keyof Repository<IncidentBlueprint>>>(() => ({ async findBySeverity() { return []; } })),
    incident: withCrud<Incident, Omit<IncidentRepository, keyof Repository<Incident>>>(() => ({ async findByStudent() { return []; }, async findActiveByStudent() { return null; }, async findByBlueprint() { return []; }, async findByStatus() { return []; } })),
    incidentHypothesis: { findByIncident: noRecords, findByStudent: noRecords, async create(hypothesis) { return hypothesis; }, async update(hypothesis) { return hypothesis; }, async confirm() {}, async reject() {} },
    incidentAction: { findByIncident: noRecords, async create(action) { return action; } },
    incidentLog: { findByIncident: noRecords, async create(log) { return log; }, async createBatch(logs) { return logs; } },
    incidentMetric: { findByIncident: noRecords, findByIncidentAndName: noRecords, async create(metric) { return metric; }, async createBatch(metrics) { return metrics; } },
    incidentTrace: { findByIncident: noRecords, async create(trace) { return trace; }, async createBatch(traces) { return traces; } },
    postmortem: withCrud<Postmortem, Omit<PostmortemRepository, keyof Repository<Postmortem>>>(() => ({ async findByIncident() { return null; }, async findByStudent() { return []; } })),
    project: withCrud<Project, Omit<ProjectRepository, keyof Repository<Project>>>(() => ({ async findByType() { return []; }, async findByDifficulty() { return []; }, async findBySkill() { return []; } })),
    projectTestCase: { findByProject: noRecords, findPublicByProject: noRecords },
    projectSubmission: withCrud<ProjectSubmission, Omit<ProjectSubmissionRepository, keyof Repository<ProjectSubmission>>>(() => ({ async findByStudent() { return []; }, async findByProject() { return []; } })),
    projectEvaluation: { findBySubmission: noRecord, findByStudent: noRecords, async create(evaluation) { return evaluation; } },
    projectRevision: { findBySubmission: noRecords, async create(revision) { return revision; } },
    submission: withCrud<Submission, Omit<SubmissionRepository, keyof Repository<Submission>>>(() => ({
      async findByStudent() { return []; },
      async findByChallenge() { return []; },
      async findByState() { return []; },
      async findByIdempotencyKey() { return null; },
      async updateState() {},
      async assignWorker() {},
      async incrementAttempts() {},
    })),
    submissionResult: {
      async findBySubmission(submissionId) { return submissionResults.get(submissionId) ?? null; },
      async create(result) { submissionResults.set(result.submissionId, result); return result; },
      async update(result) { submissionResults.set(result.submissionId, result); return result; },
    },
    normalizedExecutionResult: {
      async findBySubmission(submissionId) { return normalizedResults.get(submissionId) ?? null; },
      async create(result) { normalizedResults.set(result.submissionId, result); return result; },
    },
    coachSession: withCrud<CoachSession, Omit<CoachSessionRepository, keyof Repository<CoachSession>>>(() => ({
      async findByStudent() { return []; },
      async findActiveByStudentAndChallenge() { return null; },
      async complete() {},
    })),
    coachMessage: { findBySession: noRecords, async create(message) { return message; } },
    coachObservation: { findBySession: noRecords, async create(observation) { return observation; } },
    hintLadderSession: withCrud<HintLadderSession, Omit<HintLadderSessionRepository, keyof Repository<HintLadderSession>>>(() => ({
      async findByStudentAndChallenge() { return null; },
      async findActiveByStudent() { return null; },
    })),
    hintRung: {
      findBySession: noRecords,
      async create(rung) { return rung; },
      async update(rung) { return rung; },
      async markDelivered() {},
      async setEffectiveness() {},
      async setStudentResponse() {},
    },
    audit: { async create(event) { return event; }, findByStudent: noRecords, findByType: noRecords, findByAttempt: noRecords },
  };
}

export default createRepositoryRegistry;
