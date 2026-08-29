-- ============================================================================
-- CodeForge AI — Unified Database Schema (Core)
-- Merged from Parts 1, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15
-- PostgreSQL 14+ / Supabase compatible
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS citext;        -- case-insensitive text

-- ============================================================================
-- ENUMS (mirror src/domain/types.ts exactly)
-- ============================================================================

CREATE TYPE content_status AS ENUM ('DRAFT','ACTIVE','DEPRECATED','ARCHIVED');
CREATE TYPE proficiency_level AS ENUM ('FOUNDATION','DEVELOPING','COMPETENT','STRONG','ADVANCED');
CREATE TYPE importance_level AS ENUM ('CORE','IMPORTANT','SUPPORTING','OPTIONAL');
CREATE TYPE technology_type AS ENUM ('LANGUAGE','FRAMEWORK','LIBRARY','DATABASE','TOOL','PLATFORM');
CREATE TYPE technology_usage AS ENUM ('COMMON','IMPORTANT','OPTIONAL','SUPPORTING');
CREATE TYPE context_source AS ENUM ('SELF_SELECTED','INSTITUTION_ASSIGNED','AI_RECOMMENDED','IMPORTED');
CREATE TYPE role_slot AS ENUM ('PRIMARY','SECONDARY');

CREATE TYPE mastery_level AS ENUM ('NOVICE','DEVELOPING','COMPETENT','STRONG','MASTERED','STALE');
CREATE TYPE skill_level AS ENUM ('WEAK','DEVELOPING','PROFICIENT','STRONG');
CREATE TYPE difficulty_label AS ENUM ('FOUNDATION','EASY','MEDIUM','INTERMEDIATE','ADVANCED','HARD','EXPERT');
CREATE TYPE difficulty_level AS ENUM ('EASY','MEDIUM','HARD','ADVANCED');
CREATE TYPE progression_stage AS ENUM ('FOUNDATION','BASIC_APPLICATION','INTERMEDIATE_APPLICATION','COMPLEX_COMBINATION','REAL_WORLD_APPLICATION');

CREATE TYPE task_type AS ENUM (
  'IMPLEMENTATION','DEBUGGING','CODE_COMPLETION','REFACTORING','OPTIMIZATION',
  'CODE_READING','OUTPUT_PREDICTION','TEST_CREATION','ALGORITHM_SELECTION',
  'REAL_WORLD_ENGINEERING','CODING','CONCEPTUAL','COMPLEXITY_REASONING',
  'TECHNICAL_REASONING','EXPLANATION'
);

CREATE TYPE execution_status AS ENUM (
  'STARTED','DRAFT','SUBMITTED','RUNNING','PASSED','FAILED','SYSTEM_ERROR',
  'ABANDONED','COMPLETED','TIMEOUT','COMPILATION_ERROR','RUNTIME_ERROR',
  'MEMORY_LIMIT_EXCEEDED'
);

CREATE TYPE verdict AS ENUM (
  'PASS','FAIL','PARTIAL','SYSTEM_ERROR','TIMEOUT','MEMORY_LIMIT',
  'COMPILATION_ERROR','RUNTIME_ERROR'
);

CREATE TYPE evidence_type AS ENUM (
  'CORRECT','INCORRECT','PARTIAL','EXECUTION','REASONING','DEBUGGING',
  'CODE_READING','HINT_DEPENDENCY','TIMING',
  'challenge_passed','challenge_partial_or_failed','hint_used',
  'syntax_error','timeout','runtime_error','misconception_detected',
  'transfer_gap','prerequisite_gap','independent_success','assisted_success',
  'repeated_mistake','project_rubric_category'
);

CREATE TYPE independence_signal AS ENUM ('INDEPENDENT','ASSISTED');
CREATE TYPE assistance_level AS ENUM ('NONE','HINT','SOLUTION_VIEWED');

CREATE TYPE test_category AS ENUM (
  'NORMAL','EDGE','BOUNDARY','STRESS','INTERLEAVED',
  'CORRECTNESS','PERFORMANCE','STYLE','SECURITY','COMPLEXITY'
);

