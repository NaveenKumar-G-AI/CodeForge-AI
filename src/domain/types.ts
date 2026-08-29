/**
 * CodeForge AI — Unified Domain Types
 *
 * Single source of truth for all domain types across the platform.
 * Consolidates types from Parts 1-40.
 */

// ============================================================================
// COMMON ENUMS & PRIMITIVES
// ============================================================================

export type UUID = string & { readonly __brand: unique symbol };
export type ISO8601 = string & { readonly __brand: unique symbol };

export function uuid(v: string): UUID { return v as UUID; }
export function iso8601(v: string): ISO8601 { return v as ISO8601; }

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

// ---------------------------------------------------------------------------
// Content Status (Part 1)
// ---------------------------------------------------------------------------
export type ContentStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

// ---------------------------------------------------------------------------
// Proficiency & Importance (Part 1)
// ---------------------------------------------------------------------------
export type Proficiency = 'FOUNDATION' | 'DEVELOPING' | 'COMPETENT' | 'STRONG' | 'ADVANCED';
export type Importance = 'CORE' | 'IMPORTANT' | 'SUPPORTING' | 'OPTIONAL';

// ---------------------------------------------------------------------------
// Technology Types (Part 1)
// ---------------------------------------------------------------------------
export type TechnologyType = 'LANGUAGE' | 'FRAMEWORK' | 'LIBRARY' | 'DATABASE' | 'TOOL' | 'PLATFORM';
export type TechnologyUsage = 'COMMON' | 'IMPORTANT' | 'OPTIONAL' | 'SUPPORTING';

// ---------------------------------------------------------------------------
// Context Sources (Part 1)
// ---------------------------------------------------------------------------
export type ContextSource = 'SELF_SELECTED' | 'INSTITUTION_ASSIGNED' | 'AI_RECOMMENDED' | 'IMPORTED';

// ---------------------------------------------------------------------------
// Role Slots (Part 1)
// ---------------------------------------------------------------------------
export type RoleSlot = 'PRIMARY' | 'SECONDARY';

// ---------------------------------------------------------------------------
// Mastery Levels (Part 5, 6, 9)
// ---------------------------------------------------------------------------
export type MasteryLevel = 'NOVICE' | 'DEVELOPING' | 'COMPETENT' | 'STRONG' | 'MASTERED';
export type SkillLevel = 'WEAK' | 'DEVELOPING' | 'PROFICIENT' | 'STRONG'; // Part 3, 4

export const MASTERY_LEVELS: MasteryLevel[] = ['NOVICE', 'DEVELOPING', 'COMPETENT', 'STRONG', 'MASTERED'];
export const SKILL_LEVELS: SkillLevel[] = ['WEAK', 'DEVELOPING', 'PROFICIENT', 'STRONG'];
export const PROFICIENCY_ORDER: Proficiency[] = ['FOUNDATION', 'DEVELOPING', 'COMPETENT', 'STRONG', 'ADVANCED'];

export function masteryRank(level: MasteryLevel | null): number | null {
  if (level === null) return null;
  const idx = MASTERY_LEVELS.indexOf(level);
  return idx === -1 ? null : idx;
}

export function skillLevelRank(level: SkillLevel | null): number | null {
  if (level === null) return null;
  const idx = SKILL_LEVELS.indexOf(level);
  return idx === -1 ? null : idx;
}

export function proficiencyRank(level: Proficiency | null): number | null {
  if (level === null) return null;
  const idx = PROFICIENCY_ORDER.indexOf(level);
  return idx === -1 ? null : idx;
}

// ---------------------------------------------------------------------------
// Difficulty (Part 3, 5, 10)
// ---------------------------------------------------------------------------
export type DifficultyLabel = 'FOUNDATION' | 'EASY' | 'MEDIUM' | 'INTERMEDIATE' | 'ADVANCED' | 'HARD' | 'EXPERT';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'ADVANCED';

export const DIFFICULTY_LABEL_ORDER: DifficultyLabel[] = ['FOUNDATION', 'EASY', 'MEDIUM', 'INTERMEDIATE', 'ADVANCED', 'HARD', 'EXPERT'];
export const DIFFICULTY_LEVEL_ORDER: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD', 'ADVANCED'];

// ---------------------------------------------------------------------------
// Task/Challenge Types (Part 2, 3, 10)
// ---------------------------------------------------------------------------
export type TaskType =
  | 'IMPLEMENTATION'
  | 'DEBUGGING'
  | 'CODE_COMPLETION'
  | 'REFACTORING'
  | 'OPTIMIZATION'
  | 'CODE_READING'
  | 'OUTPUT_PREDICTION'
  | 'TEST_CREATION'
  | 'ALGORITHM_SELECTION'
  | 'REAL_WORLD_ENGINEERING'
  | 'CODING'
  | 'CONCEPTUAL'
  | 'COMPLEXITY_REASONING'
  | 'TECHNICAL_REASONING'
  | 'EXPLANATION';

export type ProgressionStage =
  | 'FOUNDATION'
  | 'BASIC_APPLICATION'
  | 'INTERMEDIATE_APPLICATION'
  | 'COMPLEX_COMBINATION'
  | 'REAL_WORLD_APPLICATION';

// ---------------------------------------------------------------------------
// Execution & Evaluation (Part 3, 4, 12, 13)
// ---------------------------------------------------------------------------
export type ExecutionStatus =
  | 'STARTED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'RUNNING'
  | 'PASSED'
  | 'FAILED'
  | 'SYSTEM_ERROR'
  | 'ABANDONED'
  | 'COMPLETED'
  | 'TIMEOUT'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'MEMORY_LIMIT_EXCEEDED';

export type Verdict =
  | 'PASS'
  | 'FAIL'
  | 'PARTIAL'
  | 'SYSTEM_ERROR'
  | 'TIMEOUT'
  | 'MEMORY_LIMIT'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR';

export type EvidenceType =
  | 'CORRECT'
  | 'INCORRECT'
  | 'PARTIAL'
  | 'EXECUTION'
  | 'REASONING'
  | 'DEBUGGING'
  | 'CODE_READING'
  | 'HINT_DEPENDENCY'
  | 'TIMING'
  | 'challenge_passed'
  | 'challenge_partial_or_failed'
  | 'hint_used'
  | 'syntax_error'
  | 'timeout'
  | 'runtime_error'
  | 'misconception_detected'
  | 'transfer_gap'
  | 'prerequisite_gap'
  | 'independent_success'
  | 'assisted_success'
  | 'repeated_mistake'
  | 'project_rubric_category';

export type IndependenceSignal = 'INDEPENDENT' | 'ASSISTED';
export type AssistanceLevel = 'NONE' | 'HINT' | 'SOLUTION_VIEWED';

export type TestCategory =
  | 'NORMAL'
  | 'EDGE'
  | 'BOUNDARY'
  | 'STRESS'
  | 'INTERLEAVED'
  | 'CORRECTNESS'
  | 'PERFORMANCE'
  | 'STYLE'
  | 'SECURITY'
  | 'COMPLEXITY';

export type ComparisonMode = 'exact' | 'unordered' | 'float_tolerance' | 'contains';

// ---------------------------------------------------------------------------
// Gap & Gap Status (Part 5, 6, 9)
// ---------------------------------------------------------------------------
export type GapStatus =
  | 'UNKNOWN'
  | 'COMPLETE'
  | 'DEVELOPING'
  | 'GAP'
  | 'CRITICAL_GAP'
  | 'BLOCKED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'TRANSFER_GAP'
  | 'PREREQUISITE_GAP';

export type GapType =
  | 'SKILL_GAP'
  | 'GAP'
  | 'CRITICAL_GAP'
  | 'TRANSFER_GAP'
  | 'PREREQUISITE_GAP'
  | 'INSUFFICIENT_EVIDENCE'
  | 'NONE';

// ---------------------------------------------------------------------------
// Mistake Categories (Part 3, 4, 13)
// ---------------------------------------------------------------------------
export type MistakeCategory =
  | 'OFF_BY_ONE'
  | 'WRONG_LOOP_CONDITION'
  | 'WRONG_DATA_STRUCTURE'
  | 'WRONG_ALGORITHM'
  | 'LOGIC_ERROR'
  | 'BOUNDARY_ERROR'
  | 'EDGE_CASE_FAILURE'
  | 'INPUT_HANDLING'
  | 'STATE_MANAGEMENT'
  | 'TYPE_ERROR'
  | 'NULL_HANDLING'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR'
  | 'COMPLEXITY_FAILURE'
  | 'PERFORMANCE_FAILURE'
  | 'API_ERROR'
  | 'ASYNC_ERROR'
  | 'SYNTAX_ERROR'
  | 'UNKNOWN';

export type FailureCategory =
  | 'COMPILATION'
  | 'RUNTIME'
  | 'LOGIC'
  | 'BOUNDARY'
  | 'EDGE_CASE'
  | 'INPUT_HANDLING'
  | 'STATE'
  | 'ALGORITHM'
  | 'COMPLEXITY'
  | 'TIMEOUT'
  | 'MEMORY'
  | 'UNKNOWN';

// ---------------------------------------------------------------------------
// Trends & Readiness (Part 5, 6, 9)
// ---------------------------------------------------------------------------
export type Trend = 'IMPROVING' | 'STABLE' | 'DECLINING';

export type ReadinessState =
  | 'NOT_STARTED'
  | 'FOUNDATION_BUILDING'
  | 'DEVELOPING'
  | 'APPROACHING_READY'
  | 'READY'
  | 'STRONG';

// ---------------------------------------------------------------------------
// Goals & Priority (Part 6, 9)
// ---------------------------------------------------------------------------
export type Goal = 'GENERAL_CODING' | 'PLACEMENT_PREPARATION' | 'INTERVIEW_PREPARATION' | 'ROLE_PREPARATION' | 'DSA_MASTERY' | 'PLACEMENT_PREPARATION';

export type PriorityTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'VERY_HIGH';
export type Priority = PriorityTier;

// ---------------------------------------------------------------------------
// Interview (Part 8)
// ---------------------------------------------------------------------------
export type InterviewState =
  | 'CREATED'
  | 'READY'
  | 'STARTED'
  | 'PROBLEM_PRESENTED'
  | 'CLARIFICATION'
  | 'APPROACH_DISCUSSION'
  | 'CODING'
  | 'TESTING'
  | 'DEBUGGING'
  | 'FOLLOW_UP'
  | 'FINAL_EVALUATION'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED';

export type InterviewType =
  | 'GUIDED_TECHNICAL_INTERVIEW'
  | 'STRICT_TECHNICAL_INTERVIEW'
  | 'INTERVIEW_SIMULATION'
  | 'ROLE_BASED_INTERVIEW'
  | 'WEAKNESS_FOCUSED_INTERVIEW'
  | 'FINAL_READINESS_INTERVIEW'
  | 'CUSTOM';

export type HintLevel = 'NONE' | 'CLARIFICATION' | 'CONCEPTUAL_DIRECTION' | 'STRONG_DIRECTION' | 'NEAR_SOLUTION';

export const TERMINAL_INTERVIEW_STATES: ReadonlySet<InterviewState> = new Set([
  'COMPLETED', 'EXPIRED', 'CANCELLED', 'FAILED',
]);

// ---------------------------------------------------------------------------
// Incident (Part 11)
// ---------------------------------------------------------------------------
export type IncidentPhase =
  | 'DETECTION'
  | 'TRIAGE'
  | 'INVESTIGATION'
  | 'MITIGATION'
  | 'RESOLUTION'
  | 'POSTMORTEM';

export type IncidentSeverity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';

export type HypothesisStatus = 'PROPOSED' | 'TESTING' | 'CONFIRMED' | 'REJECTED';

export type AlertChannel = 'PAGERDUTY' | 'SLACK' | 'EMAIL' | 'WEBHOOK';

// ---------------------------------------------------------------------------
// Hint Ladder (Part 15)
// ---------------------------------------------------------------------------
export type HintLadderState = 'IDLE' | 'ANALYZING' | 'GENERATING' | 'DELIVERED' | 'ESCALATING' | 'COMPLETED' | 'FAILED';

export type HintType =
  | 'CONCEPTUAL'
  | 'STRATEGIC'
  | 'TACTICAL'
  | 'SYNTACTIC'
  | 'DEBUGGING'
  | 'NEAR_SOLUTION';

// ---------------------------------------------------------------------------
// Coaching (Part 14)
// ---------------------------------------------------------------------------
export type FeedbackLevel = 'QUICK' | 'STANDARD' | 'DETAILED' | 'DEEP';
export type CoachingStyle = 'SUPPORTIVE' | 'DIRECTIVE' | 'SOCRATIC' | 'MINIMAL';

// ---------------------------------------------------------------------------
// Engineering Simulator (Part 10)
// ---------------------------------------------------------------------------
export type ProjectType =
  | 'BACKEND_SERVICE'
  | 'FRONTEND_APP'
  | 'FULLSTACK_APP'
  | 'DATA_PIPELINE'
  | 'ML_MODEL'
  | 'INFRASTRUCTURE'
  | 'CLI_TOOL'
  | 'LIBRARY'
  | 'API_GATEWAY'
  | 'MICROSERVICE'
  | 'MOBILE_APP'
  | 'DESKTOP_APP'
  | 'GAME'
  | 'BLOCKCHAIN'
  | 'EMBEDDED'
  | 'CUSTOM';

export type RequirementPriority = 'MUST_HAVE' | 'SHOULD_HAVE' | 'NICE_TO_HAVE';
export type RubricCategory = 'correctness' | 'architecture' | 'code_quality' | 'testing' | 'documentation' | 'security' | 'performance';

// ---------------------------------------------------------------------------
// Submission System (Part 12, 13)
// ---------------------------------------------------------------------------
export type SubmissionState =
  | 'PENDING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'EVALUATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type ResultAggregation = 'ALL_OR_NOTHING' | 'PARTIAL_CREDIT' | 'WEIGHTED';

// ---------------------------------------------------------------------------
// Supported Languages
// ---------------------------------------------------------------------------
export type SupportedLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'cpp' | 'go' | 'rust';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['python', 'javascript', 'typescript', 'java', 'cpp', 'go', 'rust'];

// ============================================================================
// CORE DOMAIN ENTITIES
// ============================================================================

// ---------------------------------------------------------------------------
// Part 1: Career Domain, Role Family, Role, RoleVersion
// ---------------------------------------------------------------------------

export interface CareerDomain {
  id: UUID;
  slug: string;
  name: string;
  description: string;
  status: ContentStatus;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface RoleFamily {
  id: UUID;
  slug: string;
  name: string;
  description: string;
  careerDomainId: UUID;
  status: ContentStatus;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface Role {
  id: UUID;
  slug: string;
  name?: string;
  shortDescription?: string;
  roleFamilyId: UUID;
  status: ContentStatus;
  currentVersion: number;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface RoleVersion {
  id: UUID;
  roleId: UUID;
  version: number;
  name: string;
  shortDescription: string;
  longDescription: string;
  status: ContentStatus;
  createdAt: ISO8601;
}

export interface RoleDetail {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  status: ContentStatus;
  version: number;
  family: { slug: string; name: string };
  domain: { slug: string; name: string };
  competencies: RoleCompetencyLink[];
  skills: RoleSkillLink[];
  technologies: RoleTechnologyLink[];
}

export interface RoleSummary {
  slug: string;
  name: string;
  shortDescription: string;
  status: ContentStatus;
  family: { slug: string; name: string };
  domain: { slug: string; name: string };
  currentVersion: number;
}

// ---------------------------------------------------------------------------
// Part 1: Competency, Skill, Technology
// ---------------------------------------------------------------------------

export interface Competency {
  id: UUID;
  slug: string;
  name: string;
  description: string;
  parentCompetencyId: UUID | null;
  status: ContentStatus;
}

export interface RoleCompetencyLink {
  competency: Competency;
  importance: Importance;
  expectedProficiency: Proficiency;
  required: boolean;
}

export interface Skill {
  id: UUID;
  slug: string;
  name: string;
  description: string;
  competencyId: UUID;
  status: ContentStatus;
}

export interface RoleSkillLink {
  skill: Skill;
  importance: Importance;
  expectedProficiency: Proficiency;
}

export interface Technology {
  id: UUID;
  slug: string;
  name: string;
  description: string;
  type: TechnologyType;
  status: ContentStatus;
}

export interface RoleTechnologyLink {
  technology: Technology;
  usageType: TechnologyUsage;
}

// ---------------------------------------------------------------------------
// Part 1: Student Career Context
// ---------------------------------------------------------------------------

export interface Student {
  id: UUID;
  institutionId: UUID | null;
  displayName: string;
  createdAt: ISO8601;
}

export interface Institution {
  id: UUID;
  name: string;
  domain: string;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface StudentCareerContext {
  studentId: UUID;
  primaryRoleId: UUID;
  primaryRoleVersion: number;
  secondaryRoleId: UUID | null;
  secondaryRoleVersion: number | null;
  source: ContextSource;
  selectedAt: ISO8601;
  updatedAt: ISO8601;
}

export interface StudentRoleHistoryEntry {
  id: UUID;
  studentId: UUID;
  roleId: UUID;
  roleVersion: number;
  slot: RoleSlot;
  source: ContextSource;
  startedAt: ISO8601;
  endedAt: ISO8601 | null;
}

export interface RoleVariant {
  id: UUID;
  institutionId: UUID;
  roleId: UUID;
  name: string;
  description: string;
  overrides: Record<string, unknown>;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface CareerContextView {
  hasSelection: boolean;
  context: (StudentCareerContext & { primaryRoleSlug: string; secondaryRoleSlug: string | null }) | null;
}

// ---------------------------------------------------------------------------
// Part 5, 9: Student Profile & Skill State
// ---------------------------------------------------------------------------

export interface StudentSkillState {
  studentId: UUID;
  skillId: UUID;
  masteryScore: number;        // 0-100
  confidenceScore: number;     // 0-1
  masteryState: MasteryState;
  trend: Trend;
  evidenceCount: number;
  independentSuccessCount: number;
  distinctChallengesCount: number;
  contradictionFlag: boolean;
  masteryVerified: boolean;
  lastAssessedAt: ISO8601 | null;
  nextReviewAt: ISO8601 | null;
}

export interface StudentProfile {
  studentId: UUID;
  skills: Record<string, StudentSkillState>;
  roleId: UUID | null;
  goal: Goal | null;
  targetDate: ISO8601 | null;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface Misconception {
  id: UUID;
  studentId: UUID;
  skillId: UUID;
  category: string;
  description: string;
  active: boolean;
  evidenceCount: number;
  createdAt: ISO8601;
  resolvedAt: ISO8601 | null;
}

export type MasteryState =
  | 'NO_EVIDENCE'
  | 'NOVICE'
  | 'DEVELOPING'
  | 'COMPETENT'
  | 'STRONG'
  | 'MASTERED'
  | 'STALE';

// ---------------------------------------------------------------------------
// Part 5, 9: Evidence
// ---------------------------------------------------------------------------

export interface Evidence {
  id: UUID;
  studentId: UUID;
  skillId: UUID;
  attemptId: UUID;
  challengeId: UUID;
  isPrimary: boolean;
  rawScore: number;           // 0-1
  difficultyScore: number;    // 1-10 normalized
  independent: boolean;
  assistanceUsed: AssistanceLevel;
  mistakeCategory: MistakeCategory | null;
  languageIssue: boolean;
  contextType: 'STANDARD' | 'NOVEL' | 'VERIFICATION' | 'EXPLORATION' | 'TRANSFER';
  createdAt: ISO8601;
}

export type EvidenceRow = Evidence;

// ---------------------------------------------------------------------------
// Part 3, 10: Challenge
// ---------------------------------------------------------------------------

export interface Challenge {
  id: UUID;
  title: string;
  description: string;
  primarySkillId: UUID;
  secondarySkillIds: UUID[];
  difficultyLevel: DifficultyLevel;
  difficultyScore: number;           // 1-10
  conceptDifficulty: number;         // 1-5
  implementationComplexity: number;  // 1-5
  constraintComplexity: number;      // 1-5
  reasoningComplexity: number;       // 1-5
  ambiguity: number;                 // 1-5
  contextType: 'STANDARD' | 'NOVEL' | 'VERIFICATION' | 'EXPLORATION' | 'TRANSFER';
  harnessType: 'function' | 'cli' | 'http' | 'class' | 'sql';
  languagesSupported: SupportedLanguage[];
  status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
  isVerification: boolean;
  prompt: string;
  functionName: string;
  starterCode: Record<SupportedLanguage, string>;
  publicTests: TestCase[];
  hiddenTests: TestCase[];
  hints: string[];
  solutionMetadata: {
    referenceSolution: Record<SupportedLanguage, string>;
    approachSummary: string;
    timeComplexity: string;
    spaceComplexity: string;
  };
  evaluationMetadata: {
    entryFunction: string;
    comparisonMode: ComparisonMode;
  };
  qualityStatus: 'DRAFT' | 'VALIDATING' | 'REVIEW' | 'APPROVED' | 'ACTIVE' | 'DEPRECATED';
  qualityAnalytics: ChallengeQualityAnalytics | null;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  roleContext?: string[];
}

export interface TestCase {
  id: UUID;
  category: TestCategory;
  input: unknown;
  expectedOutput: unknown;
  hidden: boolean;
  points: number;
  ordinal: number;
}

export interface ChallengeQualityAnalytics {
  attemptCount: number;
  passRate: number;
  avgHintsUsed: number;
  avgCompletionMs: number;
  lastUpdated: ISO8601;
}

// ---------------------------------------------------------------------------
// Part 2: Diagnostic
// ---------------------------------------------------------------------------

export interface DiagnosticSkill {
  id: string;
  name: string;
}

export interface DiagnosticRole {
  id: string;
  name: string;
  requiredSkills: string[];
}

export interface DiagnosticTask {
  id: string;
  type: TaskType;
  skillIds: string[];
  difficulty: DifficultyLabel;
  prompt: string;
  starterCode?: Record<SupportedLanguage, string>;
  tests: DiagnosticTestCase[];
  referenceSolution: Record<SupportedLanguage, string>;
  hints: string[];
}

export interface DiagnosticTestCase {
  id: string;
  input: unknown;
  expectedOutput: unknown;
  hidden: boolean;
  category: TestCategory;
}

export interface DiagnosticSession {
  id: UUID;
  studentId: UUID;
  roleId: string;
  blueprint: DiagnosticBlueprint;
  currentTaskIndex: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  createdAt: ISO8601;
  completedAt: ISO8601 | null;
}

export interface DiagnosticBlueprint {
  taskIds: string[];
  stoppingCriteria: {
    minTasks: number;
    maxTasks: number;
    confidenceThreshold: number;
  };
}

export interface DiagnosticSubmission {
  taskId: string;
  code: string;
  language: SupportedLanguage;
  hintsUsed: number;
}

export interface DiagnosticResult {
  taskId: string;
  passed: boolean;
  testResults: TestCaseResult[];
  score: number;
}

export interface DiagnosticAttempt {
  id: UUID;
  sessionId: UUID;
  taskId: string;
  submission: DiagnosticSubmission;
  result: DiagnosticResult | null;
  createdAt: ISO8601;
}

export interface TestCaseResult {
  testCaseId: string;
  passed: boolean;
  actualOutput: unknown;
  expectedOutput: unknown;
  errorKind?: string;
  errorMessage?: string;
  runtimeMs: number;
}

// ---------------------------------------------------------------------------
// Part 3: Evaluation
// ---------------------------------------------------------------------------

export interface EvaluationResult {
  attemptId: UUID;
  challengeId: UUID;
  status: ExecutionStatus;
  testResults: TestCaseResult[];
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  runtimeMs: number;
  memoryKb: number;
  compileError: string | null;
  resourceLimitExceeded: boolean;
  passed: boolean;
  syntaxError: boolean;
  timeout: boolean;
}

export interface DeterministicEvaluationResult {
  status: 'PASSED' | 'FAILED' | 'SYSTEM_ERROR';
  testResults: TestCaseResult[];
  testsPassed: number;
  testsFailed: number;
  runtimeMs: number;
  compileError: string | null;
  resourceLimitExceeded: boolean;
}

// ---------------------------------------------------------------------------
// Part 3, 4: Diagnosis
// ---------------------------------------------------------------------------

export interface Diagnosis {
  attemptId: UUID;
  mistakeCategory: MistakeCategory;
  languageIssue: boolean;
  failurePattern: string | null;
  details: string;
  aiStatus: 'AI_GENERATED' | 'AI_EVALUATION_PENDING' | 'AI_RESPONSE_INVALID';
  aiObservations?: string[];
  aiInferences?: string[];
  aiMistakes?: Array<{ category: MistakeCategory; confidence: 'LOW' | 'MEDIUM' | 'HIGH'; reasoning: string }>;
}

// ---------------------------------------------------------------------------
// Part 4, 9: Skill Gap
// ---------------------------------------------------------------------------

export interface SkillGap {
  skillId: UUID;
  skillName: string;
  level: SkillLevel | MasteryState;
  gapScore: number;
  evidenceCount: number;
  recentMistakes: MistakeCategory[];
  hasActiveMisconception: boolean;
  gapType: GapType;
  severity: number;
  explanation: string;
}

export interface GapAssessment {
  skillId: UUID;
  gapType: GapType;
  severity: number;  // 0-1
  explanation: string;
}

// ---------------------------------------------------------------------------
// Part 5: Prerequisite Analysis
// ---------------------------------------------------------------------------

export interface PrerequisiteWeakness {
  skillId: UUID;
  skillName: string;
  score: number;
  depth: number;
  chain: UUID[];
}

// ---------------------------------------------------------------------------
// Part 5: Difficulty Decision
// ---------------------------------------------------------------------------

export type DifficultyDecision =
  | { mode: 'ADVANCE'; targetLevel: DifficultyLevel; reason: string }
  | { mode: 'HOLD'; targetLevel: DifficultyLevel; reason: string }
  | { mode: 'RECOVER'; targetLevel: DifficultyLevel; reason: string };

// ---------------------------------------------------------------------------
// Part 5, 6: Recommendation
// ---------------------------------------------------------------------------

export interface Recommendation {
  id: UUID;
  studentId: UUID;
  challengeId: UUID;
  skillId: UUID;
  gapType: GapType | null;
  interventionType: 'TARGETED_PRACTICE' | 'DEBUGGING' | 'TRANSFER' | 'REVIEW' | 'VERIFICATION' | 'LEARN' | 'PREREQUISITE_REVIEW' | 'EXPLORATION';
  learningObjective: string;
  reason: string;
  rankingScore: number;
  isRepetition: boolean;
  isExploration: boolean;
  evidenceSnapshot: Record<string, unknown>;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'EXPIRED' | 'DISMISSED';
  createdAt: ISO8601;
  acceptedAt: ISO8601 | null;
  completedAt: ISO8601 | null;
}

export interface RankingContext {
  targetSkillId: UUID;
  gapType: GapType | null;
  gapSeverity: number;
  targetDifficultyLevel: DifficultyLevel;
  rolePriority: Priority | null;
  goalBoostsSkillGap: boolean;
  goalPrefersInterviewStyle: boolean;
  recentlyAttemptedChallengeIds: UUID[];
  deliberateRepetitionChallengeId: UUID | null;
  skillHasDueReview: boolean;
  isTransferTarget: boolean;
  recentlyTargetedSkillIds: UUID[];
}

export interface RankedCandidate {
  challenge: Challenge;
  score: number;
  breakdown: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Part 6: Roadmap
// ---------------------------------------------------------------------------

export interface Milestone {
  id: UUID;
  studentId: UUID;
  name: string;
  description: string;
  requiredSkills: UUID[];
  targetDate: ISO8601 | null;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'READY_FOR_VERIFICATION' | 'COMPLETED' | 'NEEDS_REASSESSMENT';
  completionCriteria: {
    requiredSkillsAtTarget: boolean;
    minConfidence: number;
    minIndependentEvidencePerRequiredSkill: number;
    verificationRequired: boolean;
  };
  progress: number; // 0-1
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  studentId: UUID;
  activities: PlannedActivity[];
  totalEstimatedMinutes: number;
}

export interface WeeklyPlan {
  weekStart: string; // YYYY-MM-DD
  studentId: UUID;
  dailyPlans: DailyPlan[];
  focusSkills: UUID[];
  reviewSkills: UUID[];
}

export interface PlannedActivity {
  id: UUID;
  type: ActivityType;
  skillId: UUID;
  challengeId: UUID | null;
  estimatedMinutes: number;
  priority: Priority;
  reason: string;
}

export type ActivityType =
  | 'LEARN'
  | 'PRACTICE'
  | 'TARGETED_PRACTICE'
  | 'DEBUGGING'
  | 'TRANSFER'
  | 'REVIEW'
  | 'VERIFICATION'
  | 'TIMED_CHALLENGE'
  | 'INTERVIEW_CHALLENGE'
  | 'EXPLORATION';

// ---------------------------------------------------------------------------
// Part 7: Learning Session Orchestration
// ---------------------------------------------------------------------------

export type LearningSessionMode =
  | 'FOCUSED_PRACTICE'
  | 'ROADMAP_BLOCK'
  | 'REVIEW'
  | 'ASSESSMENT_PREP'
  | 'INTERVIEW_PREP'
  | 'RECOVERY';

export type LearningSessionState =
  | 'PLANNED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'EXPIRED';

export type LearningSessionActivityState =
  | 'QUEUED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'SKIPPED';

export type LearningSessionEventType =
  | 'SESSION_CREATED'
  | 'SESSION_STARTED'
  | 'SESSION_PAUSED'
  | 'SESSION_RESUMED'
  | 'SESSION_COMPLETED'
  | 'SESSION_ABANDONED'
  | 'SESSION_EXPIRED'
  | 'ACTIVITY_STARTED'
  | 'ACTIVITY_COMPLETED'
  | 'ACTIVITY_SKIPPED'
  | 'EVIDENCE_ATTACHED'
  | 'NEXT_ACTION_RECOMMENDED';

export type LearningSessionActionType =
  | 'START_SESSION'
  | 'RESUME_SESSION'
  | 'START_ACTIVITY'
  | 'CONTINUE_ACTIVITY'
  | 'SUBMIT_ATTEMPT'
  | 'REQUEST_HINT'
  | 'TAKE_BREAK'
  | 'FINISH_SESSION'
  | 'NO_ACTION_AVAILABLE';

export interface LearningSessionFocus {
  skillId: UUID;
  priority: Priority;
  reason: string;
  targetMinutes: number;
  masteryState: MasteryState | null;
}

export interface LearningSessionActivity {
  id: UUID;
  type: ActivityType;
  skillId: UUID;
  challengeId: UUID | null;
  recommendationId: UUID | null;
  state: LearningSessionActivityState;
  estimatedMinutes: number;
  priority: Priority;
  reason: string;
  evidenceIds: UUID[];
  score: number | null;
  startedAt: ISO8601 | null;
  completedAt: ISO8601 | null;
  skippedAt: ISO8601 | null;
  metadata: Record<string, unknown>;
}

export interface LearningSession {
  id: UUID;
  studentId: UUID;
  mode: LearningSessionMode;
  state: LearningSessionState;
  title: string;
  focusSkills: LearningSessionFocus[];
  activities: LearningSessionActivity[];
  activeActivityId: UUID | null;
  targetMinutes: number;
  totalEstimatedMinutes: number;
  startedAt: ISO8601 | null;
  endedAt: ISO8601 | null;
  expiresAt: ISO8601;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  metadata: Record<string, unknown>;
}

export interface LearningSessionEvent {
  id: UUID;
  sessionId: UUID;
  studentId: UUID;
  type: LearningSessionEventType;
  activityId: UUID | null;
  payload: Record<string, unknown>;
  createdAt: ISO8601;
}

export interface LearningSessionNextAction {
  type: LearningSessionActionType;
  label: string;
  reason: string;
  activityId: UUID | null;
  challengeId: UUID | null;
  skillId: UUID | null;
  priority: Priority | null;
}

export interface LearningSessionSkillCoverage {
  skillId: UUID;
  plannedActivities: number;
  completedActivities: number;
  evidenceCount: number;
  averageScore: number | null;
}

export interface LearningSessionSummary {
  sessionId: UUID;
  studentId: UUID;
  state: LearningSessionState;
  completionRatio: number;
  completedActivities: number;
  skippedActivities: number;
  totalActivities: number;
  minutesPlanned: number;
  minutesCompleted: number;
  evidenceCount: number;
  skillCoverage: LearningSessionSkillCoverage[];
  nextAction: LearningSessionNextAction;
  generatedAt: ISO8601;
}

export interface ReadinessReport {
  studentId: UUID;
  roleId: UUID | null;
  overallReadiness: ReadinessState;
  skillReadiness: Record<UUID, { state: ReadinessState; score: number }>;
  blockingGaps: SkillGap[];
  estimatedDaysToReady: number | null;
  generatedAt: ISO8601;
}

export interface PriorityBreakdown {
  role: { value: number; weight: number; contribution: number };
  gap: { value: number; weight: number; contribution: number };
  block: { value: number; weight: number; contribution: number };
  required: { value: number; weight: number; contribution: number };
  urgency: { value: number; weight: number; contribution: number };
  trend: { value: number; weight: number; contribution: number };
}

// ---------------------------------------------------------------------------
// Part 8: Interview
// ---------------------------------------------------------------------------

export interface InterviewBlueprint {
  id: UUID;
  name: string;
  type: InterviewType;
  version: number;
  competencies: string[];
  problemCount: number;
  durationMinutes: number;
  assistancePolicy: {
    maxHints: number;
    hintLevels: HintLevel[];
    allowSolutionView: boolean;
  };
  scoring: {
    dimensions: string[];
    weights: Record<string, number>;
    passThreshold: number;
  };
  createdAt: ISO8601;
}

export interface Interview {
  id: UUID;
  studentId: UUID;
  blueprintId: UUID;
  blueprintVersion: number;
  state: InterviewState;
  currentProblemIndex: number;
  startedAt: ISO8601 | null;
  completedAt: ISO8601 | null;
  expiresAt: ISO8601 | null;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface InterviewSession {
  id: UUID;
  interviewId: UUID;
  studentId: UUID;
  connectionId: string;
  connectedAt: ISO8601;
  disconnectedAt: ISO8601 | null;
}

export interface InterviewProblem {
  id: UUID;
  interviewId: UUID;
  challengeId: UUID;
  ordinal: number;
  state: 'PENDING' | 'PRESENTED' | 'CLARIFICATION' | 'APPROACH_DISCUSSION' | 'CODING' | 'TESTING' | 'DEBUGGING' | 'FOLLOW_UP' | 'EVALUATED';
  startedAt: ISO8601 | null;
  completedAt: ISO8601 | null;
  hintsUsed: number;
  hintLevel: HintLevel;
  solutionViewed: boolean;
}

export interface InterviewEvent {
  id: UUID;
  interviewId: UUID;
  problemId: UUID | null;
  type: string;
  payload: Record<string, unknown>;
  timestamp: ISO8601;
}

export interface InterviewEvaluation {
  id: UUID;
  interviewId: UUID;
  problemId: UUID;
  dimensionScores: Record<string, number>;
  overallScore: number;
  passed: boolean;
  feedback: string;
  createdAt: ISO8601;
}

export interface InterviewReport {
  interviewId: UUID;
  studentId: UUID;
  blueprintId: UUID;
  overallPassed: boolean;
  overallScore: number;
  dimensionScores: Record<string, number>;
  problemResults: InterviewEvaluation[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  generatedAt: ISO8601;
}

// ---------------------------------------------------------------------------
// Part 11: Incident
// ---------------------------------------------------------------------------

export interface IncidentBlueprint {
  id: UUID;
  name: string;
  description: string;
  severity: IncidentSeverity;
  initialPhase: IncidentPhase;
  symptoms: string[];
  diagnostics: string[];
  runbooks: string[];
  tags: string[];
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface Incident {
  id: UUID;
  studentId: UUID;
  blueprintId: UUID;
  title: string;
  description: string;
  severity: IncidentSeverity;
  phase: IncidentPhase;
  status: 'ACTIVE' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';
  startedAt: ISO8601;
  resolvedAt: ISO8601 | null;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface IncidentHypothesis {
  id: UUID;
  incidentId: UUID;
  studentId: UUID;
  description: string;
  status: HypothesisStatus;
  evidence: string[];
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface IncidentAction {
  id: UUID;
  incidentId: UUID;
  studentId: UUID;
  type: 'LOG_QUERY' | 'METRIC_QUERY' | 'TRACE_QUERY' | 'DEPLOYMENT' | 'CONFIG_CHANGE' | 'RESTART' | 'SCALE' | 'ROLLOUT' | 'ROLLBACK' | 'OTHER';
  description: string;
  result: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'PENDING';
  details: Record<string, unknown>;
  timestamp: ISO8601;
}

export type IncidentActionType = IncidentAction['type'];

export interface IncidentLogEntry {
  id: UUID;
  incidentId: UUID;
  source: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  message: string;
  timestamp: ISO8601;
  metadata: Record<string, unknown>;
}

export interface IncidentMetric {
  id: UUID;
  incidentId: UUID;
  name: string;
  value: number;
  unit: string;
  timestamp: ISO8601;
  tags: Record<string, string>;
}

export interface IncidentTrace {
  id: UUID;
  incidentId: UUID;
  traceId: string;
  spanId: string;
  operation: string;
  durationMs: number;
  status: 'OK' | 'ERROR' | 'TIMEOUT';
  tags: Record<string, string>;
  timestamp: ISO8601;
}

export interface Postmortem {
  id: UUID;
  incidentId: UUID;
  studentId: UUID;
  timeline: Array<{ timestamp: ISO8601; event: string }>;
  rootCause: string;
  contributingFactors: string[];
  impact: string;
  resolution: string;
  actionItems: Array<{ description: string; owner: string; dueDate: ISO8601 | null; status: 'OPEN' | 'IN_PROGRESS' | 'DONE' }>;
  lessonsLearned: string[];
  createdAt: ISO8601;
}

// ---------------------------------------------------------------------------
// Part 10: Engineering Simulator
// ---------------------------------------------------------------------------

export interface ProjectDefinition {
  id: UUID;
  title: string;
  description: string;
  type: ProjectType;
  requirements: Requirement[];
  rubric: Rubric;
  constraints: string[];
  techStack: string[];
  starterFiles: Record<string, string>;
  hiddenTests: TestCase[];
  publicTests: TestCase[];
  timeLimitMinutes: number;
  difficulty: DifficultyLabel;
  skills: UUID[];
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export type Project = ProjectDefinition;
export type ProjectTestCase = TestCase;

export interface Requirement {
  id: UUID;
  projectId: UUID;
  description: string;
  priority: RequirementPriority;
  category: string;
  acceptanceCriteria: string[];
}

export interface Rubric {
  categories: RubricCategoryItem[];
  weights: Record<RubricCategory, number>;
}

export interface RubricCategoryItem {
  category: RubricCategory;
  weight: number;
  criteria: RubricCriterion[];
}

export interface RubricCriterion {
  id: string;
  description: string;
  points: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProjectSubmission {
  id: UUID;
  projectId: UUID;
  studentId: UUID;
  files: Record<string, string>;
  testResultsClaimed: string[];
  submittedAt: ISO8601;
}

export interface ProjectEvaluation {
  id: UUID;
  submissionId: UUID;
  projectId: UUID;
  studentId: UUID;
  categoryScores: CategoryScoreBreakdown[];
  overallScore: number;
  passed: boolean;
  aiFeedback: string[];
  aiScoreAdjustments: Record<string, number>;
  evidenceRecords: EvidenceRecord[];
  createdAt: ISO8601;
}

export interface CategoryScoreBreakdown {
  key: string;
  category: RubricCategory;
  rawScore: number;      // 0-100
  weightedScore: number; // 0-100
  maxPoints: number;
  earnedPoints: number;
  details: string[];
}

export interface EvidenceRecord {
  sessionId: UUID;
  studentId: UUID;
  skillTag: string;
  evidenceType: EvidenceType;
  strengthSignal: number; // 0-1
  source: 'project_rubric_category' | 'test_result' | 'ai_analysis' | 'static_analysis';
  metadata: Record<string, unknown>;
  consumedByMasteryEngine: boolean;
  createdAt: ISO8601;
}

export interface ProjectRevision {
  id: UUID;
  submissionId: UUID;
  studentId: UUID;
  previousFiles: Record<string, string>;
  newFiles: Record<string, string>;
  changesSummary: string;
  createdAt: ISO8601;
}

// ---------------------------------------------------------------------------
// Part 12: Submission System
// ---------------------------------------------------------------------------

export interface Submission {
  id: UUID;
  studentId: UUID;
  challengeId: UUID;
  language: SupportedLanguage;
  code: string;
  clientAttemptId: string | null;
  assistanceUsed: AssistanceLevel;
  recommendationId: UUID | null;
  state: SubmissionState;
  submittedAt: ISO8601;
  startedAt: ISO8601 | null;
  completedAt: ISO8601 | null;
  workerId?: string;
  attempts?: number;
  idempotencyKey?: string;
}

export interface SubmissionResult {
  submissionId: UUID;
  verdict: Verdict;
  testResults: TestCaseResult[];
  executionTimeMs: number;
  memoryKb: number;
  evaluation: EvaluationResult;
  diagnosis: Diagnosis;
  updatedSkillStates: StudentSkillState[];
}

// ---------------------------------------------------------------------------
// Part 13: Normalized Execution Result
// ---------------------------------------------------------------------------

export interface NormalizedExecutionResult {
  submissionId: UUID;
  verdict: Verdict;
  testResults: NormalizedTestResult[];
  executionTimeMs: number;
  memoryKb: number;
  stdout: string;
  stderr: string;
  resourceViolations: ResourceViolation[];
  metadata: Record<string, unknown>;
}

export interface NormalizedTestResult {
  testId: UUID;
  passed: boolean;
  actualOutput: unknown;
  expectedOutput: unknown;
  category: TestCategory;
  runtimeMs: number;
  memoryKb: number;
  error: TestError | null;
}

export interface TestError {
  type: 'COMPILATION' | 'RUNTIME' | 'TIMEOUT' | 'MEMORY' | 'ASSERTION';
  message: string;
  stackTrace?: string;
}

export interface ResourceViolation {
  type: 'TIME' | 'MEMORY' | 'CPU' | 'OUTPUT_SIZE' | 'FILE_DESCRIPTOR';
  limit: number;
  actual: number;
  severity: 'WARNING' | 'VIOLATION';
}

// ---------------------------------------------------------------------------
// Part 14: AI Code Coach
// ---------------------------------------------------------------------------

export interface CoachSession {
  id: UUID;
  studentId: UUID;
  challengeId: UUID | null;
  attemptId: UUID | null;
  state: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  messages: CoachMessage[];
  observations: CoachObservation[];
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface CoachMessage {
  id: UUID;
  sessionId: UUID;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  timestamp: ISO8601;
}

export interface CoachObservation {
  id: UUID;
  sessionId: UUID;
  type: 'MISTAKE_PATTERN' | 'PROGRESS' | 'STUCK' | 'BREAKTHROUGH' | 'REPETITION';
  description: string;
  confidence: number;
  relatedEvidenceIds: UUID[];
  timestamp: ISO8601;
}

export interface CoachContext {
  studentProfile: StudentProfile;
  challenge: Challenge | null;
  attempt: Submission | null;
  evaluation: EvaluationResult | null;
  diagnosis: Diagnosis | null;
  evidence: Evidence[];
  skillGaps: SkillGap[];
  recentAttempts: Submission[];
}

// ---------------------------------------------------------------------------
// Part 15: Hint Ladder
// ---------------------------------------------------------------------------

export interface HintLadderSession {
  id: UUID;
  studentId: UUID;
  challengeId: UUID;
  attemptId: UUID;
  state: HintLadderState;
  currentRung: number;
  maxRungs: number;
  rootIssue: RootIssue | null;
  rungs: HintRung[];
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface HintRung {
  id: UUID;
  sessionId: UUID;
  level: number;
  type: HintType;
  content: string;
  codeLocation: CodeLocation | null;
  deliveredAt: ISO8601 | null;
  effectiveness: 'UNKNOWN' | 'HELPFUL' | 'NOT_HELPFUL' | 'CONFUSING';
  studentResponse: string | null;
}

export interface RootIssue {
  category: MistakeCategory;
  description: string;
  codeLocation: CodeLocation | null;
  confidence: number;
  evidence: UUID[];
}

export interface CodeLocation {
  file: string;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
  context: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface DemoLoginRequest {
  studentId: string;
}

export interface AuthResponse {
  token: string;
  student: Student;
  expiresAt: ISO8601;
}

// Career Context
export interface SelectRoleRequest {
  primaryRoleSlug: string;
  secondaryRoleSlug?: string | null;
}

// Diagnostic
export interface DiagnosticStartRequest {
  roleId: string;
}

export interface DiagnosticResponseRequest {
  taskId: string;
  code: string;
  language: SupportedLanguage;
  hintsUsed: number;
}

// Challenges
export interface ChallengeAttemptRequest {
  challengeId: UUID;
  language: SupportedLanguage;
  code: string;
  clientAttemptId?: string;
  assistanceUsed?: AssistanceLevel;
  recommendationId?: UUID;
}

export interface HintRequest {
  challengeId: UUID;
  attemptId: UUID;
  currentCode: string;
  language: SupportedLanguage;
}

// Practice
export interface PracticeAttemptRequest {
  challengeId: UUID;
  language: SupportedLanguage;
  code: string;
  clientAttemptId?: string;
  assistanceUsed?: AssistanceLevel;
  recommendationId?: UUID;
}

// Interview
export interface InterviewStartRequest {
  blueprintId: UUID;
  type?: InterviewType;
}

export interface InterviewActionRequest {
  action: 'CLARIFY' | 'DISCUSS_APPROACH' | 'START_CODING' | 'SUBMIT_CODE' | 'RUN_TESTS' | 'REQUEST_HINT' | 'VIEW_SOLUTION' | 'NEXT_PROBLEM' | 'END_INTERVIEW';
  payload: Record<string, unknown>;
}

// Incident
export interface IncidentStartRequest {
  blueprintId: UUID;
}

export interface IncidentHypothesisRequest {
  description: string;
}

export interface IncidentActionRequest {
  type: IncidentAction['type'];
  description: string;
  details: Record<string, unknown>;
}

// Project (Engineering Simulator)
export interface ProjectSubmitRequest {
  projectId: UUID;
  files: Record<string, string>;
  testResultsClaimed: string[];
}

export interface ProjectRevisionRequest {
  submissionId: UUID;
  newFiles: Record<string, string>;
  changesSummary: string;
}

// Coach
export interface CoachMessageRequest {
  sessionId: UUID;
  message: string;
  context: CoachContext;
}

// Hints
export interface HintLadderRequestRequest {
  challengeId: UUID;
  attemptId: UUID;
  currentCode: string;
  language: SupportedLanguage;
  evaluationResult: EvaluationResult;
}

// ============================================================================
// AI PROVIDER TYPES
// ============================================================================

export interface AIProvider {
  name: string;
  completeJson(systemPrompt: string, userPayload: Record<string, unknown>, schemaHint: string): Promise<Record<string, unknown>>;
  isAvailable(): boolean;
}

export interface AIProviderConfig {
  provider: 'groq' | 'gemini' | 'anthropic' | 'mock';
  model?: string;
  apiKey?: string;
  timeoutMs?: number;
}

// ============================================================================
// EXECUTION PROVIDER TYPES
// ============================================================================

export interface ExecutionProvider {
  execute(opts: {
    language: SupportedLanguage;
    code: string;
    testCases: Array<{ id: UUID; input: unknown; category: TestCategory }>;
    harnessType: Challenge['harnessType'];
    functionName: string;
    limits: ExecutionLimits;
  }): Promise<ExecutionOutcome>;
}

export interface ExecutionLimits {
  wallTimeMs: number;
  cpuTimeSec: number;
  memoryKB: number;
  heapMB: number;
  outputLimitBytes: number;
}

export interface ExecutionOutcome {
  globalError: string | null;
  timedOut: boolean;
  rows: Array<{
    testCaseId: UUID;
    actual: unknown;
    error: string | null;
    timedOut: boolean;
    runtimeMs: number;
  }>;
}

// ============================================================================
// DATABASE REPOSITORY INTERFACES
// ============================================================================

export interface Repository<T> {
  findById(id: UUID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(entity: T): Promise<T>;
  delete(id: UUID): Promise<void>;
}

export interface StudentRepository extends Repository<Student> {
  findByInstitution(institutionId: UUID): Promise<Student[]>;
}

export interface ChallengeRepository extends Repository<Challenge> {
  findBySkill(skillId: UUID): Promise<Challenge[]>;
  findByDifficulty(level: DifficultyLevel): Promise<Challenge[]>;
  findActive(): Promise<Challenge[]>;
  getTestCases(challengeId: UUID, language: SupportedLanguage): Promise<TestCase[]>;
}

export interface EvidenceRepository extends Repository<Evidence> {
  findByStudent(studentId: UUID): Promise<Evidence[]>;
  findByStudentAndSkill(studentId: UUID, skillId: UUID): Promise<Evidence[]>;
  findRecentByStudent(studentId: UUID, limit: number): Promise<Evidence[]>;
}

export interface SkillStateRepository extends Repository<StudentSkillState> {
  findByStudent(studentId: UUID): Promise<StudentSkillState[]>;
  findByStudentAndSkill(studentId: UUID, skillId: UUID): Promise<StudentSkillState | null>;
  upsert(state: StudentSkillState): Promise<StudentSkillState>;
}

export interface RecommendationRepository extends Repository<Recommendation> {
  findPendingByStudent(studentId: UUID): Promise<Recommendation[]>;
  findByStudentAndChallenge(studentId: UUID, challengeId: UUID): Promise<Recommendation | null>;
}

export interface SubmissionRepository extends Repository<Submission> {
  findByStudent(studentId: UUID, limit?: number): Promise<Submission[]>;
  findByChallenge(challengeId: UUID): Promise<Submission[]>;
}

// ============================================================================
// EVENTS
// ============================================================================

export interface DomainEvent {
  id: UUID;
  type: string;
  aggregateId: UUID;
  payload: Record<string, unknown>;
  timestamp: ISO8601;
  version: number;
}

export const EVENT_TYPES = {
  // Part 1
  ROLE_SELECTED: 'CODEFORGE_ROLE_SELECTED',
  ROLE_CHANGED: 'CODEFORGE_ROLE_CHANGED',
  ROLE_LIST_VIEWED: 'CODEFORGE_ROLE_LIST_VIEWED',
  ROLE_SEARCHED: 'CODEFORGE_ROLE_SEARCHED',
  ROLE_VIEWED: 'CODEFORGE_ROLE_VIEWED',
  ROLE_COMPARISON_VIEWED: 'CODEFORGE_ROLE_COMPARISON_VIEWED',

  // Part 5, 9
  EVIDENCE_RECORDED: 'EVIDENCE_RECORDED',
  SKILL_MASTERY_UPDATED: 'SKILL_MASTERY_UPDATED',
  GAP_DETECTED: 'GAP_DETECTED',
  RECOMMENDATION_CREATED: 'RECOMMENDATION_CREATED',
  RECOMMENDATION_ACCEPTED: 'RECOMMENDATION_ACCEPTED',

  // Part 6
  ROADMAP_GENERATED: 'ROADMAP_GENERATED',
  MILESTONE_COMPLETED: 'MILESTONE_COMPLETED',
  READINESS_CHANGED: 'READINESS_CHANGED',

  // Part 2
  DIAGNOSTIC_STARTED: 'DIAGNOSTIC_STARTED',
  DIAGNOSTIC_COMPLETED: 'DIAGNOSTIC_COMPLETED',

  // Part 3, 4
  CHALLENGE_ATTEMPTED: 'CHALLENGE_ATTEMPTED',
  CHALLENGE_PASSED: 'CHALLENGE_PASSED',
  CHALLENGE_FAILED: 'CHALLENGE_FAILED',
  HINT_REQUESTED: 'HINT_REQUESTED',
  HINT_DELIVERED: 'HINT_DELIVERED',

  // Part 8
  INTERVIEW_STARTED: 'INTERVIEW_STARTED',
  INTERVIEW_COMPLETED: 'INTERVIEW_COMPLETED',
  INTERVIEW_PROBLEM_EVALUATED: 'INTERVIEW_PROBLEM_EVALUATED',

  // Part 11
  INCIDENT_STARTED: 'INCIDENT_STARTED',
  INCIDENT_RESOLVED: 'INCIDENT_RESOLVED',
  HYPOTHESIS_PROPOSED: 'HYPOTHESIS_PROPOSED',
  ACTION_TAKEN: 'ACTION_TAKEN',

  // Part 10
  PROJECT_SUBMITTED: 'PROJECT_SUBMITTED',
  PROJECT_EVALUATED: 'PROJECT_EVALUATED',
  PROJECT_REVISED: 'PROJECT_REVISED',

  // Part 12, 13
  SUBMISSION_RECEIVED: 'SUBMISSION_RECEIVED',
  SUBMISSION_EVALUATED: 'SUBMISSION_EVALUATED',

  // Part 14
  COACH_SESSION_STARTED: 'COACH_SESSION_STARTED',
  COACH_MESSAGE_SENT: 'COACH_MESSAGE_SENT',
  COACH_OBSERVATION_RECORDED: 'COACH_OBSERVATION_RECORDED',

  // Part 15
  HINT_LADDER_STARTED: 'HINT_LADDER_STARTED',
  HINT_ESCALATED: 'HINT_ESCALATED',
} as const;

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface UnifiedConfig {
  mastery: {
    recencyHalfLifeDays: number;
    difficultyWeightMin: number;
    difficultyWeightMax: number;
    independenceMultiplier: Record<AssistanceLevel, number>;
    repeatedMistakeWindow: number;
    repeatedMistakeThresholdFraction: number;
    repeatedMistakePenalty: number;
    prerequisiteGateThreshold: number;
    staleThresholdDays: number;
    verifiedRequiresIndependent: boolean;
    verifiedRequiresTransfer: boolean;
    verifiedRequiresHighStakes: boolean;
  };
  gaps: {
    insufficientEvidenceMinCount: number;
    transferGapMinStandardScore: number;
    transferGapMaxNovelScore: number;
    criticalGapThreshold: number;
  };
  difficulty: {
    levels: DifficultyLevel[];
    consecutiveSuccessesToIncrease: number;
    consecutiveFailuresToDecrease: number;
    recoveryRequiresSuccessAtLower: boolean;
  };
  ranking: {
    weights: {
      gap: number;
      role: number;
      difficultyFit: number;
      freshness: number;
      diversity: number;
      quality: number;
      goal: number;
      transfer: number;
      review: number;
    };
  };
  scheduler: {
    maxDailyMinutes: number;
    maxSessionMinutes: number;
    minBreakMinutes: number;
    preferredSessionLengthMinutes: number;
    spacedReviewIntervalDays: number;
  };
  readiness: {
    bands: Array<{ max: number; state: ReadinessState }>;
  };
  execution: ExecutionLimits;
  rateLimits: {
    submissionsPerMinute: number;
    hintsPerMinute: number;
    coachMessagesPerMinute: number;
    apiCallsPerMinute: number;
  };
  ai: {
    providers: AIProviderConfig[];
    fallbackOrder: string[];
    maxRetries: number;
  };
}

// ============================================================================
// UTILITY TYPE HELPERS
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

export type EntityMap<T extends { id: UUID }> = Map<UUID, T>;

export function toEntityMap<T extends { id: UUID }>(items: T[]): EntityMap<T> {
  return new Map(items.map(item => [item.id, item]));
}

// ============================================================================
// PARTS 16–32 DOMAIN TYPES (Analysis, Debugging, Review, Signals, Growth, Gateway)
// ============================================================================

// ---------------------------------------------------------------------------
// Part 16: Code Correctness Analysis
// ---------------------------------------------------------------------------
export const CorrectnessStatus = {
  ACCEPTED: 'ACCEPTED',
  PARTIALLY_ACCEPTED: 'PARTIALLY_ACCEPTED',
  REJECTED: 'REJECTED',
  INCONCLUSIVE: 'INCONCLUSIVE',
  ERROR: 'ERROR',
} as const;
export type CorrectnessStatus = (typeof CorrectnessStatus)[keyof typeof CorrectnessStatus];

export const ConfidenceLevel = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  UNKNOWN: 'UNKNOWN',
} as const;
export type ConfidenceLevel = (typeof ConfidenceLevel)[keyof typeof ConfidenceLevel];

export const CorrectnessTestOutcome = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  ERRORED: 'ERRORED',
  SKIPPED: 'SKIPPED',
  TIMEOUT: 'TIMEOUT',
} as const;
export type CorrectnessTestOutcome = (typeof CorrectnessTestOutcome)[keyof typeof CorrectnessTestOutcome];

export const ErrorCategory = {
  NONE: 'NONE',
  LOGIC: 'LOGIC',
  RUNTIME: 'RUNTIME',
  COMPILATION: 'COMPILATION',
  TIMEOUT: 'TIMEOUT',
  MEMORY: 'MEMORY',
  OUTPUT_FORMAT: 'OUTPUT_FORMAT',
  EDGE_CASE: 'EDGE_CASE',
  UNKNOWN: 'UNKNOWN',
} as const;
export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];

export const MismatchType = {
  VALUE: 'VALUE',
  TYPE: 'TYPE',
  ORDER: 'ORDER',
  MISSING: 'MISSING',
  EXTRA: 'EXTRA',
  FORMAT: 'FORMAT',
  PRECISION: 'PRECISION',
} as const;
export type MismatchType = (typeof MismatchType)[keyof typeof MismatchType];

export const RequirementCoverageStatus = {
  COVERED: 'COVERED',
  PARTIALLY_COVERED: 'PARTIALLY_COVERED',
  NOT_COVERED: 'NOT_COVERED',
  CONTRADICTED: 'CONTRADICTED',
} as const;
export type RequirementCoverageStatus = (typeof RequirementCoverageStatus)[keyof typeof RequirementCoverageStatus];

export const AIDegradationReason = {
  NONE: 'NONE',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  TIMEOUT: 'TIMEOUT',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  EVIDENCE_GROUNDING_FAILED: 'EVIDENCE_GROUNDING_FAILED',
} as const;
export type AIDegradationReason = (typeof AIDegradationReason)[keyof typeof AIDegradationReason];

export interface SubmissionRef {
  submissionId: UUID;
  submissionVersion: string;
  problemId: UUID;
  userId: UUID;
  language: SupportedLanguage;
}

export interface CorrectnessTestResult {
  id: string;
  outcome: CorrectnessTestOutcome;
  tags: string[];
  mismatchType?: MismatchType;
  timeMs?: number;
  memoryKb?: number;
  hidden: boolean;
}

export interface CompilationEvidence {
  attempted: boolean;
  success: boolean;
  diagnostics: string[];
}

export interface CorrectnessExecutionEvidence {
  ref: SubmissionRef;
  compilation: CompilationEvidence | null;
  tests: {
    totalAvailable: number;
    results: CorrectnessTestResult[];
    gradingComplete: boolean;
  } | null;
  executedAt: ISO8601;
}

export interface SourceRange {
  file?: string;
  startLine: number;
  endLine: number;
  startCol?: number;
  endCol?: number;
  snippet?: string;
}

export interface StaticFinding {
  ruleId: string;
  language: SupportedLanguage;
  message: string;
  severity: 'info' | 'warning' | 'error';
  range?: SourceRange;
  source: 'compiler-diagnostic' | 'ast-analysis' | 'heuristic';
}

export interface CorrectnessRequirement {
  id: string;
  description: string;
  category:
    | 'input'
    | 'output'
    | 'constraint'
    | 'edge-case'
    | 'ordering'
    | 'numeric'
    | 'behavior';
  relatedTags: string[];
}

export interface RequirementCoverage {
  requirement: CorrectnessRequirement;
  status: RequirementCoverageStatus;
  supportingEvidenceIds: string[];
  rationale: string;
}

export interface FailureCluster {
  id: string;
  testIds: string[];
  sharedTags: string[];
  hypothesis: string;
  observedFact: string;
}

export interface EvidenceConfidence {
  level: ConfidenceLevel;
  reasons: string[];
}

export interface DeterministicVerdict {
  status: CorrectnessStatus;
  errorCategory: ErrorCategory;
  confidence: EvidenceConfidence;
  passRateAvailable: number | null;
  totalAvailable: number;
  passed: number;
  failed: number;
  skipped: number;
  clusters: FailureCluster[];
  summary: string;
}

export interface AIFinding {
  claim: string;
  evidenceIds: string[];
  confidence: ConfidenceLevel;
}

export interface RootCause {
  layer: 'algorithm' | 'implementation' | 'specification-misunderstanding' | 'unknown';
  description: string;
  affectedRegions: SourceRange[];
}

export interface AIAnalysisResult {
  statusAssessment: CorrectnessStatus;
  explanationConfidence: ConfidenceLevel;
  summary: string;
  findings: AIFinding[];
  requirementNotes: Array<{ requirementId: string; note: string; evidenceIds: string[] }>;
  rootCause: RootCause | null;
  recommendedNextAction: string;
}

export interface CorrectnessDelta {
  previousStatus: CorrectnessStatus | null;
  currentStatus: CorrectnessStatus;
  previousPassRate: number | null;
  currentPassRate: number | null;
  improvement: boolean;
  regression: boolean;
  newFailures: string[];
  resolvedFailures: string[];
}

export interface CorrectnessAssessment {
  id: UUID;
  ref: SubmissionRef;
  status: CorrectnessStatus;
  confidence: ConfidenceLevel;
  deterministic: DeterministicVerdict;
  requirementCoverage: RequirementCoverage[];
  staticFindings: StaticFinding[];
  ai: {
    available: boolean;
    degradationReason: AIDegradationReason;
    provider?: string;
    model?: string;
    latencyMs?: number;
    result: AIAnalysisResult | null;
    disagreedWithDeterministic: boolean;
  };
  delta: CorrectnessDelta | null;
  createdAt: ISO8601;
}

// ---------------------------------------------------------------------------
// Part 17: Complexity Analysis (TS-ported deterministic core)
// ---------------------------------------------------------------------------
export type ComplexityClass =
  | 'O(1)'
  | 'O(log n)'
  | 'O(n)'
  | 'O(n log n)'
  | 'O(n^2)'
  | 'O(n^3)'
  | 'O(2^n)'
  | 'O(n!)'
  | 'UNKNOWN';

export interface ComplexityExpression {
  operator: string;
  operands: Array<ComplexityExpression | string>;
  raw: string;
}

export interface ComplexityConstraints {
  nMeaning: string;
  constraints: Array<{ expression: ComplexityExpression; satisfiedBy: ComplexityClass[] }>;
}

export interface ComplexityEvidence {
  loopDepths: number[];
  nestedCalls: Array<{ function: string; depth: number }>;
  recursionDepth: number | null;
  dominantOperation: string;
}

export interface ComplexityReportPart17 {
  timeComplexity: ComplexityClass;
  spaceComplexity: ComplexityClass;
  dominantCost: string;
  constraintFit: 'FITS' | 'MARGINAL' | 'EXCEEDS' | 'UNKNOWN';
  confidence: ConfidenceLevel;
  evidence?: string;
  expressionTree?: ComplexityExpression;
}

// ---------------------------------------------------------------------------
// Part 18: Code Quality Engine
// ---------------------------------------------------------------------------
export const Severity = {
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const QualityConfidence = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  UNKNOWN: 'UNKNOWN',
} as const;
export type QualityConfidence = (typeof QualityConfidence)[keyof typeof QualityConfidence];

export type QualityDimension =
  | 'READABILITY'
  | 'MAINTAINABILITY'
  | 'STRUCTURAL_QUALITY'
  | 'SIMPLICITY'
  | 'CONSISTENCY'
  | 'DUPLICATION'
  | 'NAMING'
  | 'ROBUSTNESS'
  | 'ERROR_HANDLING'
  | 'ENGINEERING_PRACTICES';

export interface QualitySourceLocation {
  startLine: number;
  endLine: number;
  startCol?: number;
  endCol?: number;
}

export interface QualityFinding {
  findingId: string;
  ruleId: string;
  ruleVersion: string;
  category: string;
  severity: Severity;
  confidence: QualityConfidence;
  title: string;
  description: string;
  impact: string;
  sourceLocation: QualitySourceLocation | null;
  evidence: string[];
  suggestedAction: string;
  dimensions: Partial<Record<QualityDimension, number>>;
  origin: 'DETERMINISTIC' | 'AI_SEMANTIC';
}

export interface PositiveSignal {
  signalId: string;
  category: string;
  title: string;
  description: string;
  sourceLocation: QualitySourceLocation | null;
  confidence: QualityConfidence;
}

export interface DimensionScoreDetail {
  dimension: QualityDimension;
  score: number;
  contributions: Array<{ findingId: string; ruleId: string; pointsDeducted: number }>;
}

export interface ComparisonResult {
  previousScore: number;
  currentScore: number;
  delta: number;
  dimensionDeltas: Partial<Record<QualityDimension, number>>;
  narrative: string[];
}

export interface AIInterpretationOutput {
  summary: string;
  semanticFindings: AISemanticFinding[];
  recommendations: string[];
  confidence: QualityConfidence;
}

export interface AISemanticFinding {
  title: string;
  description: string;
  relatedRuleId?: string;
  confidence: QualityConfidence;
}

export interface AIInterpretationInput {
  problemContext?: ProblemContext;
  roleContext?: QualityRoleContext;
  language: SupportedLanguage;
  deterministicFindings: QualityFinding[];
  positiveSignals: PositiveSignal[];
  structuralSummary: Record<string, unknown>;
  complexity?: ComplexityInput;
  executionEvidence?: ExecutionEvidenceNote;
  relevantSourceSnippets: Array<{ location: QualitySourceLocation; snippet: string }>;
}

export interface ComplexityInput {
  timeComplexity: string;
  spaceComplexity: string;
  dominantCost: string;
  constraintFit: 'FITS' | 'MARGINAL' | 'EXCEEDS' | 'UNKNOWN';
  confidence: QualityConfidence;
  evidence?: string;
}

export interface ProblemContext {
  scope: 'ALGORITHM_CHALLENGE' | 'SINGLE_FILE_PROJECT' | 'MULTI_FILE_PROJECT';
  constraints?: string;
  problemStatement?: string;
}

export interface QualityRoleContext {
  role:
    | 'FRONTEND_DEVELOPER'
    | 'BACKEND_DEVELOPER'
    | 'FULL_STACK_DEVELOPER'
    | 'DATA_SCIENTIST'
    | 'ML_ENGINEER'
    | 'DEVOPS_ENGINEER'
    | 'GENERAL';
}

export interface ExecutionEvidenceNote {
  passed: boolean;
  testsPassed?: number;
  testsTotal?: number;
  runtimeMs?: number;
  notes?: string;
}

export interface QualityReport {
  submissionId: UUID;
  language: SupportedLanguage;
  analysisVersion: string;
  ruleSetVersion: string;
  sourceHash: string;
  overallScore: number;
  overallLabel: string;
  dimensionScores: DimensionScoreDetail[];
  findings: QualityFinding[];
  positiveSignals: PositiveSignal[];
  mostImportantImprovement: { title: string; why: string } | null;
  aiInterpretation: AIInterpretationOutput | null;
  aiStatus: 'OK' | 'UNAVAILABLE' | 'INVALID_RESPONSE' | 'NOT_CONFIGURED';
  comparison: ComparisonResult | null;
  confidenceSummary: { high: number; medium: number; low: number; unknown: number };
  generatedAt: ISO8601;
  cacheHit: boolean;
}

// ---------------------------------------------------------------------------
// Part 19: Reasoning Verification
// ---------------------------------------------------------------------------
export type ClaimType =
  | 'PROBLEM_UNDERSTANDING'
  | 'ALGORITHM'
  | 'DATA_STRUCTURE'
  | 'CONTROL_FLOW'
  | 'CORRECTNESS'
  | 'COMPLEXITY'
  | 'SPACE_COMPLEXITY'
  | 'EDGE_CASE'
  | 'OPTIMIZATION'
  | 'IMPLEMENTATION_DECISION'
  | 'INVARIANT'
  | 'TRADEOFF'
  | 'BEHAVIOR';

export type ClaimImportance = 'CORE' | 'IMPORTANT' | 'SUPPORTING' | 'INCIDENTAL';
export const VerificationStatus = {
  SUPPORTED: 'SUPPORTED',
  PARTIALLY_SUPPORTED: 'PARTIALLY_SUPPORTED',
  CONTRADICTED: 'CONTRADICTED',
  UNVERIFIED: 'UNVERIFIED',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const ReasoningEvidenceStrength = {
  DIRECT: 'DIRECT',
  STRONG: 'STRONG',
  MODERATE: 'MODERATE',
  WEAK: 'WEAK',
  INSUFFICIENT: 'INSUFFICIENT',
} as const;
export type ReasoningEvidenceStrength = (typeof ReasoningEvidenceStrength)[keyof typeof ReasoningEvidenceStrength];

export const ReasoningEvidenceType = {
  AST_EVIDENCE: 'AST_EVIDENCE',
  CONTROL_FLOW_EVIDENCE: 'CONTROL_FLOW_EVIDENCE',
  EXECUTION_EVIDENCE: 'EXECUTION_EVIDENCE',
  TEST_EVIDENCE: 'TEST_EVIDENCE',
  COMPLEXITY_EVIDENCE: 'COMPLEXITY_EVIDENCE',
  SOURCE_EVIDENCE: 'SOURCE_EVIDENCE',
  PROBLEM_REQUIREMENT_EVIDENCE: 'PROBLEM_REQUIREMENT_EVIDENCE',
  SEMANTIC_EVIDENCE: 'SEMANTIC_EVIDENCE',
} as const;
export type ReasoningEvidenceType = (typeof ReasoningEvidenceType)[keyof typeof ReasoningEvidenceType];

export const ContradictionCategory = {
  ALGORITHM_MISMATCH: 'ALGORITHM_MISMATCH',
  DATA_STRUCTURE_MISMATCH: 'DATA_STRUCTURE_MISMATCH',
  CONTROL_FLOW_MISMATCH: 'CONTROL_FLOW_MISMATCH',
  COMPLEXITY_MISMATCH: 'COMPLEXITY_MISMATCH',
  SPACE_COMPLEXITY_MISMATCH: 'SPACE_COMPLEXITY_MISMATCH',
  EDGE_CASE_MISMATCH: 'EDGE_CASE_MISMATCH',
  CORRECTNESS_REASONING_MISMATCH: 'CORRECTNESS_REASONING_MISMATCH',
  IMPLEMENTATION_DECISION_MISMATCH: 'IMPLEMENTATION_DECISION_MISMATCH',
  INVARIANT_MISMATCH: 'INVARIANT_MISMATCH',
  BEHAVIOR_MISMATCH: 'BEHAVIOR_MISMATCH',
  PROBLEM_UNDERSTANDING_MISMATCH: 'PROBLEM_UNDERSTANDING_MISMATCH',
} as const;
export type ContradictionCategory = (typeof ContradictionCategory)[keyof typeof ContradictionCategory];
export type FailureReason =
  | 'NO_REASONING'
  | 'PARSER_FAILURE'
  | 'EXECUTION_UNAVAILABLE'
  | 'COMPLEXITY_UNAVAILABLE'
  | 'AI_TIMEOUT'
  | 'AI_PROVIDER_FAILURE'
  | 'INVALID_AI_RESPONSE'
  | 'AMBIGUOUS_CLAIM'
  | 'UNSUPPORTED_LANGUAGE'
  | 'SOURCE_MAPPING_FAILURE'
  | 'DATABASE_FAILURE';

export interface ReasoningSourceLocation {
  startLine: number;
  endLine: number;
  startCol?: number;
  endCol?: number;
}

export interface Claim {
  claimId: string;
  claimType: ClaimType;
  originalText: string;
  normalizedMeaning: string;
  importance: ClaimImportance;
  confidence: number;
  isGeneric?: boolean;
}

export interface ReasoningEvidence {
  evidenceType: ReasoningEvidenceType;
  strength: ReasoningEvidenceStrength;
  description: string;
  sourceLocation: ReasoningSourceLocation | null;
  data?: Record<string, unknown>;
}

export interface ClaimVerification {
  claimId: string;
  status: VerificationStatus;
  confidence: number;
  evidence: ReasoningEvidence[];
  explanation: string;
}

export interface Contradiction {
  category: ContradictionCategory;
  claimId: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  studentClaim: string;
  actualEvidence: string;
  explanation: string;
  sourceLocation: ReasoningSourceLocation | null;
}

export interface ProblemSpec {
  problemId: string;
  title: string;
  inputs: string;
  outputs: string;
  constraints: string[];
  requiredBehavior: string;
  coreRequirement: string;
  edgeCases: string[];
  expectedComplexity?: { time?: string; space?: string };
}

export interface DimensionScore {
  dimension: string;
  score: number;
  reason: string;
}

export interface ReasoningScore {
  overall: number;
  band: 'STRONG UNDERSTANDING' | 'SOLID UNDERSTANDING' | 'PARTIAL UNDERSTANDING' | 'WEAK UNDERSTANDING';
  dimensions: DimensionScore[];
  confidence: 'High' | 'Medium' | 'Low';
}

export type FollowUpType =
  | 'WHY_THIS_ALGORITHM'
  | 'WHY_THIS_DATA_STRUCTURE'
  | 'WHAT_DOES_THIS_LOOP_MAINTAIN'
  | 'WHY_DOES_THIS_POINTER_MOVE'
  | 'WHY_IS_THIS_COMPLEXITY'
  | 'WHAT_HAPPENS_ON_THIS_EDGE_CASE'
  | 'WHY_IS_THIS_BRANCH_REQUIRED'
  | 'WHAT_WOULD_BREAK_IF_REMOVED';

export interface FollowUpQuestion {
  type: FollowUpType;
  question: string;
  targetClaimId: string | null;
  sourceLocation: ReasoningSourceLocation | null;
}

export interface ReasoningReport {
  submissionId: UUID;
  analysisVersion: string;
  reasoningVersion: number;
  generatedAt: ISO8601;
  score: ReasoningScore;
  claims: Claim[];
  verifications: ClaimVerification[];
  agreements: string[];
  contradictions: Contradiction[];
  followUpQuestions: FollowUpQuestion[];
  understanding: 'STRONG' | 'SOLID' | 'PARTIAL' | 'WEAK';
}

// ---------------------------------------------------------------------------
// Part 20: Code-Reasoning Consistency
// ---------------------------------------------------------------------------
export const ConsistencyStatus = {
  CONSISTENT: 'CONSISTENT',
  INCONSISTENT: 'INCONSISTENT',
  PARTIAL: 'PARTIAL',
  INCONCLUSIVE: 'INCONCLUSIVE',
} as const;
export type ConsistencyStatus = (typeof ConsistencyStatus)[keyof typeof ConsistencyStatus];

export const DimensionComparisonStatus = {
  MATCH: 'MATCH',
  MISMATCH: 'MISMATCH',
  CONTRADICTION: 'CONTRADICTION',
  INSUFFICIENT: 'INSUFFICIENT',
} as const;
export type DimensionComparisonStatus = (typeof DimensionComparisonStatus)[keyof typeof DimensionComparisonStatus];
export type ReviewVerdict = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' | 'REJECT';

export interface ClaimGraphNode {
  id: string;
  claimType: ClaimType;
  normalizedMeaning: string;
  source: 'CODE' | 'REASONING' | 'SPEC';
  evidenceIds: string[];
}

export interface ClaimGraphEdge {
  fromId: string;
  toId: string;
  relation: 'SUPPORTS' | 'CONTRADICTS' | 'REFINES';
}

export interface ClaimGraph {
  nodes: ClaimGraphNode[];
  edges: ClaimGraphEdge[];
}

export interface DimensionComparison {
  dimension: string;
  codeValue: number | string;
  reasoningValue: number | string;
  status: DimensionComparisonStatus;
  delta?: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
}

export interface ConsistencyScore {
  overall: number;
  band: 'STRONG_CONSISTENCY' | 'SOLID_CONSISTENCY' | 'PARTIAL_CONSISTENCY' | 'WEAK_CONSISTENCY';
  dimensions: DimensionComparison[];
  confidence: 'High' | 'Medium' | 'Low';
}

export interface ConsistencyReport {
  submissionId: UUID;
  analysisVersion: string;
  generatedAt: ISO8601;
  status: ConsistencyStatus;
  score: ConsistencyScore;
  reconciled: boolean;
  reconciliationNote?: string;
}

// ---------------------------------------------------------------------------
// Part 21: Understanding Check
// ---------------------------------------------------------------------------
export const UNDERSTANDING_DIMENSIONS = [
  'problem',
  'algorithm',
  'data_structure',
  'state',
  'control_flow',
  'invariant',
  'correctness',
  'complexity',
  'space',
  'edge_case',
  'debugging',
  'adaptation',
  'transfer',
] as const;

export type UnderstandingDimension = (typeof UNDERSTANDING_DIMENSIONS)[number];

export const PROCEDURAL_WEIGHTED_DIMENSIONS: UnderstandingDimension[] = [
  'problem',
  'algorithm',
  'data_structure',
  'control_flow',
];

export const CONCEPTUAL_WEIGHTED_DIMENSIONS: UnderstandingDimension[] = [
  'state',
  'invariant',
  'correctness',
  'complexity',
  'space',
  'edge_case',
  'debugging',
  'adaptation',
  'transfer',
];

export type DimensionStatus =
  | 'not_assessed'
  | 'insufficient_evidence'
  | 'developing'
  | 'demonstrated'
  | 'strong'
  | 'gap_identified';

export type EvidenceStrengthLabel = 'weak' | 'moderate' | 'strong';

export interface UnderstandingDimensionProfile {
  dimension: UnderstandingDimension;
  score: number;
  confidence: number;
  evidence_strength: EvidenceStrengthLabel;
  status: DimensionStatus;
  supporting_evidence: string[];
  identified_gaps: string[];
}

export const PROBE_TYPES = [
  'explanation',
  'causal_why',
  'state_trace',
  'prediction',
  'invariant',
  'edge_case',
  'complexity',
  'counterfactual',
  'modification',
  'debugging',
  'alternative_approach',
  'transfer',
] as const;

export type ProbeType = (typeof PROBE_TYPES)[number];

export const DIFFICULTY_LADDER = [
  'recognition',
  'explanation',
  'prediction',
  'causal_reasoning',
  'modification',
  'transfer',
] as const;

export type DifficultyRung = (typeof DIFFICULTY_LADDER)[number];

export const PROBE_TYPE_DIFFICULTY: Record<ProbeType, DifficultyRung> = {
  explanation: 'explanation',
  causal_why: 'causal_reasoning',
  state_trace: 'prediction',
  prediction: 'prediction',
  invariant: 'causal_reasoning',
  edge_case: 'prediction',
  complexity: 'causal_reasoning',
  counterfactual: 'causal_reasoning',
  modification: 'modification',
  debugging: 'modification',
  alternative_approach: 'modification',
  transfer: 'transfer',
};

export interface ProbeGrounding {
  code_excerpt?: string;
  input?: string;
  state_snapshot?: Record<string, unknown>;
  execution_fact?: string;
  mutated_code?: string;
}

export interface Probe {
  id: string;
  assessment_id: string;
  target_dimension: UnderstandingDimension;
  target_concept: string;
  probe_type: ProbeType;
  difficulty: DifficultyRung;
  purpose: string;
  question: string;
  grounding: ProbeGrounding;
  expected_reasoning: string;
  evaluation_criteria: string[];
  expected_evidence: string;
  created_at: string;
}

export type PublicProbe = Omit<Probe, 'expected_evidence'>;

export function toPublicProbe(probe: Probe): PublicProbe {
  const { expected_evidence: _expected_evidence, ...rest } = probe;
  return rest;
}

export type EvidenceResult =
  | 'correct'
  | 'partially_correct'
  | 'incorrect'
  | 'ambiguous'
  | 'no_response';

export interface EvidenceItem {
  id: string;
  assessment_id: string;
  dimension: UnderstandingDimension;
  concept: string;
  probe_id: string;
  probe_type: ProbeType;
  question: string;
  student_response: string;
  expected_evidence: string;
  observed_evidence: string;
  result: EvidenceResult;
  confidence: number;
  ai_provider_used: string | null;
  created_at: string;
}

export const RESULT_CLASSIFICATIONS = [
  'STRONG_UNDERSTANDING',
  'UNDERSTANDING_DEMONSTRATED',
  'PARTIAL_UNDERSTANDING',
  'UNDERSTANDING_GAP',
  'INSUFFICIENT_EVIDENCE',
  'UNCERTAIN',
] as const;

export type ResultClassification = (typeof RESULT_CLASSIFICATIONS)[number];

export interface UnderstandingExecutionEvidence {
  ran: boolean;
  passed_tests: number;
  total_tests: number;
  runtime_ms?: number;
  stdout_excerpt?: string;
  stderr_excerpt?: string;
}

export interface ExistingCodeForgeAnalysis {
  complexity?: { time: string; space: string; dominant_operation?: string };
  quality?: { issues: string[]; score?: number };
  reasoningConsistency?: { consistent: boolean; notes?: string };
}

export interface UnderstandingRoleContext {
  role: 'backend' | 'frontend' | 'ml' | 'general' | string;
  dimensionEmphasis?: Partial<Record<UnderstandingDimension, number>>;
}

export interface StudentSubmission {
  id: string;
  student_id: string;
  challenge_id: string;
  problem_statement: string;
  constraints?: string;
  language: string;
  source_code: string;
  initial_explanation?: string;
  execution: UnderstandingExecutionEvidence;
  existingAnalysis?: ExistingCodeForgeAnalysis;
  role?: UnderstandingRoleContext;
}

export interface StateVariable {
  name: string;
  meaning: string;
  changes_when: string;
}

export interface MentalModel {
  problem_objective: string;
  constraints: string[];
  algorithm: string;
  algorithm_steps: string[];
  important_variables: StateVariable[];
  data_structures: string[];
  state_transitions: string[];
  control_flow_summary: string;
  candidate_invariants: string[];
  correctness_argument: string;
  complexity: { time: string; space: string; justification: string };
  tradeoffs: string[];
  relevant_edge_cases: string[];
  assumptions: string[];
  derivedFromExistingAnalysis: boolean;
}

export type AssessmentStatus = 'in_progress' | 'completed' | 'abandoned';

export interface UnderstandingProfile {
  assessment_id: string;
  student_id: string;
  challenge_id: string;
  status: AssessmentStatus;
  dimensions: Record<UnderstandingDimension, UnderstandingDimensionProfile>;
  procedural_score: number;
  conceptual_score: number;
  overall_confidence: number;
  overall_evidence_strength: EvidenceStrengthLabel;
  classification: ResultClassification;
  probes_asked: number;
  max_probes: number;
  created_at: string;
  updated_at: string;
}

export interface UnderstandingRecommendation {
  dimension: UnderstandingDimension;
  gap: string;
  recommendation: string;
}

export interface AssessmentReport {
  profile: UnderstandingProfile;
  summary: { demonstrated: string[]; uncertain: string[] };
  evidence: EvidenceItem[];
  recommendations: UnderstandingRecommendation[];
}

// ---------------------------------------------------------------------------
// Part 22: Debugging Mode
// ---------------------------------------------------------------------------
export type FailureClass =
  | 'RUNTIME_ERROR'
  | 'WRONG_ANSWER'
  | 'EDGE_CASE_FAILURE'
  | 'TIME_LIMIT'
  | 'MEMORY_LIMIT'
  | 'LOGIC_ERROR'
  | 'INTEGRATION_ERROR'
  | 'REGRESSION';

export const FAILURE_CLASSES: FailureClass[] = [
  'RUNTIME_ERROR',
  'WRONG_ANSWER',
  'EDGE_CASE_FAILURE',
  'TIME_LIMIT',
  'MEMORY_LIMIT',
  'LOGIC_ERROR',
  'INTEGRATION_ERROR',
  'REGRESSION',
];

export type SessionState =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'ROOT_CAUSE_IDENTIFIED'
  | 'FIX_ATTEMPTED'
  | 'RESOLVED'
  | 'FAILED'
  | 'ABANDONED';

export type DebuggingHypothesisStatus =
  | 'PROPOSED'
  | 'TESTING'
  | 'SUPPORTED'
  | 'REJECTED'
  | 'INCONCLUSIVE';

export type DebuggingResultStatus =
  | 'EXCELLENT_DEBUGGING'
  | 'STRONG_DEBUGGING'
  | 'DEVELOPING_DEBUGGING'
  | 'WEAK_DEBUGGING'
  | 'INSUFFICIENT_EVIDENCE';

export type DebugSupportedLanguage = 'python' | 'javascript';

export type DebugActionType =
  | 'RUN'
  | 'RUN_FAILING_TEST'
  | 'RUN_SELECTED_TEST'
  | 'RUN_FULL_SUITE'
  | 'INSPECT_OUTPUT'
  | 'INSPECT_VARIABLE'
  | 'INSPECT_TRACE'
  | 'ADD_DIAGNOSTIC'
  | 'CREATE_HYPOTHESIS'
  | 'REJECT_HYPOTHESIS'
  | 'ROOT_CAUSE_IDENTIFIED'
  | 'APPLY_CHANGE'
  | 'REVERT_CHANGE'
  | 'REQUEST_HINT'
  | 'SUBMIT_FIX';

export type SkillDimensionName =
  | 'FAILURE_RECOGNITION'
  | 'REPRODUCTION'
  | 'LOCALIZATION'
  | 'HYPOTHESIS_FORMATION'
  | 'EVIDENCE_GATHERING'
  | 'EXPERIMENT_DESIGN'
  | 'ROOT_CAUSE_ANALYSIS'
  | 'FIX_QUALITY'
  | 'REGRESSION_VERIFICATION'
  | 'DEBUGGING_EFFICIENCY';

export const SKILL_DIMENSIONS: SkillDimensionName[] = [
  'FAILURE_RECOGNITION',
  'REPRODUCTION',
  'LOCALIZATION',
  'HYPOTHESIS_FORMATION',
  'EVIDENCE_GATHERING',
  'EXPERIMENT_DESIGN',
  'ROOT_CAUSE_ANALYSIS',
  'FIX_QUALITY',
  'REGRESSION_VERIFICATION',
  'DEBUGGING_EFFICIENCY',
];

export interface RuntimeCapabilities {
  language: DebugSupportedLanguage;
  execution: boolean;
  stackTrace: boolean;
  structuredTrace: boolean;
  breakpoints: boolean;
  variableInspection: boolean;
  resourceMetrics: boolean;
}

export interface DebuggingSession {
  id: string;
  userId: string;
  challengeId: string;
  submissionId: string | null;
  language: DebugSupportedLanguage;
  state: SessionState;
  startedAt: string;
  endedAt: string | null;
  currentCode: string;
}

export type ReproductionStatus = 'NOT_ATTEMPTED' | 'REPRODUCED' | 'NOT_REPRODUCIBLE';

export interface DebugSourceLocation {
  file?: string;
  line?: number;
  function?: string;
}

export interface FailureFingerprint {
  id: string;
  sessionId: string;
  failureType: FailureClass;
  input: string | null;
  expectedOutput: string | null;
  actualOutput: string | null;
  errorMessage: string | null;
  stackTrace: string | null;
  sourceLocation: DebugSourceLocation | null;
  runtime: DebugSupportedLanguage;
  executionTimeMs: number | null;
  memoryUsageKB: number | null;
  reproductionStatus: ReproductionStatus;
  capturedAt: string;
}

export interface DebuggingHypothesis {
  id: string;
  sessionId: string;
  text: string;
  suspectedLocation: string | null;
  suspectedCause: string | null;
  confidence: number;
  status: DebuggingHypothesisStatus;
  createdAt: string;
  updatedAt: string;
}

export type ExperimentConclusion = 'SUPPORTED' | 'REJECTED' | 'INCONCLUSIVE';

export interface Experiment {
  id: string;
  sessionId: string;
  hypothesisId: string;
  action: string;
  expectedResult: string;
  actualResult: string | null;
  conclusion: ExperimentConclusion | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface DebugAction {
  id: string;
  sessionId: string;
  type: DebugActionType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type EvidenceRefType =
  | 'EXECUTION_TRACE'
  | 'VARIABLE_STATE'
  | 'FAILING_TEST'
  | 'CODE_LOCATION'
  | 'EXPERIMENT'
  | 'BEHAVIOR_COMPARISON';

export interface EvidenceRef {
  type: EvidenceRefType;
  ref: string;
}

export interface RootCauseChain {
  symptom: string;
  location: string;
  cause: string;
  rootCause: string;
  fix: string | null;
  supportingEvidence: EvidenceRef[];
}

export interface DebugTestOutcome {
  testId: string;
  visible: boolean;
  passed: boolean;
  input?: string;
  expected?: string;
  actual?: string;
  durationMs?: number;
}

export interface RegressionVerification {
  originalFailureFixed: boolean;
  relatedTestsPassed: boolean;
  hiddenTestsPassed: boolean;
  regressionTestsPassed: boolean;
  resourceTestsPassed: boolean;
  hiddenTestResults: DebugTestOutcome[];
  overallPass: boolean;
}

export interface OverfittingSignal {
  suspected: boolean;
  reasons: string[];
  visiblePassRate: number;
  hiddenPassRate: number;
}

export interface MinimalChangeAnalysis {
  filesChanged: string[];
  linesAdded: number;
  linesRemoved: number;
  changedOutsideSuspectedLocation: boolean;
}

export interface SkillDimensionScore {
  dimension: SkillDimensionName;
  score: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  evidence: string[];
  status: 'INSUFFICIENT_EVIDENCE' | 'SCORED';
}

export interface TimelineEvent {
  type: string;
  at: string;
  detail?: string;
}

export interface DebuggingReport {
  failureSummary: string;
  rootCauseSummary: string;
  processSummary: string;
  fixSummary: string;
  verificationSummary: string;
  strengths: string[];
  improvements: string[];
}

export interface DebuggingResult {
  sessionId: string;
  status: DebuggingResultStatus;
  dimensions: SkillDimensionScore[];
  rootCause: RootCauseChain | null;
  regression: RegressionVerification | null;
  overfitting: OverfittingSignal | null;
  report: DebuggingReport;
  timeline: TimelineEvent[];
  generatedAt: string;
}

export class InvalidStateTransitionError extends Error {
  constructor(from: SessionState, event: string) {
    super(`Invalid transition: cannot apply event "${event}" from state "${from}"`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class EvidenceRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvidenceRequiredError';
  }
}

// ---------------------------------------------------------------------------
// Part 23: Debugging Coach
// ---------------------------------------------------------------------------
export type CoachingPhase =
  | 'OBSERVATION'
  | 'HYPOTHESIS_FORMATION'
  | 'EVIDENCE_GATHERING'
  | 'ROOT_CAUSE'
  | 'FIX'
  | 'VERIFICATION'
  | 'COMPLETE'
  | 'STUCK';

export type NextBestActionType =
  | 'INSPECT_TRACE'
  | 'REPRODUCE'
  | 'INSPECT_OUTPUT'
  | 'FORM_HYPOTHESIS'
  | 'GATHER_EVIDENCE'
  | 'INSPECT_VARIABLE'
  | 'RUN_FAILING_TEST'
  | 'RUN_SELECTED_TEST'
  | 'RUN_FULL_SUITE'
  | 'ROOT_CAUSE_ANALYSIS'
  | 'APPLY_FIX'
  | 'VERIFY_FIX'
  | 'REVERT_CHANGE'
  | 'REQUEST_HINT'
  | 'ESCALATE';

export interface NextBestAction {
  actionType: NextBestActionType;
  priority: number;
  rationale: string;
  targetLocation?: string;
  coachingMessage: string;
  preconditions?: string[];
  expectedOutcome: string;
}

export interface CoachingProgressState {
  studentId: string;
  sessionId: string;
  phase: CoachingPhase;
  completedPhases: CoachingPhase[];
  stuckCounter: number;
  lastActionAt: string | null;
}

// ---------------------------------------------------------------------------
// Part 24: Code Review Mode
// ---------------------------------------------------------------------------
export type ReviewFindingSeverity = 'INFO' | 'MINOR' | 'MAJOR' | 'CRITICAL';
export type ReviewFindingCategory =
  | 'CORRECTNESS'
  | 'SECURITY'
  | 'PERFORMANCE'
  | 'MAINTAINABILITY'
  | 'STYLE'
  | 'TESTING'
  | 'DOCUMENTATION';
export type ReviewFindingStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'WONTFIX' | 'DISPUTED';
export type ReviewRelationshipType = 'RELATED' | 'DUPLICATE' | 'BLOCKS' | 'BLOCKED_BY' | 'SUPERSEDES';

export interface ReviewFinding {
  id: string;
  reviewId: string;
  ruleId: string;
  severity: ReviewFindingSeverity;
  category: ReviewFindingCategory;
  title: string;
  description: string;
  filePath: string | null;
  lineStart: number | null;
  lineEnd: number | null;
  status: ReviewFindingStatus;
  confidence: QualityConfidence;
  suggestedFix?: string;
  evidenceIds: string[];
  createdAt: string;
}

export interface ReviewRelationship {
  id: string;
  reviewId: string;
  fromFindingId: string;
  toFindingId: string;
  type: ReviewRelationshipType;
}

export interface CodeReviewReport {
  id: string;
  submissionId: string;
  language: SupportedLanguage;
  verdict: ReviewVerdict;
  summary: string;
  findings: ReviewFinding[];
  relationships: ReviewRelationship[];
  generatedAt: string;
}

export interface ReconciliationResponse {
  findingId: string;
  accepted: boolean;
  resolution: string;
  resolvedAt: string;
}

// ---------------------------------------------------------------------------
// Part 25: Adaptive Challenge Engine
// ---------------------------------------------------------------------------
export type AdaptiveSkillLevel =
  | 'UNKNOWN'
  | 'INTRODUCED'
  | 'DEVELOPING'
  | 'PRACTICED'
  | 'PROFICIENT'
  | 'MASTERED'
  | 'AT_RISK'
  | 'REGRESSING'
  | 'UNCERTAIN';

export type AdaptiveEvidenceOutcome = 'SUCCESS' | 'FAILURE' | 'PARTIAL';

export interface DifficultyDimensions {
  algorithm: number;
  implementation: number;
  reasoning: number;
  state: number;
  debugging: number;
  constraints: number;
  edgeCases: number;
  transfer: number;
}

export const DIFFICULTY_DIMENSION_KEYS: (keyof DifficultyDimensions)[] = [
  'algorithm',
  'implementation',
  'reasoning',
  'state',
  'debugging',
  'constraints',
  'edgeCases',
  'transfer',
];

export interface SkillEvidencePoint {
  skillId: string;
  timestamp: string;
  outcome: AdaptiveEvidenceOutcome;
  challengeId: string;
  challengeFamily?: string;
  transferGroup?: string;
  dimensionsExercised: Partial<DifficultyDimensions>;
  correctness?: number;
  reasoningScore?: number;
  consistencyScore?: number;
  understandingScore?: number;
  debuggingScore?: number;
  qualityScore?: number;
  hintsUsed?: number;
  attempts?: number;
  timeToSolveSeconds?: number;
}

export interface AdaptiveSkillState {
  skillId: string;
  level: AdaptiveSkillLevel;
  score: number;
  confidence: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';
  lastDemonstratedAt: string | null;
  evidenceCount: number;
  distinctContexts: number;
  rawRecencyScore: number;
  dampened: boolean;
}

export interface ChallengeMetadata {
  challengeId: string;
  topic: string;
  subtopics: string[];
  learningObjectives: string[];
  primarySkillId: string;
  supportingSkillIds: string[];
  difficulty: DifficultyDimensions;
  prerequisites: string[];
  targetRoles: string[];
  estimatedTimeMinutes: number;
  supportedLanguages: string[];
  challengeFamily: string;
  familyTier: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'TRANSFER';
  transferGroup: string;
  curriculumTags: string[];
  status: 'DRAFT' | 'VALIDATING' | 'ACTIVE' | 'DEGRADED' | 'RETIRED';
  isDiagnostic: boolean;
}

export interface ChallengeHealth {
  challengeId: string;
  attemptRate: number;
  completionRate: number;
  failureRate: number;
  avgSolveTimeSeconds: number;
  hintUsageRate: number;
  abandonmentRate: number;
  ambiguityFlagCount: number;
  qualityMultiplier: number;
  isFlaggedBroken: boolean;
}

export interface CompletedChallengeRecord {
  challengeId: string;
  challengeFamily: string;
  transferGroup: string;
  completedAt: string;
  outcome: AdaptiveEvidenceOutcome;
  reasonCompleted:
    | 'REMEDIATION'
    | 'REASSESSMENT'
    | 'MASTERY_CONFIRMATION'
    | 'SPACED_RETENTION'
    | 'ASSESSMENT_RETAKE'
    | 'STANDARD';
}

export interface ManualOverride {
  overrideId: string;
  scope: 'STUDENT' | 'COHORT';
  assignedChallengeId?: string;
  requiredCurriculumTags?: string[];
  instructorId: string;
  reason: string;
  expiresAt?: string;
}

export interface CurriculumConstraints {
  requiredCurriculumTags?: string[];
  requiredChallengeCount?: number;
  difficultyCeiling?: Partial<DifficultyDimensions>;
  allowedLanguages?: string[];
  assessmentWindow?: { start: string; end: string };
  order?: string[];
}

export type PathStage =
  | 'FOUNDATION'
  | 'PRACTICE'
  | 'VARIATION'
  | 'TRANSFER'
  | 'APPLICATION'
  | 'ADVANCED'
  | 'ROLE_ASSESSMENT';

export interface AdaptivePathEvent {
  stage: PathStage;
  enteredAt: string;
  reason: string;
  challengeId?: string;
}

export interface AdaptivePathState {
  studentId: string;
  currentStage: PathStage;
  history: AdaptivePathEvent[];
}

export interface StudentModel {
  studentId: string;
  targetRole: string | null;
  skills: Record<string, AdaptiveSkillState>;
  evidenceBySkill: Record<string, SkillEvidencePoint[]>;
  completedChallenges: CompletedChallengeRecord[];
  curriculumConstraints?: CurriculumConstraints;
  manualOverrides?: ManualOverride[];
  studentModelVersion: string;
}

export type SelectionMode = 'PRACTICE' | 'ASSESSMENT' | 'INTERVIEW';

export interface SelectionContext {
  mode: SelectionMode;
  language?: string;
  availableTimeMinutes?: number;
  requestedRepetitionReason?: CompletedChallengeRecord['reasonCompleted'];
  interviewStage?: string;
}

export interface SelectionObjectiveWeights {
  version: string;
  skillGapFit: number;
  uncertaintyReduction: number;
  learningValue: number;
  difficultyFit: number;
  roleRelevance: number;
  curriculumFit: number;
  prerequisiteFit: number;
  transferValue: number;
  retentionValue: number;
  novelty: number;
  estimatedTimeFit: number;
  challengeQuality: number;
  engagementFit: number;
}

export type PathIntent =
  | 'DIAGNOSTIC'
  | 'REMEDIATION'
  | 'REINFORCEMENT'
  | 'TRANSFER'
  | 'PROGRESSION'
  | 'RETENTION_CHECK'
  | 'ROLE_ASSESSMENT';

export interface CandidateScoreBreakdown {
  challengeId: string;
  totalScore: number;
  components: Record<keyof Omit<SelectionObjectiveWeights, 'version'>, number>;
}

export interface NextBestChallenge {
  challengeId: string;
  selectionReason: string;
  primaryLearningTarget: string;
  supportingTargets: string[];
  difficultyFit: number;
  uncertaintyValue: number;
  roleRelevance: number;
  confidence: number;
  selectorVersion: string;
  pathIntent: PathIntent;
}

export interface SelectionAuditRecord {
  studentId: string;
  studentModelVersion: string;
  selectorVersion: string;
  weightsVersion: string;
  candidateSet: string[];
  hardConstraintsApplied: string[];
  stageTrace: { stage: string; candidatesIn: number; candidatesOut: number }[];
  rankingFactors: CandidateScoreBreakdown[];
  selected: NextBestChallenge | null;
  noEligibleReason?: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Part 26: Skill Signal Intelligence (canonical evidence bus)
// ---------------------------------------------------------------------------
export type SignalStudentId = string;
export type SignalSkillId = string;
export type CorrelationId = string;

export enum SignalEvidenceType {
  CHALLENGE_RESULT = 'CHALLENGE_RESULT',
  CORRECTNESS_RESULT = 'CORRECTNESS_RESULT',
  COMPLEXITY_RESULT = 'COMPLEXITY_RESULT',
  QUALITY_RESULT = 'QUALITY_RESULT',
  REASONING_RESULT = 'REASONING_RESULT',
  DEBUGGING_RESULT = 'DEBUGGING_RESULT',
  UNDERSTANDING_RESULT = 'UNDERSTANDING_RESULT',
  TRANSFER_RESULT = 'TRANSFER_RESULT',
  ASSESSMENT_RESULT = 'ASSESSMENT_RESULT',
}

export enum SignalEvidenceStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  SUSPICIOUS = 'SUSPICIOUS',
  DISPUTED = 'DISPUTED',
  EXCLUDED = 'EXCLUDED',
}

export enum SignalAssessmentTier {
  PRACTICE = 'PRACTICE',
  ASSESSMENT = 'ASSESSMENT',
  INTERVIEW = 'INTERVIEW',
  PROJECT = 'PROJECT',
  DIAGNOSTIC = 'DIAGNOSTIC',
}

export enum SignalSkillState {
  UNKNOWN = 'UNKNOWN',
  INTRODUCED = 'INTRODUCED',
  DEVELOPING = 'DEVELOPING',
  PRACTICED = 'PRACTICED',
  PROFICIENT = 'PROFICIENT',
  MASTERED = 'MASTERED',
  AT_RISK = 'AT_RISK',
  REGRESSING = 'REGRESSING',
  UNCERTAIN = 'UNCERTAIN',
}

export enum SignalTrend {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  DECLINING = 'DECLINING',
  VOLATILE = 'VOLATILE',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
}

export enum SignalFreshness {
  RECENT = 'RECENT',
  AGING = 'AGING',
  STALE = 'STALE',
  VERY_STALE = 'VERY_STALE',
  UNKNOWN = 'UNKNOWN',
}

export interface RawEvidenceInput {
  sourceType: SignalEvidenceType;
  sourceId: string;
  studentId: SignalStudentId;
  skillIds: SignalSkillId[];
  payload: Record<string, unknown>;
  difficulty?: number;
  contextGroup?: string;
  assessmentTier?: SignalAssessmentTier;
  occurredAt: string;
  evidenceVersion?: number;
}

export interface NormalizedEvidence {
  evidenceId: string;
  sourceType: SignalEvidenceType;
  sourceId: string;
  studentId: SignalStudentId;
  skillId: SignalSkillId;
  rawValue: unknown;
  normalizedValue: number;
  status: SignalEvidenceStatus;
  difficulty: number;
  contextGroup: string;
  assessmentTier: SignalAssessmentTier;
  sourceReliability: number;
  independence: number;
  isTransfer: boolean;
  occurredAt: string;
  evidenceVersion: number;
  policyVersion: string;
}

export interface AggregationResult {
  skillId: SignalSkillId;
  studentId: SignalStudentId;
  policyVersion: string;
  evidenceCount: number;
  validEvidenceCount: number;
  weightedSignal: number;
  recentWeightedSignal: number | null;
  historicalWeightedSignal: number | null;
  diversity: number;
  distinctContexts: number;
  transferEvidenceCount: number;
  transferWeightedSignal: number | null;
  lastDemonstratedAt: string | null;
  firstObservedAt: string | null;
  avgSourceReliability: number;
  contradictionMagnitude: number;
  excludedCount: number;
}

export interface SkillSignal {
  skillId: SignalSkillId;
  studentId: SignalStudentId;
  signal: number;
  confidence: number;
  state: SignalSkillState;
  trend: SignalTrend;
  freshness: SignalFreshness;
  evidenceCount: number;
  diversity: number;
  transferConfidence: number;
  retention: number | null;
  lastDemonstratedAt: string | null;
  firstObservedAt: string | null;
  contradiction: boolean;
  modelVersion: string;
  policyVersion: string;
  updatedAt: string;
  version: number;
}

export interface SkillSignalHistoryPoint {
  skillId: SignalSkillId;
  studentId: SignalStudentId;
  signal: number;
  confidence: number;
  state: SignalSkillState;
  trend: SignalTrend;
  recordedAt: string;
  policyVersion: string;
}

export interface SkillSignalExplanation {
  skillId: SignalSkillId;
  studentId: SignalStudentId;
  summary: string;
  evidenceHighlights: string[];
  generatedAt: string;
}

export interface SignalAuditEvent {
  correlationId: CorrelationId;
  studentId: SignalStudentId | null;
  skillId: SignalSkillId | null;
  eventType:
    | 'evidence_received'
    | 'evidence_validated'
    | 'evidence_rejected'
    | 'evidence_deduplicated'
    | 'signal_created'
    | 'signal_updated'
    | 'state_changed'
    | 'confidence_changed'
    | 'trend_changed';
  details: Record<string, unknown>;
  occurredAt: string;
}

export interface SignalTechnicalProfile {
  studentId: SignalStudentId;
  skills: Record<SignalSkillId, SkillSignal>;
  strengths: SignalSkillId[];
  weaknesses: SignalSkillId[];
  uncertainties: SignalSkillId[];
  improving: SignalSkillId[];
  declining: SignalSkillId[];
  transferGaps: SignalSkillId[];
  retentionRisks: SignalSkillId[];
  overallConfidence: number;
  modelVersion: string;
  generatedAt: string;
}

export const SIGNAL_MODEL_VERSION = 'skill-signal-engine-v1';

// ---------------------------------------------------------------------------
// Part 27: Growth Intelligence (canonical growth engine)
// ---------------------------------------------------------------------------
export type GrowthEvidenceSource =
  | 'correctness'
  | 'complexity'
  | 'code_quality'
  | 'reasoning'
  | 'consistency'
  | 'understanding'
  | 'debugging'
  | 'adaptive_learning'
  | 'review';

export type GrowthEvidenceQuality =
  | 'DIRECT'
  | 'INDIRECT'
  | 'DETERMINISTIC'
  | 'INFERRED'
  | 'SELF_REPORTED'
  | 'AI_ASSISTED';

export type GrowthEvidenceOutcome = 'positive' | 'negative' | 'neutral';

export interface TransferContext {
  isTransferAttempt: boolean;
  baseContext?: string;
  novelContext?: string;
}

export interface GrowthSkillEvidence {
  evidenceId: string;
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
  transferContext?: TransferContext;
  metadata?: Record<string, unknown>;
  evidenceModelVersion: string;
}

export interface GrowthRawEvidenceInput {
  studentId: string;
  source: GrowthEvidenceSource;
  sourceRecordId: string;
  skillId: string;
  evidenceType: GrowthEvidenceQuality;
  outcome: GrowthEvidenceOutcome;
  strength: number;
  timestamp: string;
  challengeContext?: Record<string, unknown>;
  roleContext?: string;
  transferContext?: TransferContext;
  metadata?: Record<string, unknown>;
}

export type GrowthState =
  | 'NO_EVIDENCE'
  | 'EMERGING'
  | 'DEVELOPING'
  | 'PROFICIENT'
  | 'STRONG'
  | 'MASTERED'
  | 'REGRESSING'
  | 'AT_RISK'
  | 'STALE';

export interface GrowthSkillState {
  skillId: string;
  studentId: string;
  state: GrowthState;
  confidence: number;
  lastEvidenceAt: string | null;
  evidenceCount: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT';
  trajectory: number[];
  updatedAt: string;
}

export interface GrowthEvent {
  id: string;
  studentId: string;
  skillId: string;
  type: 'EVIDENCE_ADDED' | 'STATE_CHANGED' | 'MILESTONE_REACHED' | 'REGRESSION_DETECTED';
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface GrowthMilestone {
  id: string;
  studentId: string;
  skillId: string;
  type: 'FIRST_SUCCESS' | 'PROFICIENT' | 'STRONG' | 'MASTERED' | 'TRANSFER_SUCCESS' | 'RETENTION' | 'CONSISTENCY';
  reachedAt: string;
  metadata?: Record<string, unknown>;
}

export interface GrowthSnapshot {
  id: string;
  studentId: string;
  takenAt: string;
  skillStates: GrowthSkillState[];
  milestones: GrowthMilestone[];
  modelVersion: string;
}

// ---------------------------------------------------------------------------
// Part 28: Growth Tracking (variant A) — merged into canonical (Part 27)
// ---------------------------------------------------------------------------
export interface IndependenceMeasurement {
  skillId: string;
  independentSuccessCount: number;
  assistedSuccessCount: number;
  independenceRatio: number;
}

export interface TransferMeasurement {
  skillId: string;
  baseContextSuccessRate: number;
  novelContextSuccessRate: number;
  transferGap: number;
}

// ---------------------------------------------------------------------------
// Part 29: Growth Tracking (variant B) — merged into canonical (Part 27)
// ---------------------------------------------------------------------------
export type GrowthConfidence = 'INSUFFICIENT' | 'LOW' | 'MODERATE' | 'HIGH';

export type GrowthEvidenceType =
  | 'CHALLENGE_SUBMISSION'
  | 'ADAPTIVE_CHALLENGE'
  | 'ASSESSMENT'
  | 'DIAGNOSTIC'
  | 'DEBUGGING_TASK'
  | 'UNDERSTANDING_CHECK';

export type GrowthDifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type GrowthEvidenceDimension =
  | 'PERFORMANCE'
  | 'RETENTION'
  | 'TRANSFER'
  | 'UNDERSTANDING'
  | 'ROLE_SKILL';

export interface GrowthEvidenceRef {
  id: string;
  type: GrowthEvidenceType;
  skillId: string;
  observedAt: string;
  difficulty?: GrowthDifficultyLevel;
  isTransfer?: boolean;
  problemFamily?: string;
  dimension?: GrowthEvidenceDimension;
  demonstratesComplexityReasoning?: boolean;
  successful?: boolean;
}

export interface SkillObservation {
  skillId: string;
  skillName?: string;
  value: number;
  observedAt: string;
  evidence: GrowthEvidenceRef[];
  calculationVersion: string;
  assessmentType?: string;
  sourceType: 'DIAGNOSTIC' | 'ASSESSMENT' | 'AGGREGATED_SIGNAL';
  roleRelevance?: number;
}

export interface ComparabilityResult {
  comparable: boolean;
  reasons: string[];
}

export interface GrowthMeasurement {
  unavailable?: false;
  skillId: string;
  baselineValue: number;
  currentValue: number;
  absoluteChange: number;
  relativeChange: number | null;
  confidence: GrowthConfidence;
  evidenceCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
}

export interface GrowthUnavailable {
  unavailable: true;
  skillId: string;
  reasons: string[];
}

export type GrowthResult = GrowthMeasurement | GrowthUnavailable;

export function isGrowthAvailable(g: GrowthResult): g is GrowthMeasurement {
  return !g.unavailable;
}

// ---------------------------------------------------------------------------
// Part 30: Role Skill Gap Analysis
// ---------------------------------------------------------------------------
export type RoleGapStatus =
  | 'BELOW_TARGET'
  | 'PARTIAL'
  | 'MEETS_TARGET'
  | 'EXCEEDS_TARGET'
  | 'UNKNOWN';

export type RoleGapSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RoleGapPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RoleSkillGap {
  skillId: string;
  skillName: string;
  currentLevel: string;
  targetLevel: string;
  status: RoleGapStatus;
  magnitude: number;
  confidence: number;
  severity: RoleGapSeverity;
  priority: RoleGapPriority;
  dependencyBlocked: boolean;
  rootGap: boolean;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT';
  explanation: string;
}

export interface RoleSkillGapProfile {
  studentId: string;
  roleId: string;
  roleVersion: number;
  gaps: RoleSkillGap[];
  overallReadiness: number;
  generatedAt: string;
  modelVersion: string;
}

// ---------------------------------------------------------------------------
// Part 31: Role Readiness Engine
// ---------------------------------------------------------------------------
export type ReadinessState31 =
  | 'NOT_READY'
  | 'DEVELOPING'
  | 'APPROACHING_READY'
  | 'READY'
  | 'STRONG';

export interface ReadinessBlocker {
  skillId: string;
  skillName: string;
  reason: string;
  currentMastery: number;
  targetMastery: number;
  evidenceCount: number;
}

export interface ReadinessResult {
  studentId: string;
  roleId: string;
  readinessState: ReadinessState31;
  overallScore: number;
  blockers: ReadinessBlocker[];
  strengths: string[];
  confidence: number;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Part 32: AI Gateway (control plane types)
// ---------------------------------------------------------------------------
export type GatewayOperation =
  | 'hint_ladder.next_hint'
  | 'code_coach.explain_error'
  | 'debugging_coach.next_action'
  | 'understanding.probe'
  | 'quality.interpret'
  | 'review.findings'
  | 'growth.insight'
  | 'gap.explain'
  | 'readiness.explain';

export type GatewayProvider = 'groq' | 'gemini' | 'anthropic' | 'mock';

export type ResilienceState = 'HEALTHY' | 'DEGRADED' | 'OPEN' | 'RECOVERY_CHECK';

export interface GatewayRequest {
  operation: GatewayOperation;
  provider?: GatewayProvider;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  correlationId: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
}

export interface GatewayResponse {
  requestId: string;
  provider: GatewayProvider;
  model: string;
  content: string;
  latencyMs: number;
  cost: number;
  cacheHit: boolean;
  resilienceState: ResilienceState;
  degraded: boolean;
}

// ============================================================================
// Part 33&37: PrepVista Integration
// ============================================================================

export type IntegrationType = 'PREPVISTA';

export type IntegrationStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'ERROR'
  | 'DISCONNECTED'
  | 'ARCHIVED';

export type CredentialType =
  | 'API_KEY'
  | 'WEBHOOK_SECRET'
  | 'OAUTH_TOKEN'
  | 'OAUTH_REFRESH_TOKEN'
  | 'CLIENT_SECRET'
  | 'CERTIFICATE'
  | 'JWT_SIGNING_KEY'
  | 'SHARED_SECRET';

export type CredentialStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ROTATING' | 'FAILED';

export type MappingStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'REVOKED';

export type IdentityMappingMethod =
  | 'EXTERNAL_ID'
  | 'VERIFIED_EMAIL'
  | 'MANUAL'
  | 'OAUTH_LINK'
  | 'BULK_IMPORT';

export type SharingScope =
  | 'MINIMAL'
  | 'STANDARD'
  | 'DETAILED'
  | 'FULL';

export type SyncJobType =
  | 'INITIAL'
  | 'INCREMENTAL'
  | 'FULL_RESYNC'
  | 'SINGLE_STUDENT'
  | 'RECONCILIATION';

export type SyncScope =
  | 'ALL_STUDENTS'
  | 'ACTIVE_STUDENTS'
  | 'SELECTED_STUDENTS'
  | 'NEW_STUDENTS_ONLY'
  | 'CHANGED_STUDENTS_ONLY';

export type SyncJobStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type SyncAction = 'CREATED' | 'UPDATED' | 'DELETED' | 'NO_CHANGE' | 'ERROR';

export type SyncRecordStatus =
  | 'PENDING'
  | 'SYNCED'
  | 'FAILED'
  | 'SKIPPED'
  | 'CONFLICT';

export type EventSource = 'WEBHOOK' | 'SYNC' | 'MANUAL' | 'SCHEDULED';

export type EventStatus = 'QUEUED' | 'DELIVERED' | 'FAILED' | 'DEAD_LETTER' | 'RETRYING';

export type IntegrationErrorCategory =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'VALIDATION'
  | 'NETWORK'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'DATA_MISMATCH'
  | 'CONFIGURATION'
  | 'UNKNOWN';

export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ErrorStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';

export type AuditActorType = 'SYSTEM' | 'USER' | 'WEBHOOK' | 'SCHEDULER';

export interface IntegrationConfig {
  webhookUrl: string;
  apiBaseUrl?: string;
  apiVersion?: string;
  timeoutMs?: number;
  retryPolicy?: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
}

export interface Integration {
  id: string;
  collegeId: string;
  name: string;
  type: IntegrationType;
  externalId: string | null;
  config: IntegrationConfig;
  status: IntegrationStatus;
  lastSyncAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IntegrationCredential {
  id: string;
  integrationId: string;
  name: string;
  type: CredentialType;
  valueEncrypted: string;
  status: CredentialStatus;
  expiresAt: Date | null;
  rotatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMapping {
  id: string;
  integrationId: string;
  codeforgeCollegeId: string;
  externalOrgId: string;
  externalOrgName: string | null;
  status: MappingStatus;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IdentityMapping {
  id: string;
  integrationId: string;
  codeforgeStudentId: string;
  externalStudentId: string;
  externalEmail: string | null;
  method: IdentityMappingMethod;
  status: MappingStatus;
  conflictId: string | null;
  mappedBy: string | null;
  mappedAt: Date;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  revokeReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SharingPolicy {
  id: string;
  integrationId: string;
  name: string;
  description: string | null;
  scopes: SharingScope[];
  defaultScope: SharingScope;
  studentOptIn: boolean;
  autoApprove: boolean;
  retentionDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncJob {
  id: string;
  integrationId: string;
  type: SyncJobType;
  scope: SyncScope;
  status: SyncJobStatus;
  studentIds: string[];
  triggeredBy: string;
  idempotencyKey: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  totalStudents: number;
  processedStudents: number;
  failedStudents: number;
  errorSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncRecord {
  id: string;
  syncJobId: string;
  studentId: string;
  resourceType: string;
  resourceId: string;
  action: SyncAction;
  status: SyncRecordStatus;
  externalId: string | null;
  error: string | null;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationEvent {
  id: string;
  integrationId: string;
  eventType: string;
  payload: Record<string, unknown>;
  studentId: string | null;
  idempotencyKey: string;
  status: EventStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  error: string | null;
  source: EventSource;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  id: string;
  integrationId: string;
  eventId: string;
  url: string;
  requestPayload: Record<string, unknown>;
  requestHeaders: Record<string, string>;
  responseStatus: number | null;
  responseBody: string | null;
  responseHeaders: Record<string, string> | null;
  durationMs: number | null;
  success: boolean;
  error: string | null;
  attemptNumber: number;
  createdAt: Date;
}

export interface IntegrationError {
  id: string;
  integrationId: string;
  category: IntegrationErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details: Record<string, unknown> | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: ErrorStatus;
  occurredAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  createdAt: Date;
}

export interface IntegrationAudit {
  id: string;
  integrationId: string;
  action: string;
  actorType: AuditActorType;
  actorId: string | null;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// Technical Profile (from @prepvista/shared)
export interface TechnicalProfile {
  studentId: string;
  externalStudentId: string | null;
  profile: {
    skills: Array<{
      skillId: string;
      skillName: string;
      proficiencyLevel: number;
      evidenceCount: number;
      lastAssessedAt: Date;
    }>;
    assessments: Array<{
      assessmentId: string;
      type: string;
      score: number;
      completedAt: Date;
    }>;
    projects: Array<{
      projectId: string;
      name: string;
      technologies: string[];
      role: string;
      completedAt: Date;
    }>;
    readiness: Array<{
      roleId: string;
      roleName: string;
      readinessScore: number;
      gaps: string[];
    }>;
    generatedAt: Date;
    schemaVersion: string;
  };
  sharingPolicy: {
    scope: SharingScope;
    studentOptIn: boolean;
    autoApprove: boolean;
  };
}

export interface IntegrationHealth {
  integrationId: string;
  overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  connection: {
    status: 'OK' | 'FAIL';
    latencyMs: number | null;
    lastChecked: Date;
    error: string | null;
  };
  identityMapping: {
    total: number;
    verified: number;
    pending: number;
    failed: number;
  };
  sync: {
    lastSyncAt: Date | null;
    lastSyncStatus: SyncJobStatus | null;
    pendingJobs: number;
    failedJobsLast24h: number;
  };
  eventDelivery: {
    queued: number;
    failed: number;
    deadLetter: number;
    avgDeliveryMs: number | null;
  };
  credentials: {
    active: number;
    expiringSoon: number;
    expired: number;
  };
}

// Input types
export interface CreateIntegrationInput {
  collegeId: string;
  name: string;
  type: IntegrationType;
  externalId?: string;
  config: IntegrationConfig;
}

export interface UpdateIntegrationInput {
  name?: string;
  externalId?: string | null;
  config?: Partial<IntegrationConfig>;
  status?: IntegrationStatus;
}

export interface CredentialInput {
  name: string;
  type: CredentialType;
  value: string;
  expiresAt?: Date | null;
}

export interface OrganizationMappingInput {
  codeforgeCollegeId: string;
  externalOrgId: string;
  externalOrgName?: string;
}

export interface IdentityMappingInput {
  codeforgeStudentId: string;
  externalStudentId: string;
  externalEmail?: string;
  method: IdentityMappingMethod;
}

export interface SharingPolicyInput {
  name: string;
  description?: string;
  scopes: SharingScope[];
  defaultScope: SharingScope;
  studentOptIn: boolean;
  autoApprove: boolean;
  retentionDays: number;
}

export interface SyncJobInput {
  integrationId: string;
  type: SyncJobType;
  scope: SyncScope;
  studentIds: string[];
  triggeredBy: string;
  idempotencyKey?: string;
}

export interface EventDeliveryResult {
  success: boolean;
  statusCode: number | null;
  responseBody: string | null;
  error: string | null;
  errorCategory: IntegrationErrorCategory | null;
  durationMs: number;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ studentId: string; error: string }>;
}

// ============================================================================
// Part 35: Technical Interview Integration
// ============================================================================

export const INTERVIEW_MODES = [
  "TECHNICAL_SCREENING",
  "PROJECT_DEFENSE",
  "CODE_DEFENSE",
  "SKILL_VERIFICATION",
  "DEEP_TECHNICAL",
  "DEBUGGING_INTERVIEW",
  "ARCHITECTURE_INTERVIEW",
  "SCENARIO_INTERVIEW",
  "GAP_VERIFICATION",
] as const;
export type InterviewMode = (typeof INTERVIEW_MODES)[number];

export const SESSION_STATES = [
  "CREATED",
  "READY",
  "IN_PROGRESS",
  "PAUSED",
  "RESUMED",
  "COMPLETED",
  "EVALUATION_PENDING",
  "EVALUATION_FAILED",
  "CANCELLED",
] as const;
export type InterviewSessionState = (typeof SESSION_STATES)[number];

export const EVIDENCE_STATES = [
  "VERIFIED",
  "PARTIALLY_VERIFIED",
  "UNCERTAIN",
  "UNASSESSED",
] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export const CONFIDENCE_BANDS = ["LOW", "MODERATE", "HIGH"] as const;
export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[number];

export const SKILL_COVERAGE_STATES = [
  "UNASSESSED",
  "PARTIALLY_ASSESSED",
  "SUFFICIENTLY_ASSESSED",
] as const;
export type SkillCoverageState = (typeof SKILL_COVERAGE_STATES)[number];

export const ANSWER_QUALITIES = [
  "CORRECT",
  "MOSTLY_CORRECT",
  "PARTIALLY_CORRECT",
  "INCORRECT",
  "INSUFFICIENT",
  "DONT_KNOW",
] as const;
export type AnswerQuality = (typeof ANSWER_QUALITIES)[number];

export const CONSISTENCY_CLASSIFICATIONS = [
  "CONSISTENT",
  "PARTIALLY_CONSISTENT",
  "UNCERTAIN",
  "POTENTIAL_INCONSISTENCY",
] as const;
export type ConsistencyClassification = (typeof CONSISTENCY_CLASSIFICATIONS)[number];

export const QUESTION_TYPES = [
  "CONCEPTUAL",
  "APPLIED",
  "CODE_BASED",
  "PROJECT_BASED",
  "DEBUGGING",
  "ARCHITECTURE",
  "SCENARIO",
  "TRADE_OFF",
  "VERIFICATION",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const DEPTH_LEVELS = [
  "DEFINITION",
  "APPLICATION",
  "REASONING",
  "TRADE_OFF",
  "FAILURE_SCENARIO",
] as const;
export type DepthLevel = (typeof DEPTH_LEVELS)[number];

export const FOLLOW_UP_REASONS = [
  "DEEPER",
  "CLARIFICATION",
  "VERIFICATION",
  "EVIDENCE_CHECK",
] as const;
export type FollowUpReason = (typeof FOLLOW_UP_REASONS)[number];

export const SKILL_IMPORTANCE = ["CORE", "IMPORTANT", "SUPPORTING", "OPTIONAL"] as const;
export type SkillImportance = (typeof SKILL_IMPORTANCE)[number];

export const DIFFICULTY_LEVELS = ["EASY", "MEDIUM", "HARD"] as const;
export type InterviewDifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const EVALUATION_DIMENSIONS = [
  "TECHNICAL_CORRECTNESS",
  "REASONING_QUALITY",
  "UNDERSTANDING",
  "DEPTH",
  "APPLICATION",
  "CONSISTENCY",
  "COMMUNICATION_CLARITY",
] as const;
export type EvaluationDimension = (typeof EVALUATION_DIMENSIONS)[number];

/** §9 role skill requirement, sourced from the existing Role-Based Skill Model — never invented locally. */
export interface RoleSkillRequirement {
  skill: string;
  importance: SkillImportance;
  expectedDifficulty: InterviewDifficultyLevel;
  dependsOn?: string[];
}

export interface RoleSkillRequirements {
  role: string;
  skills: RoleSkillRequirement[];
}

/** §10 candidate evidence — only sources that actually exist are populated; everything else is simply absent. */
export interface EvidenceArtifactRef {
  sourceType:
    | "CODING_SUBMISSION"
    | "PROJECT_SUBMISSION"
    | "CODE_QUALITY"
    | "DEBUGGING_EVIDENCE"
    | "REASONING_EVIDENCE"
    | "UNDERSTANDING_EVIDENCE"
    | "SKILL_SNAPSHOT"
    | "SKILL_SIGNAL"
    | "ROLE_SKILL_GAP"
    | "PREVIOUS_INTERVIEW";
  artifactId: string;
  skill: string;
  summary: string;
  /** Raw content Feature 35 is allowed to ground questions in (e.g. actual function source). Optional — not every source carries inspectable content. */
  content?: string;
  capturedAt: string;
}

export interface CandidateEvidenceBundle {
  candidateId: string;
  /** Keyed by skill so question selection can look up "what do we already know about SQL" in O(1). */
  bySkill: Record<string, EvidenceArtifactRef[]>;
}

export interface TechnicalInterviewBlueprint {
  id: string;
  orgId: string;
  version: number;
  targetRole: string;
  mode: InterviewMode;
  difficulty: InterviewDifficultyLevel | "ADAPTIVE";
  targetSkills: RoleSkillRequirement[];
  evidenceSourcesUsed: EvidenceArtifactRef["sourceType"][];
  questionStrategy: {
    prioritizeUncertainty: boolean;
    diversityWindow: number; // §13 avoid repeating same skill/type back-to-back within this window
  };
  followUpStrategy: {
    maxDepthPerTopic: number; // caps §27 progressive-depth ladder so it can't loop forever
    maxFollowUpsPerQuestion: number;
  };
  coverageRules: {
    sufficientEvidenceThreshold: ConfidenceBand; // a skill is SUFFICIENTLY_ASSESSED once it reaches at least this band
    minQuestionsPerCoreSkill: number;
  };
  evaluationRules: {
    dimensions: EvaluationDimension[];
  };
  timeConfig: {
    maxQuestions: number;
    maxDurationMinutes: number;
  };
  createdBy: string;
  createdAt: string;
}

export interface TechnicalInterviewQuestion {
  id: string;
  sessionId: string;
  sequenceNumber: number;
  questionType: QuestionType;
  skill: string;
  difficulty: InterviewDifficultyLevel;
  depthLevel: DepthLevel;
  promptText: string;
  /** §14/§19/§20 — a question grounded in real evidence must say which artifact it's grounded in. Absent only for pure CONCEPTUAL questions with no candidate-specific grounding available. */
  evidenceRef?: { sourceType: EvidenceArtifactRef["sourceType"]; artifactId: string };
  generatedBy: "AI" | "BANK";
  parentQuestionId?: string; // set when this question is a follow-up
  followUpReason?: FollowUpReason;
}

export interface InterviewResponse {
  id: string;
  sessionId: string;
  questionId: string;
  candidateId: string;
  responseText: string;
  submittedAt: string;
  idempotencyKey: string;
}

export interface StructuredEvaluation {
  id: string;
  responseId: string;
  evaluationVersion: number;
  answerQuality: AnswerQuality;
  consistency: ConsistencyClassification;
  dimensions: Partial<Record<EvaluationDimension, "STRONG" | "ADEQUATE" | "WEAK" | "NOT_APPLICABLE">>;
  evidenceConfidence: ConfidenceBand;
  /** Short, grounded, human-readable rationale. Never exposes hidden scoring rules to the candidate (§18). */
  rationaleSummary: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  /** True only when the AI grounded its evaluation in supplied context; false triggers a required re-check rather than being trusted (§44). */
  grounded: boolean;
}

export interface SkillEvidenceRecord {
  skill: string;
  evidenceState: EvidenceState;
  confidence: ConfidenceBand;
  supportingEvaluationIds: string[];
}

export interface InterviewCoverageReport {
  requiredSkills: string[];
  perSkill: Record<string, SkillCoverageState>;
  sufficientlyAssessed: string[];
  partiallyAssessed: string[];
  unassessed: string[];
  /** §29 — the report itself says plainly whether coverage was complete; never silently reported as full when it wasn't. */
  isComplete: boolean;
}

export interface TechnicalInterviewSession {
  id: string;
  orgId: string;
  blueprintId: string;
  blueprintVersion: number;
  candidateId: string;
  state: InterviewSessionState;
  currentQuestionId: string | null;
  startedAt: string | null;
  pausedAt: string | null;
  resumedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantContext {
  orgId: string;
  actorId: string;
  actorRole: "CANDIDATE" | "STAFF" | "SYSTEM";
}

// ============================================================================
// Part 36: College Cohort Technical Intelligence
// ============================================================================

export type CohortKind =
  | 'ACADEMIC'
  | 'DEPARTMENT'
  | 'TRAINING'
  | 'ROLE'
  | 'PLACEMENT'
  | 'CUSTOM';

export type CohortDimension =
  | 'ACADEMIC_YEAR'
  | 'BATCH'
  | 'DEPARTMENT'
  | 'DEGREE'
  | 'BRANCH'
  | 'SECTION'
  | 'GRADUATION_YEAR'
  | 'PLACEMENT_CYCLE'
  | 'TRAINING_PROGRAM'
  | 'ROLE_TRACK'
  | 'CUSTOM';

export type CohortMasteryLevel =
  | 'NOT_ASSESSED'
  | 'EMERGING'
  | 'DEVELOPING'
  | 'PROFICIENT'
  | 'STRONG';

export type EvidenceCoverageState =
  | 'INSUFFICIENT'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export type CoverageState = EvidenceCoverageState;

export interface CoverageResult {
  eligibleStudents: number;
  studentsWithEvidence: number;
  studentsWithoutEvidence: number;
  coveragePct: number;
  coverageState: CoverageState;
}

export type TrendDirection =
  | 'IMPROVING'
  | 'STABLE'
  | 'DECLINING'
  | 'INSUFFICIENT_EVIDENCE';

export type CohortReadinessState =
  | 'READY'
  | 'NEAR_READY'
  | 'DEVELOPING'
  | 'NEEDS_SIGNIFICANT_PREPARATION'
  | 'INSUFFICIENT_EVIDENCE';

export type GapPriority =
  | 'HIGH'
  | 'MODERATE'
  | 'EMERGING'
  | 'INSUFFICIENT_EVIDENCE';

export type IntelligenceEventType =
  | 'ASSESSMENT_COMPLETED'
  | 'INTERVIEW_COMPLETED'
  | 'SKILL_EVIDENCE_UPDATED'
  | 'PROJECT_EVALUATED';

export type IntelligenceEventStatus =
  | 'PENDING'
  | 'PROCESSED'
  | 'FAILED';

export enum Role36 {
  ORG_ADMIN = 'ORG_ADMIN',
  DEPARTMENT_ADMIN = 'DEPARTMENT_ADMIN',
  TPO = 'TPO',
  TRAINER = 'TRAINER',
  STUDENT = 'STUDENT',
}

export type InterventionCategory =
  | 'NEEDS_FOUNDATION_SUPPORT'
  | 'NEEDS_PRACTICE'
  | 'NEEDS_ADVANCED_CHALLENGES'
  | 'NEEDS_INTERVIEW_VERIFICATION'
  | 'NEEDS_ROLE_SPECIFIC_PREPARATION';

export type FreshnessState =
  | 'UPDATED_RECENTLY'
  | 'UPDATING'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'INSUFFICIENT_DATA';

export interface AuthContext36 {
  userId: string;
  organizationId: string;
  role: Role36;
}

export interface Cohort {
  id: string;
  organizationId: string;
  name: string;
  kind: CohortKind;
  dimension: CohortDimension;
  parentCohortId: string | null;
  attributes: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  id: string;
  organizationId: string;
  cohortId: string;
  studentId: string;
  joinedAt: Date;
  leftAt: Date | null;
  isActive: boolean;
}

export interface SkillAggregate {
  id: string;
  organizationId: string;
  cohortId: string;
  skillId: string;
  skillName: string;
  eligibleStudents: number;
  studentsWithEvidence: number;
  coveragePct: number;
  coverageState: EvidenceCoverageState;
  distribution: Record<CohortMasteryLevel, number>;
  dominantLevel: CohortMasteryLevel | null;
  trend: TrendDirection;
  confidence: number;
  sourceVersion: string;
  computedAt: Date;
}

export interface RequiredSkillGap {
  skillId: string;
  skillName: string;
  gapPriority: GapPriority;
}

export interface RoleAggregate {
  id: string;
  organizationId: string;
  cohortId: string;
  roleId: string;
  roleName: string;
  eligibleStudents: number;
  studentsWithEvidence: number;
  coveragePct: number;
  coverageState: EvidenceCoverageState;
  readinessDistribution: Record<CohortReadinessState, number>;
  requiredSkillGaps: RequiredSkillGap[];
  trend: TrendDirection;
  confidence: number;
  sourceVersion: string;
  computedAt: Date;
}

export interface TrainingInsight {
  id: string;
  organizationId: string;
  cohortId: string;
  skillId?: string;
  roleId?: string;
  label: string;
  gapPriority: GapPriority;
  interventionCategories: InterventionCategory[];
  affectedStudents: number;
  rationale: string[];
  priorityRank: number;
  sourceVersion: string;
  computedAt: Date;
}

export interface CohortSnapshotRecord {
  id: string;
  organizationId?: string;
  cohortId: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  payload: unknown;
  scoringMethodologyVersion: string;
  createdAt: string;
}

export interface AuditEntry36 {
  id: string;
  organizationId: string;
  actorUserId: string;
  actorRole: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface PrivacyPolicyRecord {
  organizationId: string;
  minCohortSize: number;
  minCoverageForClaim: number;
}

export interface FreshnessInfo {
  state: FreshnessState;
  lastUpdated: Date | null;
  dataWindow?: string;
}

export interface CohortExecutiveOverview {
  strongestAreas: string[];
  priorityGaps: Array<{ skillId: string; roleId: string; priority: GapPriority }>;
  highestImpactRoleGap: { roleId: string; gapCount: number } | null;
  trainingPriorities: Array<{ skillId: string; label: string; gapPriority: GapPriority; priorityRank: number }>;
  evidenceCoverageSummary: CoverageResult;
  observedGrowth: Array<{ skillId: string; trend: TrendDirection }>;
  restricted: boolean;
}

export interface CohortSkillAggregate {
  cohortId: string;
  skillId: string;
  distribution: Record<CohortMasteryLevel, number>;
  dominantLevel: CohortMasteryLevel;
  trend: TrendDirection;
  coveragePct: number;
  coverageState: CoverageState;
  confidence: number;
  sourceVersion: string | number;
  computedAt: string;
}

export interface CohortRoleAggregate {
  cohortId: string;
  roleId: string;
  readinessDistribution: Record<CohortReadinessState, number>;
  requiredSkillGaps: Array<{ skillId: string; priority: GapPriority; affectedStudents: number }>;
  trend: { direction: TrendDirection; deltaPct: number };
  coverage: { eligibleStudents: number; studentsWithEvidence: number };
  computedAt: string;
}

export interface CohortTrainingInsight {
  cohortId: string;
  skillId: string;
  label: string;
  gapPriority: GapPriority;
  interventionCategories: InterventionCategory[];
  affectedStudents: number;
  rationale: string[];
  priorityRank: number;
  computedAt: string;
}

// Integration ports types (from src/integrations/ports.ts)
export interface StudentSkillSignal {
  studentId: string;
  skillId: string;
  masteryLevel: CohortMasteryLevel;
}

export interface StudentRoleReadiness {
  studentId: string;
  roleId: string;
  readiness: CohortReadinessState;
}

export interface StudentGrowthSample {
  studentId: string;
  skillId: string;
  periodLabel: string;
  value: number;
}

export interface RecommendedAction {
  skillId: string;
  action: string;
  trainingImpactPotential: number; // 0-1
}

// Port interfaces
export interface SkillSignalPort {
  listKnownSkills(organizationId: string): Promise<string[]>;
  getSkillSignalsForStudents(organizationId: string, studentIds: string[], skillIds: string[]): Promise<StudentSkillSignal[]>;
}

export interface RoleReadinessPort {
  listSupportedRoles(organizationId: string): Promise<string[]>;
  getRoleReadinessForStudents(organizationId: string, studentIds: string[], roleIds: string[]): Promise<StudentRoleReadiness[]>;
}

export interface GrowthTrackingPort {
  getGrowthSamples(organizationId: string, studentIds: string[], skillId: string, periodLabels: string[]): Promise<StudentGrowthSample[]>;
}

export interface NextBestActionPort {
  getRecommendedFocusAreas(organizationId: string, studentIds: string[]): Promise<RecommendedAction[]>;
}

export interface CodeForgeIntelligencePorts {
  skillSignal: SkillSignalPort;
  roleReadiness: RoleReadinessPort;
  growthTracking: GrowthTrackingPort;
  nextBestAction: NextBestActionPort;
}

// ============================================================================
// Part 38: Technical Mastery Report
// ============================================================================

export enum MasteryLevel38 {
  FOUNDATIONAL = "FOUNDATIONAL",
  DEVELOPING = "DEVELOPING",
  COMPETENT = "COMPETENT",
  PROFICIENT = "PROFICIENT",
  ADVANCED = "ADVANCED",
  EXPERT = "EXPERT",
}

export const MASTERY_LEVEL_ORDER: MasteryLevel38[] = [
  MasteryLevel38.FOUNDATIONAL,
  MasteryLevel38.DEVELOPING,
  MasteryLevel38.COMPETENT,
  MasteryLevel38.PROFICIENT,
  MasteryLevel38.ADVANCED,
  MasteryLevel38.EXPERT,
];

export enum EvidenceState38 {
  OBSERVED = "OBSERVED",
  INFERRED = "INFERRED",
  ESTIMATED = "ESTIMATED",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
  UNAVAILABLE = "UNAVAILABLE",
}

export enum SkillTrend38 {
  UP = "UP",
  STABLE = "STABLE",
  DOWN = "DOWN",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
}

export enum EvidenceStrength {
  STRONG = "STRONG",
  MODERATE = "MODERATE",
  LIMITED = "LIMITED",
  NONE = "NONE",
}

export enum GapStatus38 {
  ON_TRACK = "ON_TRACK",
  GAP = "GAP",
  BLOCKING_GAP = "BLOCKING_GAP",
  NOT_APPLICABLE = "NOT_APPLICABLE",
}

export enum RoleReadinessLevel38 {
  READY = "READY",
  NEAR_READY = "NEAR_READY",
  DEVELOPING = "DEVELOPING",
  NOT_READY = "NOT_READY",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
}

export enum ReportLifecycleStatus {
  REQUESTED = "REQUESTED",
  QUEUED = "QUEUED",
  GENERATING = "GENERATING",
  VALIDATING = "VALIDATING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum ReportFreshnessStatus {
  UP_TO_DATE = "UP_TO_DATE",
  STALE = "STALE",
  GENERATING = "GENERATING",
  FAILED = "FAILED",
  UNAVAILABLE = "UNAVAILABLE",
}

export enum UserRole38 {
  STUDENT = "STUDENT",
  TRAINER = "TRAINER",
  TPO = "TPO",
  INSTITUTION_ADMIN = "INSTITUTION_ADMIN",
  ADMIN = "ADMIN",
}

export enum ReportType38 {
  STUDENT_TECHNICAL_MASTERY = "STUDENT_TECHNICAL_MASTERY",
}

export enum ReportAuditAction {
  GENERATED = "GENERATED",
  VIEWED = "VIEWED",
  DOWNLOADED = "DOWNLOADED",
  SHARED = "SHARED",
  REVOKED = "REVOKED",
  REGENERATED = "REGENERATED",
}

export const REPORT_SCHEMA_VERSION = "1.0.0";

export interface SkillMasteryEntry {
  skillId: string;
  skillName: string;
  masteryLevel: MasteryLevel38;
  trend: SkillTrend38;
  evidenceStrength: EvidenceStrength;
  evidenceCount: number;
  lastEvaluatedAt: string;
  roleRelevance: string[];
  gapStatus: GapStatus38;
}

export interface RoleReadinessEntry {
  roleId: string;
  roleName: string;
  readiness: RoleReadinessLevel38;
  readyAreas: string[];
  developingAreas: string[];
  blockingGaps: string[];
}

export interface SkillGapEntry {
  skillId: string;
  skillName: string;
  roleId: string;
  roleName: string;
  currentState: MasteryLevel38;
  expectedState: MasteryLevel38;
  gap: string;
  evidenceRefs: string[];
  roleImpact: string;
  recommendedAction: string;
}

export interface NextBestActionEntry {
  action: string;
  why: string;
  relatedSkill: string | null;
  roleImpact: string | null;
  priority: number;
}

export interface CodingPerformance {
  correctness: string | null;
  efficiency: string | null;
  complexity: string | null;
  codeQuality: string | null;
  problemSolving: string | null;
  evidenceState: EvidenceState38;
  sampleCount: number;
  lastEvaluatedAt: string | null;
}

export interface DebuggingEvidence {
  capability: string | null;
  commonWeakness: string | null;
  trend: SkillTrend38 | null;
  evidenceState: EvidenceState38;
}

export interface ReportReasoningEvidence {
  reasoningNote: string | null;
  understandingNote: string | null;
  evidenceState: EvidenceState38;
}

export interface ProjectEvidenceEntry {
  projectId: string;
  projectName: string;
  skillsDemonstrated: string[];
  technicalDepth: string;
  relevantRole: string | null;
  evidenceState: EvidenceState38;
}

export interface InterviewEvidenceEntry {
  interviewId: string;
  interviewName: string;
  outcome: string;
  evaluatedSkills: string[];
  evidenceState: EvidenceState38;
  occurredAt: string;
}

export interface GrowthEvent {
  skillName: string;
  occurredAt: string;
  fromLevel: MasteryLevel38;
  toLevel: MasteryLevel38;
  note: string | null;
}

export interface Growth {
  timeline: GrowthEvent[];
  fastestImproving: string[];
  stable: string[];
  persistentGaps: string[];
  recentlyImproved: string[];
  insufficientData: boolean;
}

export interface Strength {
  title: string;
  evidenceRefs: string[];
  skill: string;
  roleRelevance: string[];
}

export interface Weakness {
  title: string;
  evidenceRefs: string[];
  impact: string;
  recommendedAction: string;
}

export interface Narrative {
  executiveSummary: string;
  strengthsNarrative: string;
  weaknessesNarrative: string;
  growthNarrative: string;
  source: "ai" | "fallback";
  validated: boolean;
}

export interface TechnicalMasteryReportDto {
  metadata: {
    reportId: string;
    reportType: ReportType38;
    schemaVersion: string;
    sourceDataVersion: number;
    generatedAt: string;
    generatedById: string;
    status: ReportLifecycleStatus;
  };
  identity: {
    studentId: string;
    studentName: string;
  };
  organization: {
    orgId: string;
    orgName: string;
  };
  summary: {
    overallMastery: MasteryLevel38 | null;
    targetRole: string | null;
    roleReadiness: RoleReadinessLevel38 | null;
    strongestAreas: string[];
    criticalGaps: string[];
    recentGrowthHighlight: string | null;
    nextBestAction: string | null;
  };
  mastery: {
    overallLevel: MasteryLevel38 | null;
  };
  skills: SkillMasteryEntry[];
  roles: RoleReadinessEntry[];
  gaps: SkillGapEntry[];
  evidence: {
    coding: CodingPerformance | null;
    debugging: DebuggingEvidence | null;
    reasoning: ReportReasoningEvidence | null;
    projects: ProjectEvidenceEntry[];
    interviews: InterviewEvidenceEntry[];
  };
  growth: Growth;
  strengths: Strength[];
  weaknesses: Weakness[];
  recommendations: NextBestActionEntry[];
  narrative: Narrative;
  freshness: ReportFreshnessStatus;
}

// Port interfaces for Part 38
export interface IdentityPort {
  getStudent(studentId: string): Promise<{ id: string; name: string; orgId: string } | null>;
  getOrganization(orgId: string): Promise<{ id: string; name: string } | null>;
  canUserAccessStudent(userId: string, userRole: UserRole38, studentId: string, studentOrgId: string): Promise<boolean>;
}

export interface DataVersionPort {
  getCurrentSourceDataVersion(studentId: string): Promise<number>;
}

export interface MasterySystemPort {
  getOverallMastery(studentId: string): Promise<MasteryLevel38 | null>;
  getSkillMasteryMap(studentId: string): Promise<SkillMasteryEntry[]>;
}

export interface RoleReadinessPort38 {
  getTargetRoles(studentId: string): Promise<string[]>;
  getRoleReadiness(studentId: string, roleId: string): Promise<RoleReadinessEntry | null>;
}

export interface SkillGapPort {
  getRoleSkillGaps(studentId: string, roleId: string): Promise<SkillGapEntry[]>;
}

export interface GrowthTrackingPort38 {
  getGrowthTimeline(studentId: string): Promise<GrowthEvent[]>;
  getGrowthInsights(studentId: string): Promise<Growth>;
}

export interface NextBestActionPort38 {
  getNextBestActions(studentId: string): Promise<NextBestActionEntry[]>;
}

export interface CodingEvidencePort {
  getCodingPerformance(studentId: string): Promise<CodingPerformance | null>;
  getDebuggingEvidence(studentId: string): Promise<DebuggingEvidence | null>;
  getReasoningEvidence(studentId: string): Promise<ReportReasoningEvidence | null>;
}

export interface ProjectEvidencePort {
  getProjectEvidence(studentId: string): Promise<ProjectEvidenceEntry[]>;
}

export interface InterviewEvidencePort {
  getInterviewEvidence(studentId: string): Promise<InterviewEvidenceEntry[]>;
}

export interface CodeForgeIntelligencePorts38 {
  identity: IdentityPort;
  dataVersion: DataVersionPort;
  masterySystem: MasterySystemPort;
  roleReadiness: RoleReadinessPort38;
  skillGap: SkillGapPort;
  growthTracking: GrowthTrackingPort38;
  nextBestAction: NextBestActionPort38;
  codingEvidence: CodingEvidencePort;
  projectEvidence: ProjectEvidencePort;
  interviewEvidence: InterviewEvidencePort;
}

// ============================================================================
// Part 39: AI Gateway (AI Cost & Performance Controls)
// ============================================================================

export enum ModelCapability {
  GENERAL = 'GENERAL',
  FAST = 'FAST',
  REASONING = 'REASONING',
  CODING = 'CODING',
  LONG_CONTEXT = 'LONG_CONTEXT',
  EMBEDDING = 'EMBEDDING',
  STRUCTURED_OUTPUT = 'STRUCTURED_OUTPUT',
  STREAMING = 'STREAMING',
}

export enum ModelStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  DISABLED = 'DISABLED',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum ProviderHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNAVAILABLE = 'UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  DISABLED = 'DISABLED',
}

export enum GatewayTaskType {
  INTERVIEW_ANALYSIS = 'INTERVIEW_ANALYSIS',
  CODE_ANALYSIS = 'CODE_ANALYSIS',
  TECHNICAL_COACHING = 'TECHNICAL_COACHING',
  REPORT_GENERATION = 'REPORT_GENERATION',
  RECOMMENDATION = 'RECOMMENDATION',
  CLASSIFICATION = 'CLASSIFICATION',
  EMBEDDING = 'EMBEDDING',
  BACKGROUND_PROCESSING = 'BACKGROUND_PROCESSING',
  GENERIC = 'GENERIC',
}

export enum GatewayPriority {
  INTERACTIVE = 'INTERACTIVE',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  BACKGROUND = 'BACKGROUND',
  BULK = 'BULK',
}

export enum GatewayErrorCategory {
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  INVALID_REQUEST = 'INVALID_REQUEST',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTENT_VALIDATION = 'CONTENT_VALIDATION',
  POLICY_REJECTION = 'POLICY_REJECTION',
  BUDGET_LIMIT = 'BUDGET_LIMIT',
  QUOTA_LIMIT = 'QUOTA_LIMIT',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  UNKNOWN = 'UNKNOWN',
}

export const RETRYABLE_ERROR_CATEGORIES: ReadonlySet<GatewayErrorCategory> = new Set([
  GatewayErrorCategory.TIMEOUT,
  GatewayErrorCategory.NETWORK_ERROR,
  GatewayErrorCategory.PROVIDER_ERROR,
  GatewayErrorCategory.RATE_LIMIT,
]);

export enum CostBasis {
  ACTUAL = 'ACTUAL',
  ESTIMATED = 'ESTIMATED',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum RequestStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  FALLBACK = 'FALLBACK',
  CACHED = 'CACHED',
  BLOCKED = 'BLOCKED',
  DEGRADED = 'DEGRADED',
}

export enum CacheScope {
  NONE = 'NONE',
  USER = 'USER',
  TENANT = 'TENANT',
  GLOBAL = 'GLOBAL',
}

export enum Role39 {
  STUDENT = 'STUDENT',
  TRAINER = 'TRAINER',
  TPO = 'TPO',
  ORG_ADMIN = 'ORG_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  ENGINEERING_OPERATOR = 'ENGINEERING_OPERATOR',
}

export const DASHBOARD_ROLES: ReadonlySet<Role39> = new Set([
  Role39.ORG_ADMIN,
  Role39.PLATFORM_ADMIN,
  Role39.ENGINEERING_OPERATOR,
]);

export const CONFIG_WRITE_ROLES: ReadonlySet<Role39> = new Set([
  Role39.PLATFORM_ADMIN,
  Role39.ENGINEERING_OPERATOR,
]);

export const EMERGENCY_ROLES: ReadonlySet<Role39> = new Set([
  Role39.PLATFORM_ADMIN,
  Role39.ENGINEERING_OPERATOR,
]);

export interface AuthContext39 {
  userId: string;
  organizationId: string;
  role: Role39;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ModelPricing {
  inputPricePerMTok: number;
  outputPricePerMTok: number;
  pricingVersion: number;
  pricingAsOf: string;
  pricingSource: string;
}

export interface ModelDescriptor {
  id: string;
  provider: string;
  modelKey: string;
  family: string;
  capabilities: ModelCapability[];
  contextWindow: number;
  maxOutputTokens: number;
  status: ModelStatus;
  pricing: ModelPricing;
  observedAvgLatencyMs?: number;
}

export interface ProviderMetadata {
  name: string;
  capabilities: ModelCapability[];
  supportsStreaming: boolean;
  requiresApiKey: boolean;
  hasApiKeyConfigured: boolean;
}

export interface ProviderHealth {
  provider: string;
  status: ProviderHealthStatus;
  checkedAt: string;
  detail?: string;
}

export interface AIRequestContext {
  requestId: string;
  organizationId: string;
  userId?: string;
  feature: string;
  task: GatewayTaskType;
  priority: GatewayPriority;
  requiredCapabilities: ModelCapability[];
  qualityRequirement?: 'STANDARD' | 'HIGH';
  maxCostUsd?: number;
  maxLatencyMs?: number;
  idempotencyKey?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxOutputTokens?: number;
  cacheScope?: CacheScope;
}

export enum RoutingReason {
  PREFERRED_MODEL = 'PREFERRED_MODEL',
  CAPABILITY_MATCH = 'CAPABILITY_MATCH',
  COST_CONSTRAINT = 'COST_CONSTRAINT',
  LATENCY_REQUIREMENT = 'LATENCY_REQUIREMENT',
  FALLBACK = 'FALLBACK',
  PROVIDER_HEALTH = 'PROVIDER_HEALTH',
  EXPERIMENT_ASSIGNMENT = 'EXPERIMENT_ASSIGNMENT',
  NO_ELIGIBLE_MODEL = 'NO_ELIGIBLE_MODEL',
}

export interface RoutingDecision {
  model: ModelDescriptor | null;
  reasons: RoutingReason[];
  candidatesConsidered: string[];
  fallbackChain: string[];
}

// Budget & Quota types
export type BudgetScope = 'GLOBAL' | 'ORGANIZATION' | 'FEATURE' | 'USER';
export type BudgetPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface BudgetLimit {
  scope: BudgetScope;
  scopeId: string;
  period: BudgetPeriod;
  limitUsd: number;
  warningThresholdPct?: number;
  hardLimit: boolean;
}

export interface QuotaLimit {
  scope: 'USER' | 'ORGANIZATION' | 'FEATURE' | 'TASK';
  scopeId: string;
  period: BudgetPeriod;
  limit: number;
}

// Policy types
export type PolicyScope = 'GLOBAL' | 'ORGANIZATION' | 'FEATURE' | 'TASK';

export interface Policy {
  id: string;
  scope: PolicyScope;
  scopeId: string;
  version: number;
  preferredModel?: string;
  allowedModels?: string[];
  allowedProviders?: string[];
  fallbackModels?: string[];
  maxCostUsd?: number;
  maxLatencyMs?: number;
  cacheScope?: CacheScope;
  requireGrounding?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AIProviderAdapter {
  name: string;
  generate(request: AIRequestContext): Promise<AIProviderResponse>;
  stream(request: AIRequestContext): AsyncIterable<AIProviderStreamChunk>;
  embed(texts: string[]): Promise<number[][]>;
  healthCheck(): Promise<ProviderHealth>;
  getMetadata(): ProviderMetadata;
}

export interface AIProviderResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  finishReason: string;
}

export interface AIProviderStreamChunk {
  content: string;
  done: boolean;
  usage?: TokenUsage;
}

// Circuit breaker types
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerState {
  provider: string;
  model: string;
  state: CircuitState;
  failureCount: number;
  lastFailureAt: number | null;
  nextAttemptAt: number | null;
}

// Rate limiting
export interface RateLimitConfig {
  capacity: number;
  refillRate: number; // tokens per second
  keyPrefix: string;
}

// Emergency controls
export type EmergencyAction =
  | 'KILL_SWITCH'
  | 'DISABLE_PROVIDER'
  | 'ENABLE_PROVIDER'
  | 'DISABLE_TASK'
  | 'ENABLE_TASK'
  | 'OVERRIDE_CONCURRENCY'
  | 'BULK_PAUSE';

export interface EmergencyControlState {
  killSwitch: boolean;
  disabledProviders: string[];
  disabledTasks: string[];
  concurrencyOverrides: Record<string, number>;
  bulkPaused: boolean;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// Part 40: Security, Audit & Reliability
// ============================================================================

export const ROLES_40 = ["STUDENT", "TRAINER", "TPO", "ADMIN", "PLATFORM_OPERATOR"] as const;
export type Role40 = (typeof ROLES_40)[number];

/** Ascending privilege order. Index comparison is used for "at least role X" checks. */
export const ROLE_HIERARCHY_40: readonly Role40[] = ["STUDENT", "TRAINER", "TPO", "ADMIN", "PLATFORM_OPERATOR"];

export function roleRank40(role: Role40): number {
  return ROLE_HIERARCHY_40.indexOf(role);
}

export function roleAtLeast40(role: Role40, minimum: Role40): boolean {
  return roleRank40(role) >= roleRank40(minimum);
}

export const PERMISSIONS_40 = [
  // Own-scope (every authenticated role has these on their own data)
  "self:read",
  "self:submit_code",

  // Trainer-scope
  "students:read:assigned",
  "reports:read:trainer",

  // TPO / organization-scope
  "organization:manage",
  "students:read:organization",
  "students:write:organization",
  "reports:read:organization",

  // Admin-scope (org-level platform administration)
  "organization:admin",
  "security:config:write",
  "ai:config:write",
  "rate_limits:write",
  "budgets:write",
  "audit:read:organization",
  "security_events:read:organization",
  "incidents:read:organization",

  // Platform-operator-scope (cross-tenant, platform-wide)
  "audit:read:platform",
  "security_events:read:platform",
  "incidents:manage:platform",
  "alerts:manage:platform",
  "service_health:read:platform",
  "sessions:revoke:any",
  "feature_flags:write",
  "platform:admin"
] as const;
export type Permission40 = (typeof PERMISSIONS_40)[number];

export const ROLE_PERMISSIONS_40: Record<Role40, readonly Permission40[]> = {
  STUDENT: ["self:read", "self:submit_code"],
  TRAINER: ["self:read", "self:submit_code", "students:read:assigned", "reports:read:trainer"],
  TPO: [
    "self:read",
    "students:read:assigned",
    "reports:read:trainer",
    "organization:manage",
    "students:read:organization",
    "students:write:organization",
    "reports:read:organization"
  ],
  ADMIN: [
    "self:read",
    "students:read:assigned",
    "reports:read:trainer",
    "organization:manage",
    "students:read:organization",
    "students:write:organization",
    "reports:read:organization",
    "organization:admin",
    "security:config:write",
    "ai:config:write",
    "rate_limits:write",
    "budgets:write",
    "audit:read:organization",
    "security_events:read:organization",
    "incidents:read:organization"
  ],
  PLATFORM_OPERATOR: [
    ...([] as Permission40[]),
    "self:read",
    "organization:admin",
    "security:config:write",
    "ai:config:write",
    "rate_limits:write",
    "budgets:write",
    "audit:read:organization",
    "security_events:read:organization",
    "incidents:read:organization",
    "audit:read:platform",
    "security_events:read:platform",
    "incidents:manage:platform",
    "alerts:manage:platform",
    "service_health:read:platform",
    "sessions:revoke:any",
    "feature_flags:write",
    "platform:admin"
  ]
};

export function roleHasPermission40(role: Role40, permission: Permission40): boolean {
  return ROLE_PERMISSIONS_40[role].includes(permission);
}

export interface IdentityContext40 {
  userId: string;
  organizationId: string | null; // null only for platform-operator identities with no home org
  role: Role40;
  sessionId: string | null; // present when app-level session tracking is active for this token
  authTime: number; // unix seconds — when the credential was originally issued
  correlationId: string;
}

// Security Event Types
export const SECURITY_EVENT_TYPES = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGOUT",
  "PASSWORD_CHANGE",
  "PASSWORD_RESET_REQUESTED",
  "SESSION_REVOKED",
  "ROLE_CHANGE",
  "PERMISSION_CHANGE",
  "SECURITY_CONFIGURATION_CHANGE",
  "ADMIN_ACTION",
  "AUTHORIZATION_DENIED",
  "TENANT_ISOLATION_VIOLATION",
  "RATE_LIMIT_EXCEEDED",
  "SUSPICIOUS_ACTIVITY",
  "INPUT_VALIDATION_FAILURE"
] as const;
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export const EVENT_RESULTS = ["SUCCESS", "DENIED", "ERROR"] as const;
export type EventResult = (typeof EVENT_RESULTS)[number];

export const ALERT_SEVERITIES = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_SEVERITY_MEANING: Record<AlertSeverity, string> = {
  INFO: "Expected background signal, no action implied.",
  LOW: "Worth surfacing on a dashboard; no paging.",
  MEDIUM: "An operator should look at this within the working day.",
  HIGH: "An operator should look at this soon; may indicate active abuse.",
  CRITICAL: "Actively harmful or platform-wide; auto-opens an incident."
};

export const ALERT_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const INCIDENT_STATUSES = ["OPEN", "INVESTIGATING", "MITIGATING", "MONITORING", "RESOLVED"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_TIMELINE_PHASES = [
  "DETECTION",
  "ALERT",
  "INVESTIGATION",
  "MITIGATION",
  "RECOVERY",
  "RESOLUTION",
  "NOTE"
] as const;
export type IncidentTimelinePhase = (typeof INCIDENT_TIMELINE_PHASES)[number];

export const SERVICE_HEALTH_STATUSES = ["HEALTHY", "DEGRADED", "UNAVAILABLE"] as const;
export type ServiceHealthStatus = (typeof SERVICE_HEALTH_STATUSES)[number];

export const SESSION_STATUSES = ["ACTIVE", "EXPIRED", "REVOKED", "SUSPENDED"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** A conservative allow-list of JSON-safe metadata. Never put secrets or raw PII here. */
export type SafeMetadata = Record<string, string | number | boolean | null>;

export interface SecurityEvent {
  id: string;
  organizationId: string | null;
  userId: string | null;
  type: SecurityEventType;
  result: EventResult;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string;
  metadata: SafeMetadata;
  createdAt: string;
}

export interface SecurityAlert {
  id: string;
  organizationId: string | null;
  type: SecurityEventType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  correlationKey: string;
  firstSeenAt: string;
  lastSeenAt: string;
  count: number;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformIncident {
  id: string;
  organizationId: string | null;
  status: IncidentStatus;
  severity: AlertSeverity;
  title: string;
  description: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface IncidentTimelineEvent {
  id: string;
  incidentId: string;
  phase: IncidentTimelinePhase;
  actorId: string;
  note: string;
  metadata: SafeMetadata;
  createdAt: string;
}

export interface ServiceHealthSnapshot {
  id: string;
  dependency: string;
  status: ServiceHealthStatus;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
}

export interface AppSession {
  id: string;
  userId: string;
  organizationId: string;
  refreshTokenHash: string;
  status: SessionStatus;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  organizationId: string;
  actorId: string;
  actorRole: Role40;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: EventResult;
  correlationId: string;
  metadata: SafeMetadata;
  createdAt: string;
}
