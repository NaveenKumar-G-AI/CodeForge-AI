// Debugging Engine — State Machine
import {
  SessionState,
  DebuggingHypothesisStatus,
  DebugActionType,
  FailureClass,
  ReproductionStatus,
  ExperimentConclusion,
  DebuggingSession,
  DebuggingHypothesis,
  Experiment,
  DebugAction,
  EvidenceRef,
  FailureFingerprint,
  RootCauseChain,
  RegressionVerification,
  OverfittingSignal,
  MinimalChangeAnalysis,
  DebuggingResult,
  InvalidStateTransitionError,
  EvidenceRequiredError,
} from '../../domain/types.js';

// Valid state transitions
export const VALID_TRANSITIONS: Record<SessionState, { event: string; nextState: SessionState }[]> = {
  NOT_STARTED: [
    { event: 'START_SESSION', nextState: 'IN_PROGRESS' },
    { event: 'ABANDON', nextState: 'ABANDONED' },
  ],
  IN_PROGRESS: [
    { event: 'CAPTURE_FINGERPRINT', nextState: 'IN_PROGRESS' },
    { event: 'REPRODUCE_FAILURE', nextState: 'IN_PROGRESS' },
    { event: 'CREATE_HYPOTHESIS', nextState: 'IN_PROGRESS' },
    { event: 'IDENTIFY_ROOT_CAUSE', nextState: 'ROOT_CAUSE_IDENTIFIED' },
    { event: 'ABANDON', nextState: 'ABANDONED' },
  ],
  ROOT_CAUSE_IDENTIFIED: [
    { event: 'APPLY_FIX', nextState: 'FIX_ATTEMPTED' },
    { event: 'REVERT_CHANGE', nextState: 'IN_PROGRESS' },
    { event: 'CREATE_HYPOTHESIS', nextState: 'ROOT_CAUSE_IDENTIFIED' },
    { event: 'ABANDON', nextState: 'ABANDONED' },
  ],
  FIX_ATTEMPTED: [
    { event: 'VERIFY_FIX', nextState: 'RESOLVED' },
    { event: 'FIX_FAILED', nextState: 'IN_PROGRESS' },
    { event: 'REVERT_CHANGE', nextState: 'IN_PROGRESS' },
    { event: 'ABANDON', nextState: 'ABANDONED' },
  ],
  RESOLVED: [
    { event: 'ABANDON', nextState: 'ABANDONED' },
  ],
  FAILED: [
    { event: 'ABANDON', nextState: 'ABANDONED' },
  ],
  ABANDONED: [],
};

export class DebuggingStateMachine {
  private session: DebuggingSession;
  private hypotheses: Map<string, DebuggingHypothesis> = new Map();
  private experiments: Map<string, Experiment> = new Map();
  private actions: DebugAction[] = [];
  private fingerprint: FailureFingerprint | null = null;

  constructor(session: DebuggingSession) {
    this.session = session;
  }

  getSession(): DebuggingSession {
    return { ...this.session };
  }

  getHypotheses(): DebuggingHypothesis[] {
    return Array.from(this.hypotheses.values());
  }

  getExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  getActions(): DebugAction[] {
    return [...this.actions];
  }

  getFingerprint(): FailureFingerprint | null {
    return this.fingerprint;
  }

