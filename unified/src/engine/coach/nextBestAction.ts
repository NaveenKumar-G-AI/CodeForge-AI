// Debugging Coach Engine — Next Best Action Ranking
import {
  CoachingPhase,
  NextBestActionType,
  NextBestAction,
  CoachingProgressState,
  DebuggingSession,
  DebuggingHypothesis,
  Experiment,
  DebugAction,
  FailureClass,
} from '../../domain/types.js';

export interface CoachContext {
  session: DebuggingSession;
  hypotheses: DebuggingHypothesis[];
  experiments: Experiment[];
  actions: DebugAction[];
  fingerprint: any;
  rootCause: any | null;
  regression: any | null;
  overfitting: any | null;
  phase: CoachingPhase;
  stuckCounter: number;
}

/**
 * Rank next best actions based on current debugging state
 */
export function rankNextActions(context: CoachContext): NextBestAction[] {
  const actions: NextBestAction[] = [];

  const { session, hypotheses, experiments, actions: prevActions, phase, stuckCounter } = context;

  // Phase-specific action candidates
  switch (phase) {
    case 'OBSERVATION':
      actions.push(
        createAction('INSPECT_TRACE', 100, 'Review the error trace to understand the failure', 'error_trace', 'Start by examining the full stack trace and error message'),
        createAction('REPRODUCE', 90, 'Run the failing test to confirm the issue', undefined, 'Execute the failing test case to see the actual vs expected output'),
        createAction('INSPECT_OUTPUT', 80, 'Compare actual and expected outputs', undefined, 'Look at what the code actually produced vs what was expected'),
        createAction('REQUEST_HINT', 30, 'Get a hint about where to look', undefined, 'If stuck, request a hint about the failure type')
      );
      break;

    case 'HYPOTHESIS_FORMATION': {
      const hasHypothesis = hypotheses.some((h) => h.status !== 'REJECTED');
      actions.push(
        createAction('FORM_HYPOTHESIS', hasHypothesis ? 60 : 100, 'Create a hypothesis about the root cause', 'suspected_location', 'Based on observations, formulate a specific hypothesis about what is wrong'),
        createAction('INSPECT_VARIABLE', 80, 'Check variable values at key points', 'variable_name', 'Add print statements or use debugger to inspect variable states'),
        createAction('GATHER_EVIDENCE', 70, 'Run targeted tests to test your hypothesis', undefined, 'Execute specific test cases that would confirm or reject your hypothesis'),
        createAction('RUN_SELECTED_TEST', 60, 'Run a specific test case', 'test_id', 'Run a test that exercises the suspected code path')
      );
      break;
    }

    case 'EVIDENCE_GATHERING':
      actions.push(
        createAction('RUN_FAILING_TEST', 90, 'Re-run the original failing test', undefined, 'Confirm the failure still exists after any changes'),
        createAction('INSPECT_VARIABLE', 85, 'Inspect variables at the suspected location', 'variable_name', 'Check actual values vs expected values at the failure point'),
        createAction('GATHER_EVIDENCE', 80, 'Run additional test cases', undefined, 'Test edge cases and variations to understand the scope'),
        createAction('ROOT_CAUSE_ANALYSIS', 70, 'Analyze collected evidence for patterns', undefined, 'Look for common patterns in failing cases')
      );
      break;

    case 'ROOT_CAUSE': {
      const supportedHyp = hypotheses.find((h) => h.status === 'SUPPORTED');
      actions.push(
        createAction('ROOT_CAUSE_ANALYSIS', supportedHyp ? 90 : 80, 'Confirm root cause with evidence', 'root_cause', supportedHyp ? 'Validate your supported hypothesis' : 'Synthesize evidence into a root cause'),
        createAction('APPLY_FIX', supportedHyp ? 95 : 60, 'Implement the fix', 'code_location', supportedHyp ? 'Apply minimal fix for the confirmed root cause' : 'Apply fix based on best hypothesis'),
        createAction('REVERT_CHANGE', 40, 'Revert if fix made things worse', undefined, 'If the fix introduced new failures, revert and re-analyze')
      );
      break;
    }

    case 'FIX':
      actions.push(
        createAction('VERIFY_FIX', 100, 'Run the full test suite to verify the fix', undefined, 'Confirm the original failure is fixed and no regressions introduced'),
        createAction('RUN_FULL_SUITE', 95, 'Run all tests', undefined, 'Comprehensive test run to catch any regressions'),
        createAction('REVERT_CHANGE', 50, 'Revert if regressions found', undefined, 'If new failures appear, revert and try a different approach')
      );
      break;

    case 'VERIFICATION':
      actions.push(
        createAction('VERIFY_FIX', 100, 'Final verification of the fix', undefined, 'Ensure all tests pass including hidden tests'),
        createAction('ESCALATE', 20, 'Escalate if unable to verify', undefined, 'If verification fails repeatedly, consider escalating')
      );
      break;

    case 'COMPLETE':
      actions.push(
        createAction('REQUEST_HINT', 10, 'Session complete - review what was learned', undefined, 'Debugging complete. Reflect on the process and lessons learned.')
      );
      break;

    case 'STUCK':
      actions.push(
        createAction('REQUEST_HINT', 100, 'Get a hint to get unstuck', undefined, `You've been stuck for ${stuckCounter} actions. A hint can help redirect your approach.`),
        createAction('REVERT_CHANGE', 80, 'Revert to last working state', undefined, 'Go back to a known good state and try a different approach'),
        createAction('FORM_HYPOTHESIS', 70, 'Form a new hypothesis', undefined, 'Step back and formulate a fresh hypothesis'),
        createAction('ESCALATE', 50, 'Request human assistance', undefined, 'If completely stuck, consider asking for help')
      );
      break;
  }

  // Sort by priority descending
  return actions.sort((a, b) => b.priority - a.priority);
}

function createAction(
  type: NextBestActionType,
  priority: number,
  rationale: string,
  targetLocation: string | undefined,
  coachingMessage: string
): NextBestAction {
  return {
    actionType: type,
    priority,
    rationale,
    targetLocation,
    coachingMessage,
    preconditions: getPreconditions(type),
    expectedOutcome: getExpectedOutcome(type),
  };
}

function getPreconditions(type: NextBestActionType): string[] {
  const preconditions: Record<NextBestActionType, string[]> = {
    INSPECT_TRACE: ['Have error output available'],
    REPRODUCE: ['Have failing test case'],
    INSPECT_OUTPUT: ['Have actual and expected output available'],
    FORM_HYPOTHESIS: ['Have observed the failure'],
    GATHER_EVIDENCE: ['Have a hypothesis to test'],
    INSPECT_VARIABLE: ['Have code execution capability'],
    RUN_FAILING_TEST: ['Have failing test identified'],
    RUN_SELECTED_TEST: ['Have specific test case identified'],
    RUN_FULL_SUITE: ['Have test suite available'],
    ROOT_CAUSE_ANALYSIS: ['Have gathered sufficient evidence'],
    APPLY_FIX: ['Have identified root cause'],
    VERIFY_FIX: ['Have applied a fix'],
    REVERT_CHANGE: ['Have made a change'],
    REQUEST_HINT: [],
    ESCALATE: [],
  };
  return preconditions[type] || [];
}

function getExpectedOutcome(type: NextBestActionType): string {
  const outcomes: Record<NextBestActionType, string> = {
    INSPECT_TRACE: 'Clear understanding of failure symptoms',
    REPRODUCE: 'Confirmed reproduction of the failure',
    INSPECT_OUTPUT: 'Clear comparison of actual vs expected output',
    FORM_HYPOTHESIS: 'A specific, testable hypothesis',
    GATHER_EVIDENCE: 'Evidence supporting or rejecting hypothesis',
    INSPECT_VARIABLE: 'Actual variable values at key points',
    RUN_FAILING_TEST: 'Pass/fail result for specific test',
    RUN_SELECTED_TEST: 'Pass/fail result for selected test',
    RUN_FULL_SUITE: 'Full test suite results',
    ROOT_CAUSE_ANALYSIS: 'Confirmed root cause with evidence chain',
    APPLY_FIX: 'Code change addressing root cause',
    VERIFY_FIX: 'All tests passing, no regressions',
    REVERT_CHANGE: 'Code restored to previous state',
    REQUEST_HINT: 'Guidance to continue debugging',
    ESCALATE: 'Human assistance engaged',
  };
  return outcomes[type] || '';
}

/**
 * Determine current coaching phase from session state
 */
export function determinePhase(
  session: any,
  hypotheses: DebuggingHypothesis[],
  experiments: Experiment[],
  actions: DebugAction[],
  rootCause: any,
  stuckCounter: number
): CoachingPhase {
  if (stuckCounter >= 3) return 'STUCK';
  if (session.state === 'RESOLVED') return 'COMPLETE';
  if (session.state === 'ROOT_CAUSE_IDENTIFIED') return rootCause ? 'FIX' : 'ROOT_CAUSE';
  if (session.state === 'FIX_ATTEMPTED') return 'VERIFICATION';
  if (hypotheses.some((h) => h.status === 'SUPPORTED')) return 'ROOT_CAUSE';
  if (hypotheses.some((h) => h.status === 'PROPOSED' || h.status === 'TESTING')) return 'EVIDENCE_GATHERING';
  if (hypotheses.length > 0) return 'HYPOTHESIS_FORMATION';
  if (actions.some((a) => a.type === 'INSPECT_TRACE' || a.type === 'RUN_FAILING_TEST')) return 'OBSERVATION';
  return 'OBSERVATION';
}

/**
 * Update coaching progress state
 */
export function updateProgressState(
  state: CoachingProgressState,
  action: NextBestActionType,
  result: 'success' | 'failure' | 'neutral'
): CoachingProgressState {
  const phaseOrder: CoachingPhase[] = [
    'OBSERVATION',
    'HYPOTHESIS_FORMATION',
    'EVIDENCE_GATHERING',
    'ROOT_CAUSE',
    'FIX',
    'VERIFICATION',
    'COMPLETE',
  ];

  let newPhase = state.phase;
  let newStuckCounter = state.stuckCounter;
  const newCompletedPhases = [...state.completedPhases];

  // Advance phase if action is phase-appropriate and successful
  if (result === 'success') {
    const currentIndex = phaseOrder.indexOf(state.phase);
    const actionPhaseMap: Record<NextBestActionType, CoachingPhase> = {
      INSPECT_TRACE: 'OBSERVATION',
      REPRODUCE: 'OBSERVATION',
      INSPECT_OUTPUT: 'OBSERVATION',
      FORM_HYPOTHESIS: 'HYPOTHESIS_FORMATION',
      GATHER_EVIDENCE: 'EVIDENCE_GATHERING',
      INSPECT_VARIABLE: 'EVIDENCE_GATHERING',
      RUN_FAILING_TEST: 'EVIDENCE_GATHERING',
      RUN_SELECTED_TEST: 'EVIDENCE_GATHERING',
      RUN_FULL_SUITE: 'EVIDENCE_GATHERING',
      ROOT_CAUSE_ANALYSIS: 'ROOT_CAUSE',
      APPLY_FIX: 'FIX',
      VERIFY_FIX: 'VERIFICATION',
      REVERT_CHANGE: state.phase,
      REQUEST_HINT: state.phase,
      ESCALATE: state.phase,
    };

    const targetPhase = actionPhaseMap[action];
    if (targetPhase && phaseOrder.indexOf(targetPhase) > currentIndex) {
      if (!newCompletedPhases.includes(state.phase)) {
        newCompletedPhases.push(state.phase);
      }
      newPhase = targetPhase;
      newStuckCounter = 0;
    }
  } else if (result === 'failure') {
    newStuckCounter += 1;
    if (newStuckCounter >= 3) {
      newPhase = 'STUCK';
    }
  }

  return {
    ...state,
    phase: newPhase,
    completedPhases: newCompletedPhases,
    stuckCounter: newStuckCounter,
    lastActionAt: new Date().toISOString(),
  };
}
