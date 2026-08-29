/**
 * CodeForge AI — Unified Configuration
 *
 * All tunable thresholds, weights, and parameters for the entire platform.
 * Consolidates configs from Parts 1-15. Changing values here changes system
 * behavior without touching algorithm implementations.
 */

import type {
  DifficultyLevel,
  AssistanceLevel,
  ReadinessState,
  Priority,
  MasteryLevel,
  GapType,
  GapStatus,
  Verdict,
  SupportedLanguage,
  ISO8601,
} from '../domain/types.js';

// ============================================================================
// MASTERY CONFIGURATION (Parts 5, 9)
// ============================================================================

export const MASTERY_CONFIG = {
  // Exponential recency decay half-life, in days. Evidence this many days
  // old contributes half the weight of fresh evidence. Evidence is never
  // deleted — only its influence on the live score decays.
  recencyHalfLifeDays: 21,

  // Linear map from a challenge's 1-10 difficultyScore to a weight
  // multiplier applied to that piece of evidence.
  difficultyWeightMin: 0.7,
  difficultyWeightMax: 1.5,

  // Independence multipliers by assistance level — independent
  // performance counts more than assisted performance.
  independenceMultiplier: {
    NONE: 1.0,
    HINT: 0.75,
    SOLUTION_VIEWED: 0.4,
  } as Record<AssistanceLevel, number>,

  // If the same mistakeCategory appears in at least this fraction of the
  // last `repeatedMistakeWindow` pieces of evidence, apply a penalty.
  repeatedMistakeWindow: 3,
  repeatedMistakeThresholdFraction: 0.6,
  repeatedMistakePenalty: 0.85,

  // Prerequisite gating: if a required prerequisite skill is still at or
  // below this mastery level, the dependent skill is BLOCKED regardless
  // of its own evidence.
  prerequisiteGateThreshold: 2, // COMPETENT (0-indexed: NOVICE=0, DEVELOPING=1, COMPETENT=2)

  // Stale detection: if a skill hasn't received new evidence in this many
  // days, its mastery state decays toward STALE.
  staleThresholdDays: 30,

  // MASTERED verification gates (ALL must be true):
  verifiedRequiresIndependent: true,    // at least one independent success
  verifiedRequiresTransfer: true,       // at least one NOVEL-context success
  verifiedRequiresHighStakes: true,     // at least one VERIFICATION-context success
} as const;

// ============================================================================
// GAP DETECTION CONFIGURATION (Parts 5, 9)
// ============================================================================

export const GAP_CONFIG = {
  // Minimum evidence count before we classify a skill as anything other
  // than INSUFFICIENT_EVIDENCE.
  insufficientEvidenceMinCount: 3,

  // Transfer gap: student does fine on STANDARD-context but struggles on
  // NOVEL-context for the same skill.
  transferGapMinStandardScore: 0.7,   // >= 70% on standard
  transferGapMaxNovelScore: 0.4,      // <= 40% on novel

  // Critical gap threshold — above this severity, skill is CRITICAL_GAP.
  criticalGapThreshold: 0.8,
} as const;

// ============================================================================
// DIFFICULTY ADAPTATION CONFIGURATION (Parts 3, 5)
// ============================================================================

export const DIFFICULTY_CONFIG = {
  levels: ['EASY', 'MEDIUM', 'HARD', 'ADVANCED'] as DifficultyLevel[],

  // Consecutive independent successes at current level before stepping up.
  consecutiveSuccessesToIncrease: 2,

  // Consecutive failures (rawScore < 0.5) before stepping down into recovery.
  consecutiveFailuresToDecrease: 2,

  // When in RECOVER mode, must achieve a fresh independent success at the
  // lower level before re-advancing.
  recoveryRequiresSuccessAtLower: true,
} as const;

// ============================================================================
// RANKING WEIGHTS (Part 5, 3)
// ============================================================================

export const RANKING_CONFIG = {
  weights: {
    // Primary gap severity (0-1) - how weak is the target skill?
    gap: 0.30,

    // Role priority for this skill (0-1) - how important for student's role?
    role: 0.15,

    // Difficulty fit (0-1) - how close is challenge to target difficulty?
    difficultyFit: 0.20,

    // Freshness (0-1) - penalty for recently attempted challenges.
    freshness: 0.12,

    // Diversity (0-1) - bonus for targeting different skills recently.
    diversity: 0.08,

    // Quality (0-1) - challenge's historical pass rate / analytics.
    quality: 0.05,

    // Goal boost (0-1) - e.g., DSA_MASTERY or PLACEMENT_PREPARATION goals.
    goal: 0.05,

    // Transfer gap bonus (0-1) - prefer NOVEL-context challenges for transfer gaps.
    transfer: 0.03,

    // Spaced review bonus (0-1) - skills due for review get a boost.
    review: 0.02,
  },
} as const;

// ============================================================================
// SCHEDULER CONFIGURATION (Part 6)
// ============================================================================

export const SCHEDULER_CONFIG = {
  maxDailyMinutes: 120,
  maxSessionMinutes: 60,
  minBreakMinutes: 10,
  preferredSessionLengthMinutes: 45,
  spacedReviewIntervalDays: 7,
} as const;

// ============================================================================
// READINESS BANDS (Part 6)
// ============================================================================

export const READINESS_CONFIG = {
  bands: [
    { max: 0.10, state: 'NOT_STARTED' as ReadinessState },
    { max: 0.35, state: 'FOUNDATION_BUILDING' as ReadinessState },
    { max: 0.60, state: 'DEVELOPING' as ReadinessState },
    { max: 0.80, state: 'APPROACHING_READY' as ReadinessState },
    { max: 0.95, state: 'READY' as ReadinessState },
    { max: 1.00, state: 'STRONG' as ReadinessState },
  ],
} as const;

// ============================================================================
// PRIORITY CONFIGURATION (Part 6)
// ============================================================================

export const PRIORITY_CONFIG = {
  weights: {
    role: 0.25,
    gap: 0.30,
    block: 0.20,
    required: 0.10,
    urgency: 0.10,
    trend: 0.05,
  },
  urgencyBaselineDays: 30,
  tierWeight: {
    LOW: 0.25,
    MEDIUM: 0.50,
    HIGH: 0.75,
    VERY_HIGH: 1.0,
    CRITICAL: 1.0,
  } as Record<Priority, number>,
  gapSeverityWeight: {
    COMPLETE: 0.0,
    DEVELOPING: 0.4,
    GAP: 0.7,
    CRITICAL_GAP: 1.0,
    UNKNOWN: 0.5,
    INSUFFICIENT_EVIDENCE: 0.55,
    BLOCKED: 0.0,
    TRANSFER_GAP: 0.75,
    PREREQUISITE_GAP: 0.8,
  } as Record<GapStatus, number>,
} as const;

// ============================================================================
// EXECUTION LIMITS (Parts 3, 4, 12, 13)
// ============================================================================

export interface ExecutionLimitConfig {
  wallTimeMs: number;
  cpuTimeSec: number;
  memoryKB: number;
  heapMB: number;
  outputLimitBytes: number;
}

export const EXECUTION_LIMITS: ExecutionLimitConfig = {
  wallTimeMs: 5000,
  cpuTimeSec: 4,
  memoryKB: 256 * 1024,  // 256 MB
  heapMB: 256,           // Node.js heap limit
  outputLimitBytes: 64 * 1024, // 64 KB stdout/stderr cap
};

// Language-specific overrides
export const LANGUAGE_EXECUTION_LIMITS: Partial<Record<SupportedLanguage, ExecutionLimitConfig>> = {
  python: {
    wallTimeMs: 8000,
    cpuTimeSec: 6,
    memoryKB: 512 * 1024,
    heapMB: 256,
    outputLimitBytes: 64 * 1024,
  },
  javascript: {
    wallTimeMs: 5000,
    cpuTimeSec: 4,
    memoryKB: 256 * 1024,
    heapMB: 256,
    outputLimitBytes: 64 * 1024,
  },
  typescript: {
    wallTimeMs: 8000,
    cpuTimeSec: 6,
    memoryKB: 384 * 1024,
    heapMB: 384,
    outputLimitBytes: 64 * 1024,
  },
  java: {
    wallTimeMs: 10000,
    cpuTimeSec: 8,
    memoryKB: 512 * 1024,
    heapMB: 256,
    outputLimitBytes: 64 * 1024,
  },
  cpp: {
    wallTimeMs: 5000,
    cpuTimeSec: 4,
    memoryKB: 256 * 1024,
    heapMB: 256,
    outputLimitBytes: 64 * 1024,
  },
  go: {
    wallTimeMs: 5000,
    cpuTimeSec: 4,
    memoryKB: 256 * 1024,
    heapMB: 256,
    outputLimitBytes: 64 * 1024,
  },
  rust: {
    wallTimeMs: 10000,
    cpuTimeSec: 8,
    memoryKB: 512 * 1024,
    heapMB: 256,
    outputLimitBytes: 64 * 1024,
  },
};

// ============================================================================
// RATE LIMITS (Parts 4, 12, 14, 15)
// ============================================================================

export const RATE_LIMITS = {
  submissionsPerMinute: 10,
  hintsPerMinute: 5,
  coachMessagesPerMinute: 20,
  apiCallsPerMinute: 100,
  diagnosticTasksPerMinute: 3,
  interviewActionsPerMinute: 15,
  incidentActionsPerMinute: 20,
  projectSubmissionsPerHour: 5,
} as const;

// ============================================================================
// AI PROVIDER CONFIGURATION (Parts 3, 4, 8, 9, 10, 14, 15)
// ============================================================================

export const AI_CONFIG = {
  providers: [
    { provider: 'anthropic' as const, model: 'claude-sonnet-4-6', timeoutMs: 30000 },
    { provider: 'groq' as const, model: 'llama-3.3-70b-versatile', timeoutMs: 20000 },
    { provider: 'gemini' as const, model: 'gemini-1.5-pro', timeoutMs: 30000 },
  ],
  fallbackOrder: ['anthropic', 'groq', 'gemini'],
  maxRetries: 2,
  // AI responsibilities that are actually wired to live calls:
  // - Failure diagnosis (Part 4, 14)
  // - Feedback generation (Part 4, 14)
  // - Explanation evaluation (Part 13, 14)
  // - Complexity reasoning refinement (Part 3, 14)
  // - Hint generation (Part 15)
  // - Coaching commentary (Part 14)
  // - Challenge generation pipeline (Part 3)
  // - Interview follow-up questions (Part 8)
  // - Incident hypothesis generation (Part 11)
  // - Project rubric evaluation (Part 10)
  enabledResponsibilities: [
    'diagnosis',
    'feedback',
    'explanation_evaluation',
    'complexity_reasoning',
    'hint_generation',
    'coaching',
    'challenge_generation',
    'interview_followup',
    'incident_hypothesis',
    'project_evaluation',
  ],
} as const satisfies {
  readonly providers: readonly { readonly provider: 'anthropic' | 'groq' | 'gemini'; readonly model: string; readonly timeoutMs: number }[];
  readonly fallbackOrder: readonly string[];
  readonly maxRetries: number;
  readonly enabledResponsibilities: readonly string[];
};

// ============================================================================
// DIAGNOSTIC CONFIGURATION (Part 2)
// ============================================================================

export const DIAGNOSTIC_CONFIG = {
  adaptivePolicyVersion: 'heuristic-v1',
  evaluationLogicVersion: 'eval-logic-v1',
  minTasks: 5,
  maxTasks: 15,
  confidenceThreshold: 0.75,
  heavyHintThreshold: 3,
} as const;

// ============================================================================
// INTERVIEW CONFIGURATION (Part 8)
// ============================================================================

export const INTERVIEW_CONFIG = {
  defaultDurationMinutes: 60,
  maxHintsPerProblem: 3,
  hintLevels: ['NONE', 'CLARIFICATION', 'CONCEPTUAL_DIRECTION', 'STRONG_DIRECTION', 'NEAR_SOLUTION'] as const,
  allowSolutionView: false,
  scoringDimensions: [
    'problem_solving',
    'communication',
    'code_quality',
    'testing',
    'debugging',
  ],
  dimensionWeights: {
    problem_solving: 0.30,
    communication: 0.20,
    code_quality: 0.20,
    testing: 0.15,
    debugging: 0.15,
  },
  passThreshold: 0.7,
} as const;

// ============================================================================
// INCIDENT CONFIGURATION (Part 11)
// ============================================================================

export const INCIDENT_CONFIG = {
  phases: ['DETECTION', 'TRIAGE', 'INVESTIGATION', 'MITIGATION', 'RESOLUTION', 'POSTMORTEM'] as const,
  maxHypotheses: 5,
  hypothesisTimeoutMinutes: 30,
  autoEscalateMinutes: 60,
  postmortemRequired: true,
} as const;