CREATE TYPE comparison_mode AS ENUM ('exact','unordered','float_tolerance','contains');

CREATE TYPE gap_status AS ENUM (
  'UNKNOWN','COMPLETE','DEVELOPING','GAP','CRITICAL_GAP',
  'BLOCKED','INSUFFICIENT_EVIDENCE','TRANSFER_GAP','PREREQUISITE_GAP'
);

CREATE TYPE gap_type AS ENUM (
  'SKILL_GAP','TRANSFER_GAP','PREREQUISITE_GAP','INSUFFICIENT_EVIDENCE','NONE'
);

CREATE TYPE mistake_category AS ENUM (
  'OFF_BY_ONE','WRONG_LOOP_CONDITION','WRONG_DATA_STRUCTURE','WRONG_ALGORITHM',
  'LOGIC_ERROR','BOUNDARY_ERROR','EDGE_CASE_FAILURE','INPUT_HANDLING',
  'STATE_MANAGEMENT','TYPE_ERROR','NULL_HANDLING','RUNTIME_ERROR',
  'COMPILATION_ERROR','COMPLEXITY_FAILURE','PERFORMANCE_FAILURE',
  'API_ERROR','ASYNC_ERROR','SYNTAX_ERROR','UNKNOWN'
);

CREATE TYPE failure_category AS ENUM (
  'COMPILATION','RUNTIME','LOGIC','BOUNDARY','EDGE_CASE','INPUT_HANDLING',
  'STATE','ALGORITHM','COMPLEXITY','TIMEOUT','MEMORY','UNKNOWN'
);

CREATE TYPE trend AS ENUM ('IMPROVING','STABLE','DECLINING');

CREATE TYPE readiness_state AS ENUM (
  'NOT_STARTED','FOUNDATION_BUILDING','DEVELOPING',
  'APPROACHING_READY','READY','STRONG'
);

CREATE TYPE goal_type AS ENUM (
  'GENERAL_CODING','PLACEMENT_PREPARATION','INTERVIEW_PREPARATION',
  'ROLE_PREPARATION','DSA_MASTERY'
);

CREATE TYPE priority_tier AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL','VERY_HIGH');

CREATE TYPE interview_state AS ENUM (
  'CREATED','READY','STARTED','PROBLEM_PRESENTED','CLARIFICATION',
  'APPROACH_DISCUSSION','CODING','TESTING','DEBUGGING','FOLLOW_UP',
  'FINAL_EVALUATION','COMPLETED','EXPIRED','CANCELLED','FAILED'
);

CREATE TYPE interview_type AS ENUM (
  'GUIDED_TECHNICAL_INTERVIEW','STRICT_TECHNICAL_INTERVIEW',
  'INTERVIEW_SIMULATION','ROLE_BASED_INTERVIEW','WEAKNESS_FOCUSED_INTERVIEW',
  'FINAL_READINESS_INTERVIEW','CUSTOM'
);

CREATE TYPE hint_level AS ENUM ('NONE','CLARIFICATION','CONCEPTUAL_DIRECTION','STRONG_DIRECTION','NEAR_SOLUTION');

CREATE TYPE incident_phase AS ENUM ('DETECTION','TRIAGE','INVESTIGATION','MITIGATION','RESOLUTION','POSTMORTEM');
CREATE TYPE incident_severity AS ENUM ('SEV1','SEV2','SEV3','SEV4');
CREATE TYPE hypothesis_status AS ENUM ('PROPOSED','TESTING','CONFIRMED','REJECTED');
CREATE TYPE alert_channel AS ENUM ('PAGERDUTY','SLACK','EMAIL','WEBHOOK');
CREATE TYPE incident_action_type AS ENUM (
  'LOG_QUERY','METRIC_QUERY','TRACE_QUERY','DEPLOYMENT','CONFIG_CHANGE',
  'RESTART','SCALE','ROLLOUT','ROLLBACK','OTHER'
);

CREATE TYPE hint_ladder_state AS ENUM ('IDLE','ANALYZING','GENERATING','DELIVERED','ESCALATING','COMPLETED','FAILED');
CREATE TYPE hint_type AS ENUM ('CONCEPTUAL','STRATEGIC','TACTICAL','SYNTACTIC','DEBUGGING','NEAR_SOLUTION');

