-- ============================================================================
-- CodeForge AI — Analysis & Intelligence Features (Parts 16–32)
-- Appends to the core schema (0001_core_schema.sql) and RLS (0002_rls_policies.sql)
-- PostgreSQL 14+ / Supabase compatible
-- ============================================================================

-- ============================================================================
-- ENUMS (mirror the new types in src/domain/types.ts)
-- ============================================================================

CREATE TYPE correctness_status AS ENUM (
  'ACCEPTED','PARTIALLY_ACCEPTED','REJECTED','INCONCLUSIVE','ERROR'
);
CREATE TYPE confidence_level AS ENUM ('HIGH','MEDIUM','LOW','UNKNOWN');
CREATE TYPE correctness_test_outcome AS ENUM ('PASSED','FAILED','ERRORED','SKIPPED','TIMEOUT');
CREATE TYPE error_category AS ENUM (
  'NONE','LOGIC','RUNTIME','COMPILATION','TIMEOUT','MEMORY','OUTPUT_FORMAT','EDGE_CASE','UNKNOWN'
);
CREATE TYPE mismatch_type AS ENUM ('VALUE','TYPE','ORDER','MISSING','EXTRA','FORMAT','PRECISION');
CREATE TYPE requirement_coverage_status AS ENUM ('COVERED','PARTIALLY_COVERED','NOT_COVERED','CONTRADICTED');
CREATE TYPE ai_degradation_reason AS ENUM (
  'NONE','NOT_CONFIGURED','TIMEOUT','PROVIDER_ERROR','INVALID_RESPONSE',
  'SCHEMA_VALIDATION_FAILED','EVIDENCE_GROUNDING_FAILED'
);

CREATE TYPE complexity_class AS ENUM (
  'O(1)','O(log n)','O(n)','O(n log n)','O(n^2)','O(n^3)','O(2^n)','O(n!)','UNKNOWN'
);
CREATE TYPE constraint_fit AS ENUM ('FITS','MARGINAL','EXCEEDS','UNKNOWN');

CREATE TYPE severity AS ENUM ('INFO','LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE quality_confidence AS ENUM ('HIGH','MEDIUM','LOW','UNKNOWN');

CREATE TYPE claim_type AS ENUM (
  'PROBLEM_UNDERSTANDING','ALGORITHM','DATA_STRUCTURE','CONTROL_FLOW','CORRECTNESS',
  'COMPLEXITY','SPACE_COMPLEXITY','EDGE_CASE','OPTIMIZATION','IMPLEMENTATION_DECISION',
  'INVARIANT','TRADEOFF','BEHAVIOR'
);
CREATE TYPE claim_importance AS ENUM ('CORE','IMPORTANT','SUPPORTING','INCIDENTAL');
CREATE TYPE verification_status AS ENUM ('SUPPORTED','PARTIALLY_SUPPORTED','CONTRADICTED','UNVERIFIED');
CREATE TYPE reasoning_evidence_strength AS ENUM ('DIRECT','STRONG','MODERATE','WEAK','INSUFFICIENT');
CREATE TYPE reasoning_evidence_type AS ENUM (
  'AST_EVIDENCE','CONTROL_FLOW_EVIDENCE','EXECUTION_EVIDENCE','TEST_EVIDENCE',
  'COMPLEXITY_EVIDENCE','SOURCE_EVIDENCE','PROBLEM_REQUIREMENT_EVIDENCE','SEMANTIC_EVIDENCE'
);
CREATE TYPE contradiction_category AS ENUM (
  'ALGORITHM_MISMATCH','DATA_STRUCTURE_MISMATCH','CONTROL_FLOW_MISMATCH','COMPLEXITY_MISMATCH',
  'SPACE_COMPLEXITY_MISMATCH','EDGE_CASE_MISMATCH','CORRECTNESS_REASONING_MISMATCH',
  'IMPLEMENTATION_DECISION_MISMATCH','INVARIANT_MISMATCH','BEHAVIOR_MISMATCH','PROBLEM_UNDERSTANDING_MISMATCH'
);
CREATE TYPE follow_up_type AS ENUM (
  'WHY_THIS_ALGORITHM','WHY_THIS_DATA_STRUCTURE','WHAT_DOES_THIS_LOOP_MAINTAIN',
  'WHY_DOES_THIS_POINTER_MOVE','WHY_IS_THIS_COMPLEXITY','WHAT_HAPPENS_ON_THIS_EDGE_CASE',
  'WHY_IS_THIS_BRANCH_REQUIRED','WHAT_WOULD_BREAK_IF_REMOVED'
);

CREATE TYPE consistency_status AS ENUM ('CONSISTENT','INCONSISTENT','PARTIAL','INCONCLUSIVE');
CREATE TYPE dimension_comparison_status AS ENUM ('MATCH','MISMATCH','CONTRADICTION','INSUFFICIENT');
CREATE TYPE review_verdict AS ENUM ('APPROVE','REQUEST_CHANGES','COMMENT','REJECT');

CREATE TYPE understanding_dimension AS ENUM (
  'problem','algorithm','data_structure','state','control_flow','invariant','correctness',
  'complexity','space','edge_case','debugging','adaptation','transfer'
);
CREATE TYPE probe_type AS ENUM (
  'explanation','causal_why','state_trace','prediction','invariant','edge_case','complexity',
  'counterfactual','modification','debugging','alternative_approach','transfer'
);
CREATE TYPE difficulty_rung AS ENUM (
  'recognition','explanation','prediction','causal_reasoning','modification','transfer'
);
CREATE TYPE dimension_status AS ENUM (
  'not_assessed','insufficient_evidence','developing','demonstrated','strong','gap_identified'
);
CREATE TYPE evidence_strength_label AS ENUM ('weak','moderate','strong');
CREATE TYPE evidence_result AS ENUM (
  'correct','partially_correct','incorrect','ambiguous','no_response'
);
CREATE TYPE result_classification AS ENUM (
  'STRONG_UNDERSTANDING','UNDERSTANDING_DEMONSTRATED','PARTIAL_UNDERSTANDING',
  'UNDERSTANDING_GAP','INSUFFICIENT_EVIDENCE','UNCERTAIN'
);
CREATE TYPE assessment_status AS ENUM ('in_progress','completed','abandoned');
CREATE TYPE understanding_execution_status AS ENUM ('ran','not_ran');

CREATE TYPE failure_class AS ENUM (
  'RUNTIME_ERROR','WRONG_ANSWER','EDGE_CASE_FAILURE','TIME_LIMIT','MEMORY_LIMIT',
  'LOGIC_ERROR','INTEGRATION_ERROR','REGRESSION'
);
CREATE TYPE session_state AS ENUM (
  'NOT_STARTED','IN_PROGRESS','ROOT_CAUSE_IDENTIFIED','FIX_ATTEMPTED','RESOLVED','FAILED','ABANDONED'
);
CREATE TYPE debugging_hypothesis_status AS ENUM ('PROPOSED','TESTING','SUPPORTED','REJECTED','INCONCLUSIVE');
CREATE TYPE debugging_result_status AS ENUM (
  'EXCELLENT_DEBUGGING','STRONG_DEBUGGING','DEVELOPING_DEBUGGING','WEAK_DEBUGGING','INSUFFICIENT_EVIDENCE'
);
CREATE TYPE debug_supported_language AS ENUM ('python','javascript');
CREATE TYPE debug_action_type AS ENUM (
  'RUN','RUN_FAILING_TEST','RUN_SELECTED_TEST','RUN_FULL_SUITE','INSPECT_OUTPUT','INSPECT_VARIABLE',
  'INSPECT_TRACE','ADD_DIAGNOSTIC','CREATE_HYPOTHESIS','REJECT_HYPOTHESIS','ROOT_CAUSE_IDENTIFIED',
  'APPLY_CHANGE','REVERT_CHANGE','REQUEST_HINT','SUBMIT_FIX'
);
CREATE TYPE skill_dimension_name AS ENUM (
  'FAILURE_RECOGNITION','REPRODUCTION','LOCALIZATION','HYPOTHESIS_FORMATION','EVIDENCE_GATHERING',
  'EXPERIMENT_DESIGN','ROOT_CAUSE_ANALYSIS','FIX_QUALITY','REGRESSION_VERIFICATION','DEBUGGING_EFFICIENCY'
);
CREATE TYPE reproduction_status AS ENUM ('NOT_ATTEMPTED','REPRODUCED','NOT_REPRODUCIBLE');
CREATE TYPE experiment_conclusion AS ENUM ('SUPPORTED','REJECTED','INCONCLUSIVE');
CREATE TYPE evidence_ref_type AS ENUM (
  'EXECUTION_TRACE','VARIABLE_STATE','FAILING_TEST','CODE_LOCATION','EXPERIMENT','BEHAVIOR_COMPARISON'
);

CREATE TYPE coaching_phase AS ENUM (
  'OBSERVATION','HYPOTHESIS_FORMATION','EVIDENCE_GATHERING','ROOT_CAUSE','FIX','VERIFICATION','COMPLETE','STUCK'
);
CREATE TYPE next_best_action_type AS ENUM (
  'INSPECT_TRACE','REPRODUCE','FORM_HYPOTHESIS','GATHER_EVIDENCE','INSPECT_VARIABLE','RUN_FAILING_TEST',
  'ROOT_CAUSE_ANALYSIS','APPLY_FIX','VERIFY_FIX','REVERT_CHANGE','REQUEST_HINT','ESCALATE'
);

CREATE TYPE review_finding_severity AS ENUM ('INFO','MINOR','MAJOR','CRITICAL');
CREATE TYPE review_finding_category AS ENUM (
  'CORRECTNESS','SECURITY','PERFORMANCE','MAINTAINABILITY','STYLE','TESTING','DOCUMENTATION'
);
CREATE TYPE review_finding_status AS ENUM ('OPEN','ACKNOWLEDGED','RESOLVED','WONTFIX','DISPUTED');
CREATE TYPE review_relationship_type AS ENUM ('RELATED','DUPLICATE','BLOCKS','BLOCKED_BY','SUPERSEDES');

CREATE TYPE adaptive_skill_level AS ENUM (
  'UNKNOWN','INTRODUCED','DEVELOPING','PRACTICED','PROFICIENT','MASTERED','AT_RISK','REGRESSING','UNCERTAIN'
);
CREATE TYPE adaptive_evidence_outcome AS ENUM ('SUCCESS','FAILURE','PARTIAL');
CREATE TYPE path_stage AS ENUM (
  'FOUNDATION','PRACTICE','VARIATION','TRANSFER','APPLICATION','ADVANCED','ROLE_ASSESSMENT'
);
CREATE TYPE selection_mode AS ENUM ('PRACTICE','ASSESSMENT','INTERVIEW');
CREATE TYPE path_intent AS ENUM (
  'DIAGNOSTIC','REMEDIATION','REINFORCEMENT','TRANSFER','PROGRESSION','RETENTION_CHECK','ROLE_ASSESSMENT'
);

CREATE TYPE signal_evidence_type AS ENUM (
  'CHALLENGE_RESULT','CORRECTNESS_RESULT','COMPLEXITY_RESULT','QUALITY_RESULT','REASONING_RESULT',
  'DEBUGGING_RESULT','UNDERSTANDING_RESULT','TRANSFER_RESULT','ASSESSMENT_RESULT'
);
CREATE TYPE signal_evidence_status AS ENUM ('VALID','INVALID','SUSPICIOUS','DISPUTED','EXCLUDED');
CREATE TYPE signal_assessment_tier AS ENUM ('PRACTICE','ASSESSMENT','INTERVIEW','PROJECT','DIAGNOSTIC');
CREATE TYPE signal_skill_state AS ENUM (
  'UNKNOWN','INTRODUCED','DEVELOPING','PRACTICED','PROFICIENT','MASTERED','AT_RISK','REGRESSING','UNCERTAIN'
);
CREATE TYPE signal_trend AS ENUM ('IMPROVING','STABLE','DECLINING','VOLATILE','INSUFFICIENT_DATA');
CREATE TYPE signal_freshness AS ENUM ('RECENT','AGING','STALE','VERY_STALE','UNKNOWN');

CREATE TYPE growth_evidence_source AS ENUM (
  'correctness','complexity','code_quality','reasoning','consistency','understanding',
  'debugging','adaptive_learning','review'
);
CREATE TYPE growth_evidence_quality AS ENUM (
  'DIRECT','INDIRECT','DETERMINISTIC','INFERRED','SELF_REPORTED','AI_ASSISTED'
);
CREATE TYPE growth_evidence_outcome AS ENUM ('positive','negative','neutral');
CREATE TYPE growth_state AS ENUM (
  'NO_EVIDENCE','EMERGING','DEVELOPING','PROFICIENT','STRONG','MASTERED','REGRESSING','AT_RISK','STALE'
);
CREATE TYPE growth_event_type AS ENUM (
  'EVIDENCE_ADDED','STATE_CHANGED','MILESTONE_REACHED','REGRESSION_DETECTED'
);
CREATE TYPE growth_milestone_type AS ENUM (
  'FIRST_SUCCESS','PROFICIENT','STRONG','MASTERED','TRANSFER_SUCCESS','RETENTION','CONSISTENCY'
);
CREATE TYPE growth_confidence AS ENUM ('INSUFFICIENT','LOW','MODERATE','HIGH');
CREATE TYPE growth_evidence_type AS ENUM (
  'CHALLENGE_SUBMISSION','ADAPTIVE_CHALLENGE','ASSESSMENT','DIAGNOSTIC','DEBUGGING_TASK','UNDERSTANDING_CHECK'
);
CREATE TYPE growth_difficulty_level AS ENUM ('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT');
CREATE TYPE growth_evidence_dimension AS ENUM ('PERFORMANCE','RETENTION','TRANSFER','UNDERSTANDING','ROLE_SKILL');

CREATE TYPE role_gap_status AS ENUM ('BELOW_TARGET','PARTIAL','MEETS_TARGET','EXCEEDS_TARGET','UNKNOWN');
CREATE TYPE role_gap_severity AS ENUM ('NONE','LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE role_gap_priority AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE readiness_state_31 AS ENUM ('NOT_READY','DEVELOPING','APPROACHING_READY','READY','STRONG');

CREATE TYPE gateway_operation AS ENUM (
  'hint_ladder.next_hint','code_coach.explain_error','debugging_coach.next_action','understanding.probe',
  'quality.interpret','review.findings','growth.insight','gap.explain','readiness.explain'
);
CREATE TYPE gateway_provider AS ENUM ('groq','gemini','anthropic','mock');
CREATE TYPE resilience_state AS ENUM ('HEALTHY','DEGRADED','OPEN','RECOVERY_CHECK');

-- ============================================================================
-- PART 16: CODE CORRECTNESS ANALYSIS
-- ============================================================================

CREATE TABLE correctness_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  submission_version TEXT NOT NULL DEFAULT '1',
  problem_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  language supported_language NOT NULL DEFAULT 'python',
  status correctness_status NOT NULL,
  confidence confidence_level NOT NULL,
  deterministic JSONB NOT NULL DEFAULT '{}',
  requirement_coverage JSONB NOT NULL DEFAULT '[]',
  static_findings JSONB NOT NULL DEFAULT '[]',
  ai JSONB NOT NULL DEFAULT '{}',
  delta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (submission_id, submission_version)
);

CREATE TABLE correctness_finding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES correctness_assessment(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  language supported_language NOT NULL DEFAULT 'python',
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','error')),
  source_range JSONB,
  source TEXT NOT NULL CHECK (source IN ('compiler-diagnostic','ast-analysis','heuristic')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE requirement_check (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES correctness_assessment(id) ON DELETE CASCADE,
  requirement_id TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  coverage_status requirement_coverage_status NOT NULL,
  supporting_evidence_ids TEXT[] NOT NULL DEFAULT '{}',
  rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 17: COMPLEXITY ANALYSIS
-- ============================================================================

CREATE TABLE complexity_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  language supported_language NOT NULL DEFAULT 'python',
  time_complexity complexity_class NOT NULL DEFAULT 'UNKNOWN',
  space_complexity complexity_class NOT NULL DEFAULT 'UNKNOWN',
  dominant_cost TEXT,
  constraint_fit constraint_fit NOT NULL DEFAULT 'UNKNOWN',
  confidence confidence_level NOT NULL DEFAULT 'UNKNOWN',
  evidence JSONB NOT NULL DEFAULT '{}',
  expression_tree JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 18: CODE QUALITY ENGINE
-- ============================================================================

CREATE TABLE quality_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  language supported_language NOT NULL DEFAULT 'python',
  analysis_version TEXT NOT NULL DEFAULT '1.0.0',
  rule_set_version TEXT NOT NULL DEFAULT '1.0.0',
  source_hash TEXT NOT NULL DEFAULT '',
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0.0 CHECK (overall_score BETWEEN 0 AND 100),
  overall_label TEXT NOT NULL DEFAULT 'UNKNOWN',
  dimension_scores JSONB NOT NULL DEFAULT '[]',
  positive_signals JSONB NOT NULL DEFAULT '[]',
  ai_interpretation JSONB,
  ai_status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED' CHECK (ai_status IN ('OK','UNAVAILABLE','INVALID_RESPONSE','NOT_CONFIGURED')),
  comparison JSONB,
  confidence_summary JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quality_finding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES quality_assessment(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  rule_version TEXT NOT NULL DEFAULT '1.0.0',
  category TEXT NOT NULL,
  severity severity NOT NULL,
  confidence quality_confidence NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact TEXT NOT NULL,
  source_location JSONB,
  evidence TEXT[] NOT NULL DEFAULT '{}',
  suggested_action TEXT NOT NULL DEFAULT '',
  dimensions JSONB NOT NULL DEFAULT '{}',
  origin TEXT NOT NULL CHECK (origin IN ('DETERMINISTIC','AI_SEMANTIC')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 19: REASONING VERIFICATION
-- ============================================================================

CREATE TABLE reasoning_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  analysis_version TEXT NOT NULL DEFAULT '1.0.0',
  reasoning_version INTEGER NOT NULL DEFAULT 1,
  understanding TEXT NOT NULL CHECK (understanding IN ('STRONG','SOLID','PARTIAL','WEAK')),
  score JSONB NOT NULL DEFAULT '{}',
  claims JSONB NOT NULL DEFAULT '[]',
  verifications JSONB NOT NULL DEFAULT '[]',
  agreements TEXT[] NOT NULL DEFAULT '{}',
  contradictions JSONB NOT NULL DEFAULT '[]',
  follow_up_questions JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 20: CODE-REASONING CONSISTENCY
-- ============================================================================

CREATE TABLE consistency_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  analysis_version TEXT NOT NULL DEFAULT '1.0.0',
  status consistency_status NOT NULL,
  reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  reconciliation_note TEXT,
  score JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 21: UNDERSTANDING CHECK
-- ============================================================================

CREATE TABLE understanding_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  status assessment_status NOT NULL DEFAULT 'in_progress',
  classification result_classification,
  procedural_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  conceptual_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  overall_confidence NUMERIC(3,2) NOT NULL DEFAULT 0.0 CHECK (overall_confidence BETWEEN 0 AND 1),
  overall_evidence_strength evidence_strength_label NOT NULL DEFAULT 'weak',
  dimensions JSONB NOT NULL DEFAULT '{}',
  probes_asked INTEGER NOT NULL DEFAULT 0,
  max_probes INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE understanding_probe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES understanding_assessment(id) ON DELETE CASCADE,
  target_dimension understanding_dimension NOT NULL,
  target_concept TEXT NOT NULL,
  probe_type probe_type NOT NULL,
  difficulty difficulty_rung NOT NULL,
  purpose TEXT NOT NULL,
  question TEXT NOT NULL,
  grounding JSONB NOT NULL DEFAULT '{}',
  expected_reasoning TEXT NOT NULL,
  evaluation_criteria TEXT[] NOT NULL DEFAULT '{}',
  expected_evidence TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE understanding_response (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES understanding_assessment(id) ON DELETE CASCADE,
  probe_id UUID NOT NULL REFERENCES understanding_probe(id) ON DELETE CASCADE,
  dimension understanding_dimension NOT NULL,
  concept TEXT NOT NULL,
  probe_type probe_type NOT NULL,
  question TEXT NOT NULL,
  student_response TEXT NOT NULL,
  observed_evidence TEXT NOT NULL DEFAULT '',
  result evidence_result NOT NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.0 CHECK (confidence BETWEEN 0 AND 1),
  ai_provider_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE understanding_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES understanding_assessment(id) ON DELETE CASCADE,
  dimension understanding_dimension NOT NULL,
  concept TEXT NOT NULL,
  probe_id UUID NOT NULL,
  probe_type probe_type NOT NULL,
  expected_evidence TEXT NOT NULL,
  observed_evidence TEXT NOT NULL,
  result evidence_result NOT NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.0 CHECK (confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE understanding_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  classification result_classification NOT NULL,
  procedural_score NUMERIC(5,2) NOT NULL,
  conceptual_score NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 22: DEBUGGING MODE
-- ============================================================================

CREATE TABLE debugging_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  submission_id UUID,
  language debug_supported_language NOT NULL DEFAULT 'python',
  state session_state NOT NULL DEFAULT 'NOT_STARTED',
  current_code TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE debugging_fingerprint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES debugging_session(id) ON DELETE CASCADE,
  failure_type failure_class NOT NULL,
  input TEXT,
  expected_output TEXT,
  actual_output TEXT,
  error_message TEXT,
  stack_trace TEXT,
  source_location JSONB,
  runtime debug_supported_language NOT NULL DEFAULT 'python',
  execution_time_ms INTEGER,
  memory_usage_kb INTEGER,
  reproduction_status reproduction_status NOT NULL DEFAULT 'NOT_ATTEMPTED',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE debugging_hypothesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES debugging_session(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  suspected_location TEXT,
  suspected_cause TEXT,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.0 CHECK (confidence BETWEEN 0 AND 100),
  status debugging_hypothesis_status NOT NULL DEFAULT 'PROPOSED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE debugging_experiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES debugging_session(id) ON DELETE CASCADE,
  hypothesis_id UUID NOT NULL REFERENCES debugging_hypothesis(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  actual_result TEXT,
  conclusion experiment_conclusion,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE debugging_action (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES debugging_session(id) ON DELETE CASCADE,
  type debug_action_type NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE debugging_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES debugging_session(id) ON DELETE CASCADE,
  status debugging_result_status NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '[]',
  root_cause JSONB,
  regression JSONB,
  overfitting JSONB,
  report JSONB NOT NULL DEFAULT '{}',
  timeline JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE debugging_generated_mutation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES debugging_session(id) ON DELETE CASCADE,
  original_code TEXT NOT NULL,
  mutated_code TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 23: DEBUGGING COACH
-- ============================================================================

CREATE TABLE coaching_progress_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES debugging_session(id) ON DELETE CASCADE,
  phase coaching_phase NOT NULL DEFAULT 'OBSERVATION',
  completed_phases coaching_phase[] NOT NULL DEFAULT '{}',
  stuck_counter INTEGER NOT NULL DEFAULT 0,
  last_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE next_best_action (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES debugging_session(id) ON DELETE CASCADE,
  action_type next_best_action_type NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  rationale TEXT NOT NULL,
  target_location TEXT,
  coaching_message TEXT NOT NULL,
  expected_outcome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 24: CODE REVIEW MODE
-- ============================================================================

CREATE TABLE code_review (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  language supported_language NOT NULL DEFAULT 'python',
  verdict review_verdict NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE review_finding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES code_review(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  severity review_finding_severity NOT NULL,
  category review_finding_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_path TEXT,
  line_start INTEGER,
  line_end INTEGER,
  status review_finding_status NOT NULL DEFAULT 'OPEN',
  confidence quality_confidence NOT NULL,
  suggested_fix TEXT,
  evidence_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE review_relationship (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES code_review(id) ON DELETE CASCADE,
  from_finding_id UUID NOT NULL REFERENCES review_finding(id) ON DELETE CASCADE,
  to_finding_id UUID NOT NULL REFERENCES review_finding(id) ON DELETE CASCADE,
  type review_relationship_type NOT NULL
);

CREATE TABLE reconciliation_response (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES code_review(id) ON DELETE CASCADE,
  finding_id UUID NOT NULL REFERENCES review_finding(id) ON DELETE CASCADE,
  accepted BOOLEAN NOT NULL,
  resolution TEXT NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 25: ADAPTIVE CHALLENGE ENGINE
-- ============================================================================

CREATE TABLE challenge_metadata (
  challenge_id UUID PRIMARY KEY REFERENCES challenge(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subtopics TEXT[] NOT NULL DEFAULT '{}',
  learning_objectives TEXT[] NOT NULL DEFAULT '{}',
  primary_skill_id UUID NOT NULL REFERENCES skill(id),
  supporting_skill_ids UUID[] NOT NULL DEFAULT '{}',
  difficulty JSONB NOT NULL DEFAULT '{}',
  prerequisites UUID[] NOT NULL DEFAULT '{}',
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  estimated_time_minutes INTEGER NOT NULL DEFAULT 30,
  supported_languages supported_language[] NOT NULL DEFAULT ARRAY['python']::supported_language[],
  challenge_family TEXT NOT NULL DEFAULT 'general',
  family_tier TEXT NOT NULL DEFAULT 'BASIC' CHECK (family_tier IN ('BASIC','INTERMEDIATE','ADVANCED','TRANSFER')),
  transfer_group TEXT NOT NULL DEFAULT 'none',
  curriculum_tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','VALIDATING','ACTIVE','DEGRADED','RETIRED')),
  is_diagnostic BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE challenge_health (
  challenge_id UUID PRIMARY KEY REFERENCES challenge(id) ON DELETE CASCADE,
  attempt_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  failure_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  avg_solve_time_seconds NUMERIC(8,2) NOT NULL DEFAULT 0,
  hint_usage_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  abandonment_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  ambiguity_flag_count INTEGER NOT NULL DEFAULT 0,
  quality_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0 CHECK (quality_multiplier BETWEEN 0 AND 1),
  is_flagged_broken BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE adaptive_path_state (
  student_id UUID PRIMARY KEY REFERENCES student(id) ON DELETE CASCADE,
  current_stage path_stage NOT NULL DEFAULT 'FOUNDATION',
  history JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE selection_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  student_model_version TEXT NOT NULL,
  selector_version TEXT NOT NULL,
  weights_version TEXT NOT NULL,
  candidate_set TEXT[] NOT NULL DEFAULT '{}',
  hard_constraints_applied TEXT[] NOT NULL DEFAULT '{}',
  stage_trace JSONB NOT NULL DEFAULT '[]',
  ranking_factors JSONB NOT NULL DEFAULT '[]',
  selected_challenge_id UUID,
  no_eligible_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 26: SKILL SIGNAL INTELLIGENCE (canonical evidence bus)
-- ============================================================================

CREATE TABLE skill_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  source_type signal_evidence_type NOT NULL,
  source_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  difficulty NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (difficulty BETWEEN 0 AND 1),
  context_group TEXT NOT NULL DEFAULT 'default',
  assessment_tier signal_assessment_tier NOT NULL DEFAULT 'PRACTICE',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence_version INTEGER NOT NULL DEFAULT 1,
  policy_version TEXT NOT NULL DEFAULT 'v1',
  UNIQUE (source_type, source_id, skill_id, evidence_version)
);

CREATE TABLE normalized_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  source_type signal_evidence_type NOT NULL,
  source_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  raw_value JSONB,
  normalized_value NUMERIC(3,2) NOT NULL CHECK (normalized_value BETWEEN 0 AND 1),
  status signal_evidence_status NOT NULL DEFAULT 'VALID',
  difficulty NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (difficulty BETWEEN 0 AND 1),
  context_group TEXT NOT NULL DEFAULT 'default',
  assessment_tier signal_assessment_tier NOT NULL DEFAULT 'PRACTICE',
  source_reliability NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (source_reliability BETWEEN 0 AND 1),
  independence NUMERIC(3,2) NOT NULL DEFAULT 1.0 CHECK (independence BETWEEN 0 AND 1),
  is_transfer BOOLEAN NOT NULL DEFAULT FALSE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence_version INTEGER NOT NULL DEFAULT 1,
  policy_version TEXT NOT NULL DEFAULT 'v1'
);

CREATE TABLE skill_signal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  signal NUMERIC(3,2) NOT NULL CHECK (signal BETWEEN 0 AND 1),
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  state signal_skill_state NOT NULL DEFAULT 'UNKNOWN',
  trend signal_trend NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  freshness signal_freshness NOT NULL DEFAULT 'UNKNOWN',
  evidence_count INTEGER NOT NULL DEFAULT 0,
  diversity NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (diversity BETWEEN 0 AND 1),
  transfer_confidence NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (transfer_confidence BETWEEN 0 AND 1),
  retention NUMERIC(3,2) CHECK (retention BETWEEN 0 AND 1),
  last_demonstrated_at TIMESTAMPTZ,
  first_observed_at TIMESTAMPTZ,
  contradiction BOOLEAN NOT NULL DEFAULT FALSE,
  model_version TEXT NOT NULL DEFAULT 'skill-signal-engine-v1',
  policy_version TEXT NOT NULL DEFAULT 'v1',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (student_id, skill_id)
);

CREATE TABLE skill_signal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  signal NUMERIC(3,2) NOT NULL CHECK (signal BETWEEN 0 AND 1),
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  state signal_skill_state NOT NULL,
  trend signal_trend NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  policy_version TEXT NOT NULL DEFAULT 'v1'
);

-- ============================================================================
-- PART 27 (canonical): GROWTH INTELLIGENCE
-- (absorbs unique value from Part 28 independence/transfer and Part 29 regression/trends)
-- ============================================================================

CREATE TABLE growth_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  source growth_evidence_source NOT NULL,
  source_record_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  evidence_type growth_evidence_quality NOT NULL,
  outcome growth_evidence_outcome NOT NULL,
  strength NUMERIC(3,2) NOT NULL CHECK (strength BETWEEN 0 AND 1),
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  challenge_context JSONB,
  role_context TEXT,
  transfer_context JSONB,
  metadata JSONB,
  evidence_model_version TEXT NOT NULL DEFAULT 'v1',
  UNIQUE (source, source_record_id, skill_id)
);

CREATE TABLE growth_skill_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  state growth_state NOT NULL DEFAULT 'NO_EVIDENCE',
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  last_evidence_at TIMESTAMPTZ,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  trend TEXT NOT NULL DEFAULT 'INSUFFICIENT' CHECK (trend IN ('IMPROVING','STABLE','DECLINING','INSUFFICIENT')),
  trajectory NUMERIC[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, skill_id)
);

CREATE TABLE growth_milestone (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  type growth_milestone_type NOT NULL,
  reached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  UNIQUE (student_id, skill_id, type)
);

CREATE TABLE growth_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  type growth_event_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE growth_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  skill_states JSONB NOT NULL DEFAULT '[]',
  milestones JSONB NOT NULL DEFAULT '[]',
  model_version TEXT NOT NULL DEFAULT 'v1'
);

-- ============================================================================
-- PART 30: ROLE SKILL GAP ANALYSIS
-- ============================================================================

CREATE TABLE role_skill_gap_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  role_version INTEGER NOT NULL DEFAULT 1,
  overall_readiness NUMERIC(5,2) NOT NULL DEFAULT 0.0 CHECK (overall_readiness BETWEEN 0 AND 100),
  gaps JSONB NOT NULL DEFAULT '[]',
  model_version TEXT NOT NULL DEFAULT 'v1',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, role_id, role_version)
);

-- ============================================================================
-- PART 31: ROLE READINESS ENGINE
-- ============================================================================

CREATE TABLE role_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  readiness_state readiness_state_31 NOT NULL DEFAULT 'NOT_READY',
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0.0 CHECK (overall_score BETWEEN 0 AND 100),
  blockers JSONB NOT NULL DEFAULT '[]',
  strengths TEXT[] NOT NULL DEFAULT '{}',
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, role_id)
);

-- ============================================================================
-- PART 32: AI GATEWAY (control plane)
-- ============================================================================

CREATE TABLE gateway_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  operation gateway_operation NOT NULL,
  provider gateway_provider NOT NULL DEFAULT 'mock',
  model TEXT NOT NULL DEFAULT 'unknown',
  prompt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  latency_ms INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC(10,6) NOT NULL DEFAULT 0.0,
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  resilience_state resilience_state NOT NULL DEFAULT 'HEALTHY',
  degraded BOOLEAN NOT NULL DEFAULT FALSE,
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_correctness_assessment_submission ON correctness_assessment(submission_id);
CREATE INDEX idx_correctness_assessment_user ON correctness_assessment(user_id);
CREATE INDEX idx_correctness_finding_assessment ON correctness_finding(assessment_id);
CREATE INDEX idx_requirement_check_assessment ON requirement_check(assessment_id);
CREATE INDEX idx_complexity_assessment_submission ON complexity_assessment(submission_id);
CREATE INDEX idx_complexity_assessment_user ON complexity_assessment(user_id);
CREATE INDEX idx_quality_assessment_submission ON quality_assessment(submission_id);
CREATE INDEX idx_quality_assessment_user ON quality_assessment(user_id);
CREATE INDEX idx_quality_finding_assessment ON quality_finding(assessment_id);
CREATE INDEX idx_reasoning_report_submission ON reasoning_report(submission_id);
CREATE INDEX idx_reasoning_report_user ON reasoning_report(user_id);
CREATE INDEX idx_consistency_report_submission ON consistency_report(submission_id);
CREATE INDEX idx_consistency_report_user ON consistency_report(user_id);
CREATE INDEX idx_understanding_assessment_student ON understanding_assessment(student_id);
CREATE INDEX idx_understanding_assessment_challenge ON understanding_assessment(challenge_id);
CREATE INDEX idx_understanding_probe_assessment ON understanding_probe(assessment_id);
CREATE INDEX idx_understanding_response_assessment ON understanding_response(assessment_id);
CREATE INDEX idx_understanding_evidence_assessment ON understanding_evidence(assessment_id);
CREATE INDEX idx_understanding_history_student ON understanding_history(student_id);
CREATE INDEX idx_debugging_session_user ON debugging_session(user_id);
CREATE INDEX idx_debugging_session_challenge ON debugging_session(challenge_id);
CREATE INDEX idx_debugging_fingerprint_session ON debugging_fingerprint(session_id);
CREATE INDEX idx_debugging_hypothesis_session ON debugging_hypothesis(session_id);
CREATE INDEX idx_debugging_experiment_session ON debugging_experiment(session_id);
CREATE INDEX idx_debugging_action_session ON debugging_action(session_id);
CREATE INDEX idx_debugging_result_session ON debugging_result(session_id);
CREATE INDEX idx_debugging_mutation_session ON debugging_generated_mutation(session_id);
CREATE INDEX idx_coaching_progress_session ON coaching_progress_state(session_id);
CREATE INDEX idx_next_best_action_session ON next_best_action(session_id);
CREATE INDEX idx_code_review_submission ON code_review(submission_id);
CREATE INDEX idx_code_review_user ON code_review(user_id);
CREATE INDEX idx_review_finding_review ON review_finding(review_id);
CREATE INDEX idx_review_relationship_review ON review_relationship(review_id);
CREATE INDEX idx_reconciliation_response_review ON reconciliation_response(review_id);
CREATE INDEX idx_challenge_metadata_skill ON challenge_metadata(primary_skill_id);
CREATE INDEX idx_challenge_health_challenge ON challenge_health(challenge_id);
CREATE INDEX idx_adaptive_path_state_student ON adaptive_path_state(student_id);
CREATE INDEX idx_selection_audit_student ON selection_audit(student_id);
CREATE INDEX idx_skill_evidence_student ON skill_evidence(student_id);
CREATE INDEX idx_skill_evidence_skill ON skill_evidence(skill_id);
CREATE INDEX idx_normalized_evidence_student ON normalized_evidence(student_id);
CREATE INDEX idx_skill_signal_student ON skill_signal(student_id);
CREATE INDEX idx_skill_signal_skill ON skill_signal(skill_id);
CREATE INDEX idx_skill_signal_history_student ON skill_signal_history(student_id);
CREATE INDEX idx_growth_evidence_student ON growth_evidence(student_id);
CREATE INDEX idx_growth_evidence_skill ON growth_evidence(skill_id);
CREATE INDEX idx_growth_skill_state_student ON growth_skill_state(student_id);
CREATE INDEX idx_growth_milestone_student ON growth_milestone(student_id);
CREATE INDEX idx_growth_event_student ON growth_event(student_id);
CREATE INDEX idx_growth_snapshot_student ON growth_snapshot(student_id);
CREATE INDEX idx_role_skill_gap_profile_student ON role_skill_gap_profile(student_id);
CREATE INDEX idx_role_skill_gap_profile_role ON role_skill_gap_profile(role_id);
CREATE INDEX idx_role_readiness_student ON role_readiness(student_id);
CREATE INDEX idx_role_readiness_role ON role_readiness(role_id);
CREATE INDEX idx_gateway_request_log_operation ON gateway_request_log(operation);
CREATE INDEX idx_gateway_request_log_correlation ON gateway_request_log(correlation_id);
