-- ============================================================================
-- CodeForge AI — Row Level Security Policies
-- Merged from Parts 1, 4, 5, 6, 8, 9, 11, 13, 14, 15
-- ============================================================================

-- Enable RLS on all tables that need it
-- (Tables without RLS: career_domain, role_family, role, role_version, competency, skill, technology,
--  institution, challenge, challenge_test_case, challenge_skill, diagnostic_session, diagnostic_attempt,
--  interview_blueprint, incident_blueprint, project, project_test_case)

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current student ID from JWT claims
CREATE OR REPLACE FUNCTION current_student_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims.student_id', true), '')::UUID,
    NULLIF(current_setting('request.jwt.claims.sub', true), '')::UUID
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current user role from JWT claims
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims.role', true), ''),
    'student'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user is staff
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT current_user_role() IN ('staff', 'admin', 'tpo');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user is TPO for a specific student
CREATE OR REPLACE FUNCTION is_tpo_for_student(target_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM student s
    JOIN institution i ON s.institution_id = i.id
    WHERE s.id = target_student_id
    AND i.id = (
      SELECT institution_id FROM student WHERE id = current_student_id()
    )
  ) AND current_user_role() = 'tpo';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user owns a resource
CREATE OR REPLACE FUNCTION owns_resource(resource_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT current_student_id() = resource_student_id OR is_staff();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- PART 1: ROLE CONTEXT & CAREER IDENTITY
-- ============================================================================

-- student_career_context: Students can read/update their own; staff/TPO can read assigned
ALTER TABLE student_career_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_career_context_select ON student_career_context
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY student_career_context_insert ON student_career_context
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

CREATE POLICY student_career_context_update ON student_career_context
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

-- student_role_history: Students can read their own; staff/TPO can read assigned
ALTER TABLE student_role_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_role_history_select ON student_role_history
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY student_role_history_insert ON student_role_history
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

-- role_variant: Institution members can read their institution's variants
ALTER TABLE role_variant ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_variant_select ON role_variant
  FOR SELECT USING (
    is_staff() OR
    EXISTS (
      SELECT 1 FROM student s
      WHERE s.id = current_student_id()
      AND s.institution_id = role_variant.institution_id
    )
  );

-- ============================================================================
-- PART 3, 5, 9: MASTERY & EVIDENCE
-- ============================================================================

-- student_skill_state: Students can read their own; staff/TPO can read assigned
ALTER TABLE student_skill_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_skill_state_select ON student_skill_state
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY student_skill_state_upsert ON student_skill_state
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

CREATE POLICY student_skill_state_update ON student_skill_state
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

-- evidence: Students can read their own evidence; staff/TPO can read assigned
-- Direct INSERT/UPDATE/DELETE by clients is FORBIDDEN - only via service layer
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY evidence_select ON evidence
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

-- No INSERT/UPDATE/DELETE policies for clients - service role only
-- Service role bypasses RLS entirely

-- misconception: Students can read their own; staff/TPO can read assigned
ALTER TABLE misconception ENABLE ROW LEVEL SECURITY;

CREATE POLICY misconception_select ON misconception
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

-- No direct client mutations

-- ============================================================================
-- PART 5, 6: RECOMMENDATIONS & ROADMAP
-- ============================================================================

-- recommendation: Students can read/accept their own; staff/TPO can read assigned
ALTER TABLE recommendation ENABLE ROW LEVEL SECURITY;

CREATE POLICY recommendation_select ON recommendation
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY recommendation_update ON recommendation
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

-- No direct INSERT/DELETE by clients

-- milestone: Students can read their own; staff/TPO can read assigned
ALTER TABLE milestone ENABLE ROW LEVEL SECURITY;

CREATE POLICY milestone_select ON milestone
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY milestone_update ON milestone
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

-- daily_plan: Students can read their own; staff/TPO can read assigned
ALTER TABLE daily_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_plan_select ON daily_plan
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

-- weekly_plan: Students can read their own; staff/TPO can read assigned
ALTER TABLE weekly_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY weekly_plan_select ON weekly_plan
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

-- ============================================================================
-- PART 2: DIAGNOSTIC
-- ============================================================================

ALTER TABLE diagnostic_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY diagnostic_session_select ON diagnostic_session
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY diagnostic_session_insert ON diagnostic_session
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

CREATE POLICY diagnostic_session_update ON diagnostic_session
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE diagnostic_attempt ENABLE ROW LEVEL SECURITY;

CREATE POLICY diagnostic_attempt_select ON diagnostic_attempt
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM diagnostic_session WHERE id = diagnostic_attempt.session_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM diagnostic_session WHERE id = diagnostic_attempt.session_id)
    )
  );

CREATE POLICY diagnostic_attempt_insert ON diagnostic_attempt
  FOR INSERT WITH CHECK (
    owns_resource(
      (SELECT student_id FROM diagnostic_session WHERE id = diagnostic_attempt.session_id)
    )
  );

-- ============================================================================
-- PART 8: INTERVIEW SIMULATION
-- ============================================================================

ALTER TABLE interview ENABLE ROW LEVEL SECURITY;

CREATE POLICY interview_select ON interview
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY interview_insert ON interview
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

CREATE POLICY interview_update ON interview
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE interview_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY interview_session_select ON interview_session
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY interview_session_insert ON interview_session
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

CREATE POLICY interview_session_update ON interview_session
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE interview_problem ENABLE ROW LEVEL SECURITY;

CREATE POLICY interview_problem_select ON interview_problem
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM interview WHERE id = interview_problem.interview_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM interview WHERE id = interview_problem.interview_id)
    )
  );

ALTER TABLE interview_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY interview_event_select ON interview_event
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM interview WHERE id = interview_event.interview_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM interview WHERE id = interview_event.interview_id)
    )
  );

CREATE POLICY interview_event_insert ON interview_event
  FOR INSERT WITH CHECK (
    owns_resource(
      (SELECT student_id FROM interview WHERE id = interview_event.interview_id)
    )
  );

ALTER TABLE interview_evaluation ENABLE ROW LEVEL SECURITY;

CREATE POLICY interview_evaluation_select ON interview_evaluation
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM interview WHERE id = interview_evaluation.interview_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM interview WHERE id = interview_evaluation.interview_id)
    )
  );

-- ============================================================================
-- PART 11: INCIDENT ENGINE
-- ============================================================================

ALTER TABLE incident ENABLE ROW LEVEL SECURITY;

CREATE POLICY incident_select ON incident
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY incident_insert ON incident
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

CREATE POLICY incident_update ON incident
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE incident_hypothesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY incident_hypothesis_select ON incident_hypothesis
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY incident_hypothesis_insert ON incident_hypothesis
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

CREATE POLICY incident_hypothesis_update ON incident_hypothesis
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE incident_action ENABLE ROW LEVEL SECURITY;

CREATE POLICY incident_action_select ON incident_action
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY incident_action_insert ON incident_action
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE incident_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY incident_log_select ON incident_log
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM incident WHERE id = incident_log.incident_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM incident WHERE id = incident_log.incident_id)
    )
  );

ALTER TABLE incident_metric ENABLE ROW LEVEL SECURITY;

CREATE POLICY incident_metric_select ON incident_metric
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM incident WHERE id = incident_metric.incident_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM incident WHERE id = incident_metric.incident_id)
    )
  );

ALTER TABLE incident_trace ENABLE ROW LEVEL SECURITY;

CREATE POLICY incident_trace_select ON incident_trace
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM incident WHERE id = incident_trace.incident_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM incident WHERE id = incident_trace.incident_id)
    )
  );

ALTER TABLE postmortem ENABLE ROW LEVEL SECURITY;

CREATE POLICY postmortem_select ON postmortem
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY postmortem_insert ON postmortem
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

-- ============================================================================
-- PART 10: ENGINEERING SIMULATOR
-- ============================================================================

ALTER TABLE project_submission ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_submission_select ON project_submission
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY project_submission_insert ON project_submission
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE project_evaluation ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_evaluation_select ON project_evaluation
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

ALTER TABLE project_revision ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_revision_select ON project_revision
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY project_revision_insert ON project_revision
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

-- ============================================================================
-- PART 12, 13: SUBMISSION SYSTEM & EXECUTION ANALYSIS
-- ============================================================================

ALTER TABLE submission ENABLE ROW LEVEL SECURITY;

CREATE POLICY submission_select ON submission
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY submission_insert ON submission
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

CREATE POLICY submission_update ON submission
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE submission_result ENABLE ROW LEVEL SECURITY;

CREATE POLICY submission_result_select ON submission_result
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM submission WHERE id = submission_result.submission_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM submission WHERE id = submission_result.submission_id)
    )
  );

ALTER TABLE normalized_execution_result ENABLE ROW LEVEL SECURITY;

CREATE POLICY normalized_execution_result_select ON normalized_execution_result
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM submission WHERE id = normalized_execution_result.submission_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM submission WHERE id = normalized_execution_result.submission_id)
    )
  );

-- ============================================================================
-- PART 14: AI CODE COACH
-- ============================================================================

ALTER TABLE coach_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY coach_session_select ON coach_session
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY coach_session_insert ON coach_session
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

CREATE POLICY coach_session_update ON coach_session
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE coach_message ENABLE ROW LEVEL SECURITY;

CREATE POLICY coach_message_select ON coach_message
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM coach_session WHERE id = coach_message.session_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM coach_session WHERE id = coach_message.session_id)
    )
  );

CREATE POLICY coach_message_insert ON coach_message
  FOR INSERT WITH CHECK (
    owns_resource(
      (SELECT student_id FROM coach_session WHERE id = coach_message.session_id)
    )
  );

ALTER TABLE coach_observation ENABLE ROW LEVEL SECURITY;

CREATE POLICY coach_observation_select ON coach_observation
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM coach_session WHERE id = coach_observation.session_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM coach_session WHERE id = coach_observation.session_id)
    )
  );

-- ============================================================================
-- PART 15: HINT LADDER
-- ============================================================================

ALTER TABLE hint_ladder_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY hint_ladder_session_select ON hint_ladder_session
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY hint_ladder_session_insert ON hint_ladder_session
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

CREATE POLICY hint_ladder_session_update ON hint_ladder_session
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE hint_rung ENABLE ROW LEVEL SECURITY;

CREATE POLICY hint_rung_select ON hint_rung
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM hint_ladder_session WHERE id = hint_rung.session_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM hint_ladder_session WHERE id = hint_rung.session_id)
    )
  );

CREATE POLICY hint_rung_insert ON hint_rung
  FOR INSERT WITH CHECK (
    owns_resource(
      (SELECT student_id FROM hint_ladder_session WHERE id = hint_rung.session_id)
    )
  );

-- ============================================================================
-- AUDIT EVENTS
-- ============================================================================

ALTER TABLE audit_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_event_select ON audit_event
  FOR SELECT USING (
    is_staff() OR
    (student_id IS NOT NULL AND owns_resource(student_id))
  );

-- Service role inserts only
-- No client INSERT policy

-- ============================================================================
-- GRANT PERMISSIONS FOR AUTHENTICATED ROLES
-- ============================================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant SELECT on reference tables (no RLS needed but explicit grants)
GRANT SELECT ON career_domain TO authenticated;
GRANT SELECT ON role_family TO authenticated;
GRANT SELECT ON role TO authenticated;
GRANT SELECT ON role_version TO authenticated;
GRANT SELECT ON competency TO authenticated;
GRANT SELECT ON skill TO authenticated;
GRANT SELECT ON technology TO authenticated;
GRANT SELECT ON institution TO authenticated;
GRANT SELECT ON challenge TO authenticated;
GRANT SELECT ON challenge_test_case TO authenticated;
GRANT SELECT ON challenge_skill TO authenticated;
GRANT SELECT ON interview_blueprint TO authenticated;
GRANT SELECT ON incident_blueprint TO authenticated;
GRANT SELECT ON project TO authenticated;
GRANT SELECT ON project_test_case TO authenticated;

-- Grant SELECT/INSERT/UPDATE on RLS-protected tables
GRANT SELECT, INSERT, UPDATE ON student_career_context TO authenticated;
GRANT SELECT, INSERT ON student_role_history TO authenticated;
GRANT SELECT ON role_variant TO authenticated;

GRANT SELECT, INSERT, UPDATE ON student_skill_state TO authenticated;
GRANT SELECT ON evidence TO authenticated;
GRANT SELECT ON misconception TO authenticated;

GRANT SELECT, UPDATE ON recommendation TO authenticated;
GRANT SELECT, UPDATE ON milestone TO authenticated;
GRANT SELECT ON daily_plan TO authenticated;
GRANT SELECT ON weekly_plan TO authenticated;

GRANT SELECT, INSERT, UPDATE ON diagnostic_session TO authenticated;
GRANT SELECT, INSERT ON diagnostic_attempt TO authenticated;

GRANT SELECT, INSERT, UPDATE ON interview TO authenticated;
GRANT SELECT, INSERT, UPDATE ON interview_session TO authenticated;
GRANT SELECT ON interview_problem TO authenticated;
GRANT SELECT, INSERT ON interview_event TO authenticated;
GRANT SELECT ON interview_evaluation TO authenticated;

GRANT SELECT, INSERT, UPDATE ON incident TO authenticated;
GRANT SELECT, INSERT, UPDATE ON incident_hypothesis TO authenticated;
GRANT SELECT, INSERT ON incident_action TO authenticated;
GRANT SELECT ON incident_log TO authenticated;
GRANT SELECT ON incident_metric TO authenticated;
GRANT SELECT ON incident_trace TO authenticated;
GRANT SELECT, INSERT ON postmortem TO authenticated;

GRANT SELECT, INSERT ON project_submission TO authenticated;
GRANT SELECT ON project_evaluation TO authenticated;
GRANT SELECT, INSERT ON project_revision TO authenticated;

GRANT SELECT, INSERT, UPDATE ON submission TO authenticated;
GRANT SELECT ON submission_result TO authenticated;
GRANT SELECT ON normalized_execution_result TO authenticated;

GRANT SELECT, INSERT, UPDATE ON coach_session TO authenticated;
GRANT SELECT, INSERT ON coach_message TO authenticated;
GRANT SELECT ON coach_observation TO authenticated;

GRANT SELECT, INSERT, UPDATE ON hint_ladder_session TO authenticated;
GRANT SELECT, INSERT ON hint_rung TO authenticated;

GRANT SELECT ON audit_event TO authenticated;

-- Service role (bypasses RLS) gets full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- RLS POLICY FOR STUDENT TABLE ITSELF
-- ============================================================================

ALTER TABLE student ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_select ON student
  FOR SELECT USING (
    owns_resource(id) OR is_tpo_for_student(id)
  );

CREATE POLICY student_update ON student
  FOR UPDATE USING (
    owns_resource(id)
  ) WITH CHECK (
    owns_resource(id)
  );

-- ============================================================================
-- PART 16: CODE CORRECTNESS ANALYSIS
-- ============================================================================

ALTER TABLE correctness_assessment ENABLE ROW LEVEL SECURITY;

CREATE POLICY correctness_assessment_select ON correctness_assessment
  FOR SELECT USING (
    owns_resource(user_id) OR is_tpo_for_student(user_id)
  );

-- Service role only for inserts/updates

ALTER TABLE correctness_finding ENABLE ROW LEVEL SECURITY;

CREATE POLICY correctness_finding_select ON correctness_finding
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM correctness_assessment WHERE id = correctness_finding.assessment_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM correctness_assessment WHERE id = correctness_finding.assessment_id)
    )
  );

ALTER TABLE requirement_check ENABLE ROW LEVEL SECURITY;

CREATE POLICY requirement_check_select ON requirement_check
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM correctness_assessment WHERE id = requirement_check.assessment_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM correctness_assessment WHERE id = requirement_check.assessment_id)
    )
  );

-- ============================================================================
-- PART 17: COMPLEXITY ANALYSIS
-- ============================================================================

ALTER TABLE complexity_assessment ENABLE ROW LEVEL SECURITY;

CREATE POLICY complexity_assessment_select ON complexity_assessment
  FOR SELECT USING (
    owns_resource(user_id) OR is_tpo_for_student(user_id)
  );

-- ============================================================================
-- PART 18: CODE QUALITY ENGINE
-- ============================================================================

ALTER TABLE quality_assessment ENABLE ROW LEVEL SECURITY;

CREATE POLICY quality_assessment_select ON quality_assessment
  FOR SELECT USING (
    owns_resource(user_id) OR is_tpo_for_student(user_id)
  );

ALTER TABLE quality_finding ENABLE ROW LEVEL SECURITY;

CREATE POLICY quality_finding_select ON quality_finding
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM quality_assessment WHERE id = quality_finding.assessment_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM quality_assessment WHERE id = quality_finding.assessment_id)
    )
  );

-- ============================================================================
-- PART 19: REASONING VERIFICATION
-- ============================================================================

ALTER TABLE reasoning_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY reasoning_report_select ON reasoning_report
  FOR SELECT USING (
    owns_resource(user_id) OR is_tpo_for_student(user_id)
  );

-- ============================================================================
-- PART 20: CODE-REASONING CONSISTENCY
-- ============================================================================

ALTER TABLE consistency_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY consistency_report_select ON consistency_report
  FOR SELECT USING (
    owns_resource(user_id) OR is_tpo_for_student(user_id)
  );

-- ============================================================================
-- PART 21: UNDERSTANDING CHECK
-- ============================================================================

ALTER TABLE understanding_assessment ENABLE ROW LEVEL SECURITY;

CREATE POLICY understanding_assessment_select ON understanding_assessment
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY understanding_assessment_insert ON understanding_assessment
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

CREATE POLICY understanding_assessment_update ON understanding_assessment
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE understanding_probe ENABLE ROW LEVEL SECURITY;

CREATE POLICY understanding_probe_select ON understanding_probe
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM understanding_assessment WHERE id = understanding_probe.assessment_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM understanding_assessment WHERE id = understanding_probe.assessment_id)
    )
  );

ALTER TABLE understanding_response ENABLE ROW LEVEL SECURITY;

CREATE POLICY understanding_response_select ON understanding_response
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM understanding_assessment WHERE id = understanding_response.assessment_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM understanding_assessment WHERE id = understanding_response.assessment_id)
    )
  );

CREATE POLICY understanding_response_insert ON understanding_response
  FOR INSERT WITH CHECK (
    owns_resource(
      (SELECT student_id FROM understanding_assessment WHERE id = understanding_response.assessment_id)
    )
  );

ALTER TABLE understanding_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY understanding_evidence_select ON understanding_evidence
  FOR SELECT USING (
    owns_resource(
      (SELECT student_id FROM understanding_assessment WHERE id = understanding_evidence.assessment_id)
    ) OR is_tpo_for_student(
      (SELECT student_id FROM understanding_assessment WHERE id = understanding_evidence.assessment_id)
    )
  );

ALTER TABLE understanding_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY understanding_history_select ON understanding_history
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

-- ============================================================================
-- PART 22: DEBUGGING MODE
-- ============================================================================

ALTER TABLE debugging_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY debugging_session_select ON debugging_session
  FOR SELECT USING (
    owns_resource(user_id) OR is_tpo_for_student(user_id)
  );

CREATE POLICY debugging_session_insert ON debugging_session
  FOR INSERT WITH CHECK (
    owns_resource(user_id)
  );

CREATE POLICY debugging_session_update ON debugging_session
  FOR UPDATE USING (
    owns_resource(user_id)
  ) WITH CHECK (
    owns_resource(user_id)
  );

ALTER TABLE debugging_fingerprint ENABLE ROW LEVEL SECURITY;

CREATE POLICY debugging_fingerprint_select ON debugging_fingerprint
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM debugging_session WHERE id = debugging_fingerprint.session_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM debugging_session WHERE id = debugging_fingerprint.session_id)
    )
  );

ALTER TABLE debugging_hypothesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY debugging_hypothesis_select ON debugging_hypothesis
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM debugging_session WHERE id = debugging_hypothesis.session_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM debugging_session WHERE id = debugging_hypothesis.session_id)
    )
  );

CREATE POLICY debugging_hypothesis_insert ON debugging_hypothesis
  FOR INSERT WITH CHECK (
    owns_resource(
      (SELECT user_id FROM debugging_session WHERE id = debugging_hypothesis.session_id)
    )
  );

CREATE POLICY debugging_hypothesis_update ON debugging_hypothesis
  FOR UPDATE USING (
    owns_resource(
      (SELECT user_id FROM debugging_session WHERE id = debugging_hypothesis.session_id)
    )
  ) WITH CHECK (
    owns_resource(
      (SELECT user_id FROM debugging_session WHERE id = debugging_hypothesis.session_id)
    )
  );

ALTER TABLE debugging_experiment ENABLE ROW LEVEL SECURITY;

CREATE POLICY debugging_experiment_select ON debugging_experiment
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM debugging_session WHERE id = debugging_experiment.session_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM debugging_session WHERE id = debugging_experiment.session_id)
    )
  );

CREATE POLICY debugging_experiment_insert ON debugging_experiment
  FOR INSERT WITH CHECK (
    owns_resource(
      (SELECT user_id FROM debugging_session WHERE id = debugging_experiment.session_id)
    )
  );

ALTER TABLE debugging_action ENABLE ROW LEVEL SECURITY;

CREATE POLICY debugging_action_select ON debugging_action
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM debugging_session WHERE id = debugging_action.session_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM debugging_session WHERE id = debugging_action.session_id)
    )
  );

CREATE POLICY debugging_action_insert ON debugging_action
  FOR INSERT WITH CHECK (
    owns_resource(
      (SELECT user_id FROM debugging_session WHERE id = debugging_action.session_id)
    )
  );

ALTER TABLE debugging_result ENABLE ROW LEVEL SECURITY;

CREATE POLICY debugging_result_select ON debugging_result
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM debugging_session WHERE id = debugging_result.session_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM debugging_session WHERE id = debugging_result.session_id)
    )
  );

ALTER TABLE debugging_generated_mutation ENABLE ROW LEVEL SECURITY;

CREATE POLICY debugging_generated_mutation_select ON debugging_generated_mutation
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM debugging_session WHERE id = debugging_generated_mutation.session_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM debugging_session WHERE id = debugging_generated_mutation.session_id)
    )
  );

-- ============================================================================
-- PART 23: DEBUGGING COACH
-- ============================================================================

ALTER TABLE coaching_progress_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY coaching_progress_state_select ON coaching_progress_state
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY coaching_progress_state_update ON coaching_progress_state
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE next_best_action ENABLE ROW LEVEL SECURITY;

CREATE POLICY next_best_action_select ON next_best_action
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM debugging_session WHERE id = next_best_action.session_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM debugging_session WHERE id = next_best_action.session_id)
    )
  );

-- ============================================================================
-- PART 24: CODE REVIEW MODE
-- ============================================================================

ALTER TABLE code_review ENABLE ROW LEVEL SECURITY;

CREATE POLICY code_review_select ON code_review
  FOR SELECT USING (
    owns_resource(user_id) OR is_tpo_for_student(user_id)
  );

CREATE POLICY code_review_insert ON code_review
  FOR INSERT WITH CHECK (
    owns_resource(user_id)
  );

ALTER TABLE review_finding ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_finding_select ON review_finding
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM code_review WHERE id = review_finding.review_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM code_review WHERE id = review_finding.review_id)
    )
  );

ALTER TABLE review_relationship ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_relationship_select ON review_relationship
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM code_review WHERE id = review_relationship.review_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM code_review WHERE id = review_relationship.review_id)
    )
  );

ALTER TABLE reconciliation_response ENABLE ROW LEVEL SECURITY;

CREATE POLICY reconciliation_response_select ON reconciliation_response
  FOR SELECT USING (
    owns_resource(
      (SELECT user_id FROM code_review WHERE id = reconciliation_response.review_id)
    ) OR is_tpo_for_student(
      (SELECT user_id FROM code_review WHERE id = reconciliation_response.review_id)
    )
  );

CREATE POLICY reconciliation_response_insert ON reconciliation_response
  FOR INSERT WITH CHECK (
    owns_resource(
      (SELECT user_id FROM code_review WHERE id = reconciliation_response.review_id)
    )
  );

-- ============================================================================
-- PART 25: ADAPTIVE CHALLENGE ENGINE
-- ============================================================================

ALTER TABLE challenge_metadata ENABLE ROW LEVEL SECURITY;

-- Reference data - all authenticated can read
GRANT SELECT ON challenge_metadata TO authenticated;

ALTER TABLE challenge_health ENABLE ROW LEVEL SECURITY;

-- Reference data - all authenticated can read
GRANT SELECT ON challenge_health TO authenticated;

ALTER TABLE adaptive_path_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY adaptive_path_state_select ON adaptive_path_state
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY adaptive_path_state_update ON adaptive_path_state
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE selection_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY selection_audit_select ON selection_audit
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

-- ============================================================================
-- PART 26: SKILL SIGNAL INTELLIGENCE
-- ============================================================================

ALTER TABLE skill_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY skill_evidence_select ON skill_evidence
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

-- Service role only for inserts (evidence ingestion is internal)

ALTER TABLE normalized_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY normalized_evidence_select ON normalized_evidence
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

-- Service role only for inserts/updates

ALTER TABLE skill_signal ENABLE ROW LEVEL SECURITY;

CREATE POLICY skill_signal_select ON skill_signal
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY skill_signal_update ON skill_signal
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

-- Service role handles upserts

ALTER TABLE skill_signal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY skill_signal_history_select ON skill_signal_history
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

-- ============================================================================
-- PART 27: GROWTH INTELLIGENCE
-- ============================================================================

ALTER TABLE growth_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY growth_evidence_select ON growth_evidence
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

ALTER TABLE growth_skill_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY growth_skill_state_select ON growth_skill_state
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

ALTER TABLE growth_milestone ENABLE ROW LEVEL SECURITY;

CREATE POLICY growth_milestone_select ON growth_milestone
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

ALTER TABLE growth_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY growth_event_select ON growth_event
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

ALTER TABLE growth_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY growth_snapshot_select ON growth_snapshot
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

-- ============================================================================
-- PART 30: ROLE SKILL GAP ANALYSIS
-- ============================================================================

ALTER TABLE role_skill_gap_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_skill_gap_profile_select ON role_skill_gap_profile
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY role_skill_gap_profile_insert ON role_skill_gap_profile
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

-- ============================================================================
-- PART 31: ROLE READINESS ENGINE
-- ============================================================================

ALTER TABLE role_readiness ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_readiness_select ON role_readiness
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

-- ============================================================================
-- PART 32: AI GATEWAY
-- ============================================================================

ALTER TABLE gateway_request_log ENABLE ROW LEVEL SECURITY;

-- Admin/service only - no student access to gateway logs
CREATE POLICY gateway_request_log_select ON gateway_request_log
  FOR SELECT USING (
    is_staff()
  );

-- Service role inserts only

-- ============================================================================
-- FUNCTION PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION current_student_id() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION is_tpo_for_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION owns_resource(UUID) TO authenticated;