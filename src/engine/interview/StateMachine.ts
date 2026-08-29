/**
 * Interview Session State Machine - Feature 35
 * Enforces strict state transitions per spec §37
 */

import type { InterviewSessionState as SessionState } from '../../domain/types.js';

export class IllegalStateTransitionError extends Error {
  constructor(from: SessionState, to: SessionState) {
    super(`Illegal state transition: ${from} → ${to}`);
    this.name = 'IllegalStateTransitionError';
  }
}

// Allowed transitions per spec §37
const ALLOWED_TRANSITIONS: Record<SessionState, SessionState[]> = {
  CREATED: ['READY', 'CANCELLED'],
  READY: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['PAUSED', 'EVALUATION_PENDING', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['RESUMED', 'CANCELLED'],
  RESUMED: ['IN_PROGRESS', 'PAUSED', 'CANCELLED'],
  EVALUATION_PENDING: ['IN_PROGRESS', 'EVALUATION_FAILED', 'COMPLETED'],
  EVALUATION_FAILED: ['EVALUATION_PENDING', 'IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export class StateMachine {
  static assertValidTransition(from: SessionState, to: SessionState): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new IllegalStateTransitionError(from, to);
    }
  }

  static isTerminal(state: SessionState): boolean {
    return ALLOWED_TRANSITIONS[state].length === 0;
  }

  static isRecoverable(state: SessionState): boolean {
    return ['PAUSED', 'IN_PROGRESS', 'EVALUATION_FAILED'].includes(state);
  }

  static getAllowedTransitions(state: SessionState): SessionState[] {
    return [...ALLOWED_TRANSITIONS[state]];
  }
}