// ============================================================================
// HINT LADDER CONFIGURATION (Part 15)
// ============================================================================

export const HINT_LADDER_CONFIG = {
  maxRungs: 5,
  rungTypes: ['CONCEPTUAL', 'STRATEGIC', 'TACTICAL', 'SYNTACTIC', 'DEBUGGING', 'NEAR_SOLUTION'] as const,
  escalationThreshold: 2, // failed attempts at same rung before escalating
  effectivenessTracking: true,
  codeLocationRequired: true,
  antiRepetitionWindow: 3, // don't repeat same hint type within this many rungs
} as const;

// ============================================================================
// COACH CONFIGURATION (Part 14)
// ============================================================================

export const COACH_CONFIG = {
  maxContextTokens: 8000,
  maxHistoryMessages: 10,
  antiRepetitionWindow: 5,
  groundingThreshold: 0.7,
  policyEnforcement: true,
  promptInjectionGuard: true,
  outputValidation: true,
  telemetryEnabled: true,
} as const;

// ============================================================================
// ENGINEERING SIMULATOR CONFIGURATION (Part 10)
// ============================================================================

export const ENGINEERING_SIM_CONFIG = {
  projectTypes: [
    'BACKEND_SERVICE',
    'FRONTEND_APP',
    'FULLSTACK_APP',
    'DATA_PIPELINE',
    'ML_MODEL',
    'INFRASTRUCTURE',
    'CLI_TOOL',
    'LIBRARY',
    'API_GATEWAY',
    'MICROSERVICE',
    'MOBILE_APP',
    'DESKTOP_APP',
    'GAME',
    'BLOCKCHAIN',
    'EMBEDDED',
    'CUSTOM',
  ] as const,
  rubricCategories: [
    'correctness',
    'architecture',
    'code_quality',
    'testing',
    'documentation',
    'security',
    'performance',
  ] as const,
  defaultWeights: {
    correctness: 0.35,
    architecture: 0.20,
    code_quality: 0.15,
    testing: 0.15,
    documentation: 0.05,
    security: 0.05,
    performance: 0.05,
  },
  maxRevisions: 3,
  timeLimitMinutes: 120,
} as const;

// ============================================================================
// SUBMISSION SYSTEM CONFIGURATION (Parts 12, 13)
// ============================================================================

export const SUBMISSION_CONFIG = {
  maxCodeSizeBytes: 50000,
  idempotencyWindowHours: 24,
  workerConcurrency: 4,
  stuckJobThresholdMinutes: 10,
  resultRetentionDays: 90,
  verdicts: ['PASS', 'FAIL', 'PARTIAL', 'SYSTEM_ERROR', 'TIMEOUT', 'MEMORY_LIMIT', 'COMPILATION_ERROR', 'RUNTIME_ERROR'] as Verdict[],
} as const;

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

export const DATABASE_CONFIG = {
  // Connection
  poolSize: 20,
  connectionTimeoutMs: 5000,
  queryTimeoutMs: 30000,

  // Migrations
  migrationsPath: './db/migrations',
  seedPath: './db/seed',

  // RLS
  rlsEnabled: true,
  superuserBypass: true,
} as const;

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

export const SECURITY_CONFIG = {
  // JWT
  jwtAlgorithm: 'HS256',
  jwtAccessTokenTtlMinutes: 60,
  jwtRefreshTokenTtlDays: 30,
  jwtSecret: 'dev-secret-change-in-production',
  jwksUrl: '',

  // Passwords
  bcryptRounds: 12,
  minPasswordLength: 12,

  // CORS
  corsOrigins: ['http://localhost:3000', 'http://localhost:5173'],

  // Content Security
  maxRequestSizeBytes: 1024 * 1024, // 1 MB
  sanitizeOutputs: true,

  // Execution sandbox
  sandboxEnabled: true,
  sandboxType: 'container' as 'process' | 'container' | 'firecracker' | 'judge0',
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  // Core features
  roleContext: true,
  diagnostic: true,
  adaptiveChallenges: true,
  masteryEngine: true,
  roadmap: true,
  interviewSimulation: true,
  incidentEngine: true,
  engineeringSimulator: true,
  submissionSystem: true,
  executionAnalysis: true,
  aiCoach: true,
  hintLadder: true,

  // AI features (require API keys)
  aiDiagnosis: true,
  aiFeedback: true,
  aiExplanationEvaluation: true,
  aiComplexityReasoning: true,
  aiHintGeneration: true,
  aiCoaching: true,
  aiChallengeGeneration: true,
  aiInterviewFollowup: true,
  aiIncidentHypothesis: true,
  aiProjectEvaluation: true,

  // Experimental
  spacedRepetition: true,
  transferLearning: true,
  prerequisiteGating: true,
  contradictionDetection: true,
  staleSkillDecay: true,
} as const;

// ============================================================================
// UNIFIED CONFIG OBJECT
// ============================================================================

export const unifiedConfig = {
  mastery: MASTERY_CONFIG,
  gaps: GAP_CONFIG,
  difficulty: DIFFICULTY_CONFIG,
  ranking: RANKING_CONFIG,
  scheduler: SCHEDULER_CONFIG,
  readiness: READINESS_CONFIG,
  priority: PRIORITY_CONFIG,
  execution: EXECUTION_LIMITS,
  languageExecution: LANGUAGE_EXECUTION_LIMITS,
  rateLimits: RATE_LIMITS,
  ai: AI_CONFIG,
  diagnostic: DIAGNOSTIC_CONFIG,
  interview: INTERVIEW_CONFIG,
  incident: INCIDENT_CONFIG,
  hintLadder: HINT_LADDER_CONFIG,
  coach: COACH_CONFIG,
  engineeringSim: ENGINEERING_SIM_CONFIG,
  submission: SUBMISSION_CONFIG,
  database: DATABASE_CONFIG,
  security: SECURITY_CONFIG,
  features: FEATURE_FLAGS,
} as const;

type WidenConfig<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? WidenConfig<U>[]
        : T extends object
          ? { -readonly [K in keyof T]: WidenConfig<T[K]> }
          : T;

type DeepMutable<T> = {
  -readonly [K in keyof T]: T[K] extends readonly (infer U)[]
    ? U[]
    : T[K] extends object
      ? DeepMutable<T[K]>
      : T[K];
};

export type UnifiedConfig = WidenConfig<DeepMutable<typeof unifiedConfig>>;

// ============================================================================
// ENVIRONMENT OVERRIDES
// ============================================================================

/**
 * Load configuration from environment variables.
 * Environment variables take precedence over defaults.
 */
export function loadConfigFromEnv(): Partial<UnifiedConfig> {
  const env = process.env;
  const overrides: Partial<UnifiedConfig> = {};

  if (env.MASTERY_RECENCY_HALF_LIFE_DAYS) {
    overrides.mastery = { ...MASTERY_CONFIG, recencyHalfLifeDays: Number(env.MASTERY_RECENCY_HALF_LIFE_DAYS) };
  }

  if (env.EXECUTION_WALL_TIME_MS) {
    overrides.execution = { ...EXECUTION_LIMITS, wallTimeMs: Number(env.EXECUTION_WALL_TIME_MS) };
  }

  if (env.RATE_LIMIT_SUBMISSIONS_PER_MINUTE) {
    overrides.rateLimits = { ...RATE_LIMITS, submissionsPerMinute: Number(env.RATE_LIMIT_SUBMISSIONS_PER_MINUTE) };
  }

  if (env.AI_PROVIDER) {
    overrides.ai = {
      ...AI_CONFIG,
      providers: [...AI_CONFIG.providers],
      fallbackOrder: env.AI_PROVIDER.split(',').map(s => s.trim()),
      enabledResponsibilities: [...AI_CONFIG.enabledResponsibilities],
    };
  }

  if (env.FEATURE_FLAGS) {
    const flags = env.FEATURE_FLAGS.split(',').map(s => s.trim());
    const features = { ...FEATURE_FLAGS };
    for (const flag of flags) {
      if (flag in features) {
        (features as Record<string, boolean>)[flag] = true;
      }
    }
    overrides.features = features;
  }

  return overrides;
}

/**
 * Get effective configuration with environment overrides applied.
 */
export function getEffectiveConfig(): UnifiedConfig {
  const envOverrides = loadConfigFromEnv();
  return deepMerge(unifiedConfig as unknown as UnifiedConfig, envOverrides);
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
        targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
      (result as Record<string, unknown>)[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
    } else if (sourceValue !== undefined) {
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }
  return result;
}

export default unifiedConfig;