  // Apply an event and transition state
  applyEvent(event: string, payload: any = {}): { session: DebuggingSession; error?: Error } {
    const currentState = this.session.state;
    const validTransitions = VALID_TRANSITIONS[currentState] || [];
    const transition = validTransitions.find((t) => t.event === event);

    if (!transition) {
      return {
        session: this.session,
        error: new InvalidStateTransitionError(currentState, event),
      };
    }

    // Execute transition-specific logic
    switch (event) {
      case 'START_SESSION':
        this.session = { ...this.session, state: transition.nextState, startedAt: new Date().toISOString() };
        break;

      case 'CAPTURE_FINGERPRINT':
        this.fingerprint = payload.fingerprint;
        break;

      case 'REPRODUCE_FAILURE':
        if (this.fingerprint) {
          this.fingerprint = { ...this.fingerprint, reproductionStatus: payload.status || 'REPRODUCED' };
        }
        break;

      case 'CREATE_HYPOTHESIS': {
        const hypothesis: DebuggingHypothesis = {
          id: payload.id || `hyp-${Date.now()}`,
          sessionId: this.session.id,
          text: payload.text,
          suspectedLocation: payload.suspectedLocation,
          suspectedCause: payload.suspectedCause,
          confidence: payload.confidence || 0,
          status: 'PROPOSED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.hypotheses.set(hypothesis.id, hypothesis);
        break;
      }

      case 'UPDATE_HYPOTHESIS': {
        const hyp = this.hypotheses.get(payload.id);
        if (hyp) {
          this.hypotheses.set(payload.id, {
            ...hyp,
            ...payload.updates,
            updatedAt: new Date().toISOString(),
          });
        }
        break;
      }

      case 'IDENTIFY_ROOT_CAUSE': {
        const hyp = this.hypotheses.get(payload.hypothesisId);
        if (hyp) {
          this.hypotheses.set(payload.hypothesisId, {
            ...hyp,
            status: 'SUPPORTED',
            updatedAt: new Date().toISOString(),
          });
        }
        this.session = { ...this.session, state: transition.nextState };
        break;
      }

      case 'APPLY_FIX':
        this.session = { ...this.session, state: transition.nextState, currentCode: payload.newCode };
        break;

      case 'VERIFY_FIX':
        this.session = { ...this.session, state: transition.nextState, endedAt: new Date().toISOString() };
        break;

      case 'FIX_FAILED':
        this.session = { ...this.session, state: transition.nextState };
        break;

      case 'REVERT_CHANGE':
        this.session = { ...this.session, state: transition.nextState, currentCode: payload.originalCode };
        break;

      case 'ABANDON':
        this.session = { ...this.session, state: transition.nextState, endedAt: new Date().toISOString() };
        break;
    }

    // Record action
    this.actions.push({
      id: `action-${Date.now()}`,
      sessionId: this.session.id,
      type: event as DebugActionType,
      metadata: payload,
      createdAt: new Date().toISOString(),
    });

    return { session: this.session };
  }

  // Add experiment
  addExperiment(experiment: Omit<Experiment, 'id' | 'createdAt'>): Experiment {
    const exp: Experiment = {
      ...experiment,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.experiments.set(exp.id, exp);
    return exp;
  }

  // Update experiment conclusion
  updateExperiment(id: string, conclusion: ExperimentConclusion, actualResult: string): void {
    const exp = this.experiments.get(id);
    if (exp) {
      this.experiments.set(id, {
        ...exp,
        conclusion,
        actualResult,
        resolvedAt: new Date().toISOString(),
      });

      // Update related hypothesis
      const hyp = this.hypotheses.get(exp.hypothesisId);
      if (hyp) {
        const newStatus: DebuggingHypothesisStatus =
          conclusion === 'SUPPORTED' ? 'SUPPORTED' : conclusion === 'REJECTED' ? 'REJECTED' : 'INCONCLUSIVE';
        this.hypotheses.set(exp.hypothesisId, {
          ...hyp,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Generate final result
  generateResult(
    rootCause: RootCauseChain | null,
    regression: RegressionVerification | null,
    overfitting: OverfittingSignal | null,
    dimensions: any[],
    report: any,
    timeline: any[]
  ): DebuggingResult {
    let status: DebuggingResult['status'];

    if (this.session.state === 'RESOLVED') {
      if (regression?.overallPass && !overfitting?.suspected) {
        status = 'EXCELLENT_DEBUGGING';
      } else if (regression?.overallPass) {
        status = 'STRONG_DEBUGGING';
      } else if (dimensions.length >= 5) {
        status = 'DEVELOPING_DEBUGGING';
      } else {
        status = 'WEAK_DEBUGGING';
      }
    } else if (this.session.state === 'FAILED' || this.session.state === 'ABANDONED') {
      status = 'INSUFFICIENT_EVIDENCE';
    } else {
      status = 'WEAK_DEBUGGING';
    }

    return {
      sessionId: this.session.id,
      status,
      dimensions,
      rootCause,
      regression,
      overfitting,
      report,
      timeline,
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Create a new debugging session
 */
export function createDebuggingSession(
  userId: string,
  challengeId: string,
  language: 'python' | 'javascript',
  initialCode: string
): DebuggingSession {
  return {
    id: `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    challengeId,
    submissionId: null,
    language,
    state: 'NOT_STARTED',
    startedAt: new Date().toISOString(),
    endedAt: null,
    currentCode: initialCode,
  };
}

/**
 * Classify failure from execution result
 */
export function classifyFailure(
  errorMessage: string | null,
  exitCode: number | null,
  stdout: string,
  stderr: string,
  executionTimeMs: number,
  memoryUsageKB: number,
  timeLimitMs: number,
  memoryLimitKB: number
): FailureClass {
  if (exitCode !== 0 && errorMessage) {
    const msg = errorMessage.toLowerCase();
    if (msg.includes('timeout') || msg.includes('time limit') || executionTimeMs > timeLimitMs) {
      return 'TIME_LIMIT';
    }
    if (msg.includes('memory') || msg.includes('out of memory') || memoryUsageKB > memoryLimitKB) {
      return 'MEMORY_LIMIT';
    }
    if (msg.includes('runtime') || msg.includes('exception') || msg.includes('error:')) {
      return 'RUNTIME_ERROR';
    }
    return 'LOGIC_ERROR';
  }

  if (stdout.trim() !== stderr.trim()) {
    // Has output but wrong answer
    return 'WRONG_ANSWER';
  }

  return 'LOGIC_ERROR';
}

/**
 * Check for overfitting
 */
export function checkOverfitting(
  visiblePassed: number,
  visibleTotal: number,
  hiddenPassed: number,
  hiddenTotal: number
): OverfittingSignal {
  const visibleRate = visibleTotal > 0 ? visiblePassed / visibleTotal : 0;
  const hiddenRate = hiddenTotal > 0 ? hiddenPassed / hiddenTotal : 0;

  const suspected = visibleRate > hiddenRate + 0.2; // 20% gap suggests overfitting
  const reasons: string[] = [];

  if (suspected) {
    reasons.push(`Visible pass rate (${Math.round(visibleRate * 100)}%) significantly higher than hidden (${Math.round(hiddenRate * 100)}%)`);
  }
  if (visiblePassed === visibleTotal && hiddenPassed < hiddenTotal) {
    reasons.push('All visible tests pass but some hidden tests fail');
  }

  return {
    suspected,
    reasons,
    visiblePassRate: visibleRate,
    hiddenPassRate: hiddenRate,
  };
}

/**
 * Analyze minimal change
 */
export function analyzeMinimalChange(
  originalCode: string,
  fixedCode: string,
  suspectedLocation: string | null
): MinimalChangeAnalysis {
  const origLines = originalCode.split('\n');
  const fixedLines = fixedCode.split('\n');

  // Simple diff
  let linesAdded = 0;
  let linesRemoved = 0;

  // Count differences
  const maxLen = Math.max(origLines.length, fixedLines.length);
  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i];
    const fixed = fixedLines[i];
    if (orig !== fixed) {
      if (orig && !fixed) linesRemoved++;
      else if (!orig && fixed) linesAdded++;
      else {
        linesRemoved++;
        linesAdded++;
      }
    }
  }

  const changedOutsideSuspected = suspectedLocation
    ? !fixedCode.includes(suspectedLocation)
    : false;

  return {
    filesChanged: ['main'],
    linesAdded,
    linesRemoved,
    changedOutsideSuspectedLocation: changedOutsideSuspected,
  };
}