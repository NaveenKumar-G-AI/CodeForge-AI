-- ============================================================================
-- CodeForge AI - Learning Session Orchestration (Part 7)
-- Appends to the unified schema with production persistence and RLS.
-- PostgreSQL 14+ / Supabase compatible
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE learning_session_mode AS ENUM (
  'FOCUSED_PRACTICE',
  'ROADMAP_BLOCK',
  'REVIEW',
  'ASSESSMENT_PREP',
  'INTERVIEW_PREP',
  'RECOVERY'
);

CREATE TYPE learning_session_state AS ENUM (
  'PLANNED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ABANDONED',
  'EXPIRED'
);

CREATE TYPE learning_session_event_type AS ENUM (
  'SESSION_CREATED',
  'SESSION_STARTED',
  'SESSION_PAUSED',
  'SESSION_RESUMED',
  'SESSION_COMPLETED',
  'SESSION_ABANDONED',
  'SESSION_EXPIRED',
  'ACTIVITY_STARTED',
  'ACTIVITY_COMPLETED',
  'ACTIVITY_SKIPPED',
  'EVIDENCE_ATTACHED',
  'NEXT_ACTION_RECOMMENDED'
);

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE learning_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  mode learning_session_mode NOT NULL,
  state learning_session_state NOT NULL DEFAULT 'PLANNED',
  title TEXT NOT NULL,
  focus_skills JSONB NOT NULL DEFAULT '[]',
  activities JSONB NOT NULL DEFAULT '[]',
  active_activity_id UUID,
  target_minutes INTEGER NOT NULL CHECK (target_minutes BETWEEN 5 AND 240),
  total_estimated_minutes INTEGER NOT NULL DEFAULT 0 CHECK (total_estimated_minutes >= 0),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at),
  CHECK (jsonb_typeof(focus_skills) = 'array'),
  CHECK (jsonb_typeof(activities) = 'array'),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE learning_session_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES learning_session(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  type learning_session_event_type NOT NULL,
  activity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(payload) = 'object')
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX learning_session_student_created_idx
  ON learning_session(student_id, created_at DESC);

CREATE INDEX learning_session_student_state_idx
  ON learning_session(student_id, state, updated_at DESC);

CREATE UNIQUE INDEX learning_session_one_running_idx
  ON learning_session(student_id)
  WHERE state IN ('ACTIVE', 'PAUSED');

CREATE INDEX learning_session_event_session_idx
  ON learning_session_event(session_id, created_at ASC);

CREATE INDEX learning_session_event_student_idx
  ON learning_session_event(student_id, created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE learning_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_session_select ON learning_session
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY learning_session_insert ON learning_session
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

CREATE POLICY learning_session_update ON learning_session
  FOR UPDATE USING (
    owns_resource(student_id)
  ) WITH CHECK (
    owns_resource(student_id)
  );

ALTER TABLE learning_session_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_session_event_select ON learning_session_event
  FOR SELECT USING (
    owns_resource(student_id) OR is_tpo_for_student(student_id)
  );

CREATE POLICY learning_session_event_insert ON learning_session_event
  FOR INSERT WITH CHECK (
    owns_resource(student_id)
  );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON learning_session TO authenticated;
GRANT SELECT, INSERT ON learning_session_event TO authenticated;