CREATE TYPE feedback_level AS ENUM ('QUICK','STANDARD','DETAILED','DEEP');
CREATE TYPE coaching_style AS ENUM ('SUPPORTIVE','DIRECTIVE','SOCRATIC','MINIMAL');

CREATE TYPE project_type AS ENUM (
  'BACKEND_SERVICE','FRONTEND_APP','FULLSTACK_APP','DATA_PIPELINE','ML_MODEL',
  'INFRASTRUCTURE','CLI_TOOL','LIBRARY','API_GATEWAY','MICROSERVICE',
  'MOBILE_APP','DESKTOP_APP','GAME','BLOCKCHAIN','EMBEDDED','CUSTOM'
);

CREATE TYPE requirement_priority AS ENUM ('MUST_HAVE','SHOULD_HAVE','NICE_TO_HAVE');
CREATE TYPE rubric_category AS ENUM ('correctness','architecture','code_quality','testing','documentation','security','performance');

CREATE TYPE submission_state AS ENUM ('PENDING','QUEUED','PROCESSING','EVALUATING','COMPLETED','FAILED','CANCELLED');
CREATE TYPE result_aggregation AS ENUM ('ALL_OR_NOTHING','PARTIAL_CREDIT','WEIGHTED');

CREATE TYPE supported_language AS ENUM ('python','javascript','typescript','java','cpp','go','rust');

-- ============================================================================
-- PART 1: ROLE CONTEXT & CAREER IDENTITY
-- ============================================================================

-- Career Domains
CREATE TABLE career_domain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status content_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role Families
CREATE TABLE role_family (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  career_domain_id UUID NOT NULL REFERENCES career_domain(id),
  status content_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roles
CREATE TABLE role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  role_family_id UUID NOT NULL REFERENCES role_family(id),
  status content_status NOT NULL DEFAULT 'ACTIVE',
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role Versions
CREATE TABLE role_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES role(id),
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  long_description TEXT NOT NULL,
  status content_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_id, version)
);

-- Competencies
CREATE TABLE competency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  parent_competency_id UUID REFERENCES competency(id),
  status content_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Skills
CREATE TABLE skill (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  competency_id UUID NOT NULL REFERENCES competency(id),
  status content_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Skill Prerequisites
CREATE TABLE skill_prerequisite (
  skill_id UUID NOT NULL REFERENCES skill(id),
  prerequisite_skill_id UUID NOT NULL REFERENCES skill(id),
  relationship_type TEXT NOT NULL DEFAULT 'PREREQUISITE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (skill_id, prerequisite_skill_id)
);

-- Technologies
CREATE TABLE technology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type technology_type NOT NULL,
  status content_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role-Competency Links
CREATE TABLE role_competency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_version_id UUID NOT NULL REFERENCES role_version(id),
  competency_id UUID NOT NULL REFERENCES competency(id),
  importance importance_level NOT NULL,
  expected_proficiency proficiency_level NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (role_version_id, competency_id)
);

-- Role-Skill Links
CREATE TABLE role_skill (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_version_id UUID NOT NULL REFERENCES role_version(id),
  skill_id UUID NOT NULL REFERENCES skill(id),
  importance importance_level NOT NULL,
  expected_proficiency proficiency_level NOT NULL,
  UNIQUE (role_version_id, skill_id)
);

-- Role-Technology Links
CREATE TABLE role_technology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_version_id UUID NOT NULL REFERENCES role_version(id),
  technology_id UUID NOT NULL REFERENCES technology(id),
  usage_type technology_usage NOT NULL,
  UNIQUE (role_version_id, technology_id)
);

-- Institutions
CREATE TABLE institution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Students
CREATE TABLE student (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institution(id),
  display_name TEXT NOT NULL,
  email CITEXT UNIQUE,
  auth_provider TEXT DEFAULT 'supabase',
  auth_subject UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student Career Context
CREATE TABLE student_career_context (
  student_id UUID PRIMARY KEY REFERENCES student(id),
  primary_role_id UUID NOT NULL REFERENCES role(id),
  primary_role_version INTEGER NOT NULL,
  secondary_role_id UUID REFERENCES role(id),
  secondary_role_version INTEGER,
  source context_source NOT NULL DEFAULT 'SELF_SELECTED',
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student Role History
CREATE TABLE student_role_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id),
  role_id UUID NOT NULL REFERENCES role(id),
  role_version INTEGER NOT NULL,
  slot role_slot NOT NULL,
  source context_source NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Role Variants (institution-specific customizations)
CREATE TABLE role_variant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institution(id),
  role_id UUID NOT NULL REFERENCES role(id),
  name TEXT,
  short_description TEXT,
  long_description TEXT,
  status content_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institution_id, role_id)
);

-- ============================================================================
-- PART 3, 5, 9: CHALLENGES & SKILL GRAPH
-- ============================================================================

-- Skills (extended for mastery engine)
ALTER TABLE skill ADD COLUMN IF NOT EXISTS parent_skill_id UUID REFERENCES skill(id);
ALTER TABLE skill ADD COLUMN IF NOT EXISTS difficulty_score NUMERIC(3,1) DEFAULT 5.0;
ALTER TABLE skill ADD COLUMN IF NOT EXISTS category TEXT;

-- Challenges
CREATE TABLE challenge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  primary_skill_id UUID NOT NULL REFERENCES skill(id),
  difficulty_level difficulty_level NOT NULL,
  difficulty_score NUMERIC(3,1) NOT NULL DEFAULT 5.0,
  concept_difficulty INTEGER NOT NULL DEFAULT 3 CHECK (concept_difficulty BETWEEN 1 AND 5),
  implementation_complexity INTEGER NOT NULL DEFAULT 3 CHECK (implementation_complexity BETWEEN 1 AND 5),
  constraint_complexity INTEGER NOT NULL DEFAULT 3 CHECK (constraint_complexity BETWEEN 1 AND 5),
  reasoning_complexity INTEGER NOT NULL DEFAULT 3 CHECK (reasoning_complexity BETWEEN 1 AND 5),
  ambiguity INTEGER NOT NULL DEFAULT 3 CHECK (ambiguity BETWEEN 1 AND 5),
  context_type TEXT NOT NULL DEFAULT 'STANDARD' CHECK (context_type IN ('STANDARD','NOVEL','VERIFICATION','EXPLORATION','TRANSFER')),
  harness_type TEXT NOT NULL DEFAULT 'function' CHECK (harness_type IN ('function','cli','http','class','sql')),
  languages_supported supported_language[] NOT NULL DEFAULT ARRAY['python']::supported_language[],
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','DEPRECATED','ARCHIVED')),
  is_verification BOOLEAN NOT NULL DEFAULT FALSE,
  prompt TEXT NOT NULL,
  function_name TEXT NOT NULL,
  starter_code JSONB NOT NULL DEFAULT '{}',
  hints TEXT[] NOT NULL DEFAULT '{}',
  solution_metadata JSONB NOT NULL DEFAULT '{}',
  evaluation_metadata JSONB NOT NULL DEFAULT '{}',
  quality_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (quality_status IN ('DRAFT','VALIDATING','REVIEW','APPROVED','ACTIVE','DEPRECATED')),
  quality_analytics JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Challenge Secondary Skills
CREATE TABLE challenge_skill (
  challenge_id UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skill(id),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (challenge_id, skill_id)
);

-- Challenge Test Cases
CREATE TABLE challenge_test_case (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  category test_category NOT NULL DEFAULT 'NORMAL',
  input_data JSONB NOT NULL,
  expected_output JSONB NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  points INTEGER NOT NULL DEFAULT 1,
  ordinal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 5, 9: MASTERY & EVIDENCE
-- ============================================================================

-- Student Skill State (Mastery)
CREATE TABLE student_skill_state (
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  mastery_score NUMERIC(5,2) NOT NULL DEFAULT 0.0 CHECK (mastery_score BETWEEN 0 AND 100),
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.0 CHECK (confidence_score BETWEEN 0 AND 1),
  mastery_state mastery_level NOT NULL DEFAULT 'NOVICE',
  trend trend NOT NULL DEFAULT 'STABLE',
  evidence_count INTEGER NOT NULL DEFAULT 0,
  independent_success_count INTEGER NOT NULL DEFAULT 0,
  distinct_challenges_count INTEGER NOT NULL DEFAULT 0,
  contradiction_flag BOOLEAN NOT NULL DEFAULT FALSE,
  mastery_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_assessed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, skill_id)
);

-- Evidence
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  attempt_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES challenge(id),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  raw_score NUMERIC(4,3) NOT NULL CHECK (raw_score BETWEEN 0 AND 1),
  difficulty_score NUMERIC(3,1) NOT NULL,
  independent BOOLEAN NOT NULL,
  assistance_used assistance_level NOT NULL DEFAULT 'NONE',
  mistake_category mistake_category,
  language_issue BOOLEAN NOT NULL DEFAULT FALSE,
  context_type TEXT NOT NULL DEFAULT 'STANDARD' CHECK (context_type IN ('STANDARD','NOVEL','VERIFICATION','EXPLORATION','TRANSFER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Misconceptions
CREATE TABLE misconception (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  mistake_category mistake_category NOT NULL,
  occurrences INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (student_id, skill_id, mistake_category)
);

-- ============================================================================
-- PART 5, 6: RECOMMENDATIONS & ROADMAP
-- ============================================================================

-- Recommendations
CREATE TABLE recommendation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenge(id),
  skill_id UUID NOT NULL REFERENCES skill(id),
  gap_type gap_type,
  intervention_type TEXT NOT NULL CHECK (intervention_type IN (
    'TARGETED_PRACTICE','DEBUGGING','TRANSFER','REVIEW','VERIFICATION',
    'LEARN','PREREQUISITE_REVIEW','EXPLORATION'
  )),
  learning_objective TEXT NOT NULL,
  reason TEXT NOT NULL,
  ranking_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  is_repetition BOOLEAN NOT NULL DEFAULT FALSE,
  is_exploration BOOLEAN NOT NULL DEFAULT FALSE,
  evidence_snapshot JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','COMPLETED','EXPIRED','DISMISSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Milestones
CREATE TABLE milestone (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  required_skills UUID[] NOT NULL DEFAULT '{}',
  target_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED','AVAILABLE','IN_PROGRESS','READY_FOR_VERIFICATION','COMPLETED','NEEDS_REASSESSMENT')),
  completion_criteria JSONB NOT NULL DEFAULT '{}',
  progress NUMERIC(3,2) NOT NULL DEFAULT 0.0 CHECK (progress BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily Plans
CREATE TABLE daily_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  activities JSONB NOT NULL DEFAULT '[]',
  total_estimated_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, plan_date)
);

-- Weekly Plans
CREATE TABLE weekly_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  daily_plan_ids UUID[] NOT NULL DEFAULT '{}',
  focus_skills UUID[] NOT NULL DEFAULT '{}',
  review_skills UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, week_start)
);

-- ============================================================================
-- PART 2: DIAGNOSTIC
-- ============================================================================

CREATE TABLE diagnostic_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL,
  blueprint JSONB NOT NULL,
  current_task_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED','ABANDONED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE diagnostic_attempt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES diagnostic_session(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  code TEXT NOT NULL,
  language supported_language NOT NULL DEFAULT 'python',
  hints_used INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN,
  test_results JSONB NOT NULL DEFAULT '[]',
  score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 8: INTERVIEW SIMULATION
-- ============================================================================

CREATE TABLE interview_blueprint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type interview_type NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  competencies TEXT[] NOT NULL DEFAULT '{}',
  problem_count INTEGER NOT NULL DEFAULT 3,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  assistance_policy JSONB NOT NULL DEFAULT '{}',
  scoring JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES interview_blueprint(id),
  blueprint_version INTEGER NOT NULL,
  state interview_state NOT NULL DEFAULT 'CREATED',
  current_problem_index INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interview(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ
);

CREATE TABLE interview_problem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interview(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenge(id),
  ordinal INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','PRESENTED','CLARIFICATION','APPROACH_DISCUSSION','CODING','TESTING','DEBUGGING','FOLLOW_UP','EVALUATED')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  hints_used INTEGER NOT NULL DEFAULT 0,
  hint_level hint_level NOT NULL DEFAULT 'NONE',
  solution_viewed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE interview_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interview(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES interview_problem(id),
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview_evaluation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interview(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES interview_problem(id),
  dimension_scores JSONB NOT NULL DEFAULT '{}',
  overall_score NUMERIC(5,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 11: INCIDENT ENGINE
-- ============================================================================

CREATE TABLE incident_blueprint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  severity incident_severity NOT NULL DEFAULT 'SEV3',
  initial_phase incident_phase NOT NULL DEFAULT 'DETECTION',
  services TEXT[] NOT NULL DEFAULT '{}',
  runbooks JSONB NOT NULL DEFAULT '{}',
  injects JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incident (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES incident_blueprint(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity incident_severity NOT NULL DEFAULT 'SEV3',
  phase incident_phase NOT NULL DEFAULT 'DETECTION',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RESOLVED','ESCALATED','CLOSED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incident_hypothesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status hypothesis_status NOT NULL DEFAULT 'PROPOSED',
  evidence TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incident_action (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  type incident_action_type NOT NULL,
  description TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('SUCCESS','FAILURE','PARTIAL','PENDING')),
  details JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incident_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('DEBUG','INFO','WARN','ERROR','CRITICAL')),
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE incident_metric (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tags JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE incident_trace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
  trace_id TEXT NOT NULL,
  span_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OK','ERROR','TIMEOUT')),
  tags JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE postmortem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  timeline JSONB NOT NULL DEFAULT '[]',
  root_cause TEXT NOT NULL,
  contributing_factors TEXT[] NOT NULL DEFAULT '{}',
  impact TEXT NOT NULL,
  resolution TEXT NOT NULL,
  action_items JSONB NOT NULL DEFAULT '[]',
  lessons_learned TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 10: ENGINEERING SIMULATOR
-- ============================================================================

CREATE TABLE project (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type project_type NOT NULL,
  requirements JSONB NOT NULL DEFAULT '[]',
  rubric JSONB NOT NULL DEFAULT '{}',
  constraints TEXT[] NOT NULL DEFAULT '{}',
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  starter_files JSONB NOT NULL DEFAULT '{}',
  time_limit_minutes INTEGER NOT NULL DEFAULT 120,
  difficulty difficulty_label NOT NULL DEFAULT 'INTERMEDIATE',
  skills UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_test_case (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  category test_category NOT NULL DEFAULT 'NORMAL',
  input_data JSONB NOT NULL,
  expected_output JSONB NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  points INTEGER NOT NULL DEFAULT 1,
  ordinal INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE project_submission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  files JSONB NOT NULL DEFAULT '{}',
  test_results_claimed TEXT[] NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_evaluation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES project_submission(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES project(id),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  category_scores JSONB NOT NULL DEFAULT '[]',
  overall_score NUMERIC(5,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  ai_feedback JSONB NOT NULL DEFAULT '[]',
  ai_score_adjustments JSONB NOT NULL DEFAULT '{}',
  evidence_records JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_revision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES project_submission(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  previous_files JSONB NOT NULL DEFAULT '{}',
  new_files JSONB NOT NULL DEFAULT '{}',
  changes_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 12, 13: SUBMISSION SYSTEM & EXECUTION ANALYSIS
-- ============================================================================

CREATE TABLE submission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenge(id),
  language supported_language NOT NULL DEFAULT 'python',
  code TEXT NOT NULL,
  client_attempt_id TEXT,
  assistance_used assistance_level NOT NULL DEFAULT 'NONE',
  recommendation_id UUID REFERENCES recommendation(id),
  state submission_state NOT NULL DEFAULT 'PENDING',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  worker_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE
);

CREATE TABLE submission_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES submission(id) ON DELETE CASCADE,
  verdict verdict NOT NULL,
  test_results JSONB NOT NULL DEFAULT '[]',
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  memory_kb INTEGER NOT NULL DEFAULT 0,
  evaluation JSONB NOT NULL DEFAULT '{}',
  diagnosis JSONB NOT NULL DEFAULT '{}',
  updated_skill_states JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE normalized_execution_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES submission(id) ON DELETE CASCADE,
  verdict verdict NOT NULL,
  test_results JSONB NOT NULL DEFAULT '[]',
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  memory_kb INTEGER NOT NULL DEFAULT 0,
  stdout TEXT,
  stderr TEXT,
  resource_violations JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 14: AI CODE COACH
-- ============================================================================

CREATE TABLE coach_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenge(id),
  attempt_id UUID REFERENCES submission(id),
  state TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (state IN ('ACTIVE','COMPLETED','ABANDONED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coach_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES coach_session(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coach_observation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES coach_session(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('MISTAKE_PATTERN','PROGRESS','STUCK','BREAKTHROUGH','REPETITION')),
  description TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  related_evidence_ids UUID[] NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 15: HINT LADDER
-- ============================================================================

CREATE TABLE hint_ladder_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenge(id),
  attempt_id UUID NOT NULL REFERENCES submission(id),
  state hint_ladder_state NOT NULL DEFAULT 'IDLE',
  current_rung INTEGER NOT NULL DEFAULT 0,
  max_rungs INTEGER NOT NULL DEFAULT 5,
  root_issue JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE hint_rung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES hint_ladder_session(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  type hint_type NOT NULL,
  content TEXT NOT NULL,
  code_location JSONB,
  delivered_at TIMESTAMPTZ,
  effectiveness TEXT CHECK (effectiveness IN ('UNKNOWN','HELPFUL','NOT_HELPFUL','CONFUSING')),
  student_response TEXT
);

-- ============================================================================
-- AUDIT & EVENTS
-- ============================================================================

CREATE TABLE audit_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  student_id UUID REFERENCES student(id),
  attempt_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Part 1
CREATE INDEX idx_role_family_career_domain ON role_family(career_domain_id);
CREATE INDEX idx_role_family_status ON role_family(status);
CREATE INDEX idx_role_family_slug ON role_family(slug);
CREATE INDEX idx_role_role_family ON role(role_family_id);
CREATE INDEX idx_role_status ON role(status);
CREATE INDEX idx_role_slug ON role(slug);
CREATE INDEX idx_role_version_role ON role_version(role_id);
CREATE INDEX idx_competency_parent ON competency(parent_competency_id);
CREATE INDEX idx_competency_slug ON competency(slug);
CREATE INDEX idx_skill_competency ON skill(competency_id);
CREATE INDEX idx_skill_slug ON skill(slug);
CREATE INDEX idx_skill_parent ON skill(parent_skill_id);
CREATE INDEX idx_technology_slug ON technology(slug);
CREATE INDEX idx_role_competency_role_version ON role_competency(role_version_id);
CREATE INDEX idx_role_skill_role_version ON role_skill(role_version_id);
CREATE INDEX idx_role_technology_role_version ON role_technology(role_version_id);
CREATE INDEX idx_student_institution ON student(institution_id);
CREATE INDEX idx_student_email ON student(email);
CREATE INDEX idx_student_role_history_student ON student_role_history(student_id);
CREATE INDEX idx_student_role_history_role ON student_role_history(role_id);
CREATE INDEX idx_role_variant_institution ON role_variant(institution_id);

-- Part 3, 5, 9
CREATE INDEX idx_challenge_primary_skill ON challenge(primary_skill_id);
CREATE INDEX idx_challenge_status ON challenge(status);
CREATE INDEX idx_challenge_difficulty ON challenge(difficulty_level);
CREATE INDEX idx_challenge_quality_status ON challenge(quality_status);
CREATE INDEX idx_challenge_test_case_challenge ON challenge_test_case(challenge_id);
CREATE INDEX idx_challenge_skill_challenge ON challenge_skill(challenge_id);
CREATE INDEX idx_challenge_skill_skill ON challenge_skill(skill_id);
CREATE INDEX idx_student_skill_state_student ON student_skill_state(student_id);
CREATE INDEX idx_student_skill_state_skill ON student_skill_state(skill_id);
CREATE INDEX idx_student_skill_state_mastery ON student_skill_state(mastery_state);
CREATE INDEX idx_evidence_student ON evidence(student_id);
CREATE INDEX idx_evidence_skill ON evidence(skill_id);
CREATE INDEX idx_evidence_attempt ON evidence(attempt_id);
CREATE INDEX idx_evidence_challenge ON evidence(challenge_id);
CREATE INDEX idx_evidence_created_at ON evidence(created_at);
CREATE INDEX idx_misconception_student_skill ON misconception(student_id, skill_id);

-- Part 5, 6
CREATE INDEX idx_recommendation_student ON recommendation(student_id);
CREATE INDEX idx_recommendation_status ON recommendation(status);
CREATE INDEX idx_recommendation_challenge ON recommendation(challenge_id);
CREATE INDEX idx_milestone_student ON milestone(student_id);
CREATE INDEX idx_milestone_status ON milestone(status);
CREATE INDEX idx_daily_plan_student_date ON daily_plan(student_id, plan_date);
CREATE INDEX idx_weekly_plan_student_week ON weekly_plan(student_id, week_start);

-- Part 2
CREATE INDEX idx_diagnostic_session_student ON diagnostic_session(student_id);
CREATE INDEX idx_diagnostic_attempt_session ON diagnostic_attempt(session_id);

-- Part 8
CREATE INDEX idx_interview_student ON interview(student_id);
CREATE INDEX idx_interview_blueprint ON interview(blueprint_id);
CREATE INDEX idx_interview_state ON interview(state);
CREATE INDEX idx_interview_session_interview ON interview_session(interview_id);
CREATE INDEX idx_interview_problem_interview ON interview_problem(interview_id);
CREATE INDEX idx_interview_event_interview ON interview_event(interview_id);
CREATE INDEX idx_interview_evaluation_interview ON interview_evaluation(interview_id);

-- Part 11
CREATE INDEX idx_incident_student ON incident(student_id);
CREATE INDEX idx_incident_blueprint ON incident(blueprint_id);
CREATE INDEX idx_incident_status ON incident(status);
CREATE INDEX idx_incident_hypothesis_incident ON incident_hypothesis(incident_id);
CREATE INDEX idx_incident_action_incident ON incident_action(incident_id);
CREATE INDEX idx_incident_log_incident ON incident_log(incident_id);
CREATE INDEX idx_incident_metric_incident ON incident_metric(incident_id);
CREATE INDEX idx_incident_trace_incident ON incident_trace(incident_id);
CREATE INDEX idx_postmortem_incident ON postmortem(incident_id);

-- Part 10
CREATE INDEX idx_project_type ON project(type);
CREATE INDEX idx_project_difficulty ON project(difficulty);
CREATE INDEX idx_project_test_case_project ON project_test_case(project_id);
CREATE INDEX idx_project_submission_project ON project_submission(project_id);
CREATE INDEX idx_project_submission_student ON project_submission(student_id);
CREATE INDEX idx_project_evaluation_submission ON project_evaluation(submission_id);
CREATE INDEX idx_project_revision_submission ON project_revision(submission_id);

-- Part 12, 13
CREATE INDEX idx_submission_student ON submission(student_id);
CREATE INDEX idx_submission_challenge ON submission(challenge_id);
CREATE INDEX idx_submission_state ON submission(state);
CREATE INDEX idx_submission_idempotency ON submission(idempotency_key);

-- Part 14
CREATE INDEX idx_coach_session_student ON coach_session(student_id);
CREATE INDEX idx_coach_message_session ON coach_message(session_id);
CREATE INDEX idx_coach_observation_session ON coach_observation(session_id);

-- Part 15
CREATE INDEX idx_hint_ladder_session_student ON hint_ladder_session(student_id);
CREATE INDEX idx_hint_ladder_session_challenge ON hint_ladder_session(challenge_id);
CREATE INDEX idx_hint_rung_session ON hint_rung(session_id);

-- Audit
CREATE INDEX idx_audit_event_student ON audit_event(student_id);
CREATE INDEX idx_audit_event_type ON audit_event(event_type);
CREATE INDEX idx_audit_event_created ON audit_event(created_at);