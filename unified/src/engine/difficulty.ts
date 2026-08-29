/**
 * CodeForge AI — Difficulty Adaptation Engine
 *
 * Parts 3, 5: Decides next difficulty level based on recent evidence.
 * Repeated independent success → step up. Repeated failure → step down into recovery.
 */

import type {
  DifficultyLevel,
  Evidence,
  DifficultyDecision,
  AssistanceLevel,
} from '../domain/types.js';
import { DIFFICULTY_CONFIG } from '../config/index.js';

export { DifficultyDecision } from '../domain/types.js';

// ============================================================================
// DIFFICULTY DECISION
// ============================================================================

export function decideDifficulty(
  evidence: Evidence[],
  currentLevel: DifficultyLevel
): DifficultyDecision {
  if (evidence.length === 0) {
    return {
      mode: 'HOLD',
      targetLevel: 'EASY',
      reason: 'No evidence yet for this skill — starting at the easiest level.',
    };
  }

  const levels = DIFFICULTY_CONFIG.levels;
  const currentIndex = levels.indexOf(currentLevel);

  // Sort evidence by date (most recent last)
  const sorted = [...evidence].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Look at recent evidence (last 4)
  const recent = sorted.slice(-4);

  // Count consecutive independent successes (rawScore >= 0.999 = passed all tests)
  const consecSuccesses = countConsecutiveFromEnd(recent, e =>
    e.rawScore >= 0.999 && e.independent
  );

  // Count consecutive failures (rawScore < 0.5 = failed majority)
  const consecFailures = countConsecutiveFromEnd(recent, e =>
    e.rawScore < 0.5
  );

  // Check for advancement
  if (consecSuccesses >= DIFFICULTY_CONFIG.consecutiveSuccessesToIncrease) {
    if (currentIndex < levels.length - 1) {
      return {
        mode: 'ADVANCE',
        targetLevel: levels[currentIndex + 1],
        reason: `${consecSuccesses} consecutive independent successes — advancing to ${levels[currentIndex + 1]}.`,
      };
    } else {
      return {
        mode: 'HOLD',
        targetLevel: currentLevel,
        reason: 'Already at maximum difficulty — maintaining current level.',
      };
    }
  }

  // Check for recovery
  if (consecFailures >= DIFFICULTY_CONFIG.consecutiveFailuresToDecrease) {
    const targetIndex = Math.max(0, currentIndex - 1);

    if (DIFFICULTY_CONFIG.recoveryRequiresSuccessAtLower) {
      return {
        mode: 'RECOVER',
        targetLevel: levels[targetIndex],
        reason: `${consecFailures} consecutive failures — dropping to ${levels[targetIndex]} for recovery. Must succeed independently at this level before re-advancing.`,
      };
    } else {
      return {
        mode: 'HOLD',
        targetLevel: levels[targetIndex],
        reason: `${consecFailures} consecutive failures — dropping to ${levels[targetIndex]}.`,
      };
    }
  }

  // Hold at current level
  return {
    mode: 'HOLD',
    targetLevel: currentLevel,
    reason: `No clear pattern — ${consecSuccesses} recent successes, ${consecFailures} recent failures. Holding at ${currentLevel}.`,
  };
}

function countConsecutiveFromEnd<T>(
  arr: T[],
  predicate: (item: T) => boolean
): number {
  let count = 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// ============================================================================
// DIFFICULTY FOR NEW SKILL
// ============================================================================

export function startingDifficultyForMastery(masteryLevel: string): DifficultyLevel {
  const mapping: Record<string, DifficultyLevel> = {
    NOVICE: 'EASY',
    DEVELOPING: 'EASY',
    COMPETENT: 'MEDIUM',
    STRONG: 'HARD',
    MASTERED: 'ADVANCED',
    STALE: 'EASY',
  };
  return mapping[masteryLevel] || 'EASY';
}

export function startingDifficultyForSkillLevel(skillLevel: string): DifficultyLevel {
  const mapping: Record<string, DifficultyLevel> = {
    WEAK: 'EASY',
    DEVELOPING: 'EASY',
    PROFICIENT: 'MEDIUM',
    STRONG: 'HARD',
  };
  return mapping[skillLevel] || 'EASY';
}

// ============================================================================
// CHALLENGE DIFFICULTY SCORE
// ============================================================================

export function challengeDifficultyScore(
  conceptDifficulty: number,        // 1-5
  implementationComplexity: number, // 1-5
  constraintComplexity: number,     // 1-5
  reasoningComplexity: number,      // 1-5
  ambiguity: number                 // 1-5
): number {
  // Weighted average, normalized to 1-10
  const weights = {
    concept: 0.25,
    implementation: 0.25,
    constraint: 0.15,
    reasoning: 0.25,
    ambiguity: 0.10,
  };

  const weighted = (
    conceptDifficulty * weights.concept +
    implementationComplexity * weights.implementation +
    constraintComplexity * weights.constraint +
    reasoningComplexity * weights.reasoning +
    ambiguity * weights.ambiguity
  );

  // Map 1-5 to 1-10
  return Math.round(1 + (weighted - 1) * 9 / 4);
}

export function difficultyLevelFromScore(score: number): DifficultyLevel {
  if (score <= 3) return 'EASY';
  if (score <= 5) return 'MEDIUM';
  if (score <= 7) return 'HARD';
  return 'ADVANCED';
}

// ============================================================================
// DIFFICULTY FIT SCORING (for ranking)
// ============================================================================

export function difficultyFit(
  challengeLevel: DifficultyLevel,
  targetLevel: DifficultyLevel
): number {
  const levels = DIFFICULTY_CONFIG.levels;
  const challengeIndex = levels.indexOf(challengeLevel);
  const targetIndex = levels.indexOf(targetLevel);

  if (challengeIndex === -1 || targetIndex === -1) return 0;

  const distance = Math.abs(challengeIndex - targetIndex);
  const maxDistance = levels.length - 1;

  // Linear decay: 1.0 at exact match, 0.0 at max distance
  return Math.max(0, 1 - distance / maxDistance);
}

// ============================================================================
// RECOVERY PATH DIFFICULTY
// ============================================================================

export function getRecoveryPath(
  currentLevel: DifficultyLevel,
  evidence: Evidence[]
): { level: DifficultyLevel; reason: string }[] {
  const levels = DIFFICULTY_CONFIG.levels;
  const currentIndex = levels.indexOf(currentLevel);
  const path: { level: DifficultyLevel; reason: string }[] = [];

  // Add current level
  path.push({
    level: currentLevel,
    reason: 'Current difficulty',
  });

  // Add lower levels down to EASY
  for (let i = currentIndex - 1; i >= 0; i--) {
    path.push({
      level: levels[i],
      reason: `Recovery level: ${levels[i]}`,
    });
  }

  return path;
}

export default {
  decideDifficulty,
  startingDifficultyForMastery,
  startingDifficultyForSkillLevel,
  challengeDifficultyScore,
  difficultyLevelFromScore,
  difficultyFit,
  getRecoveryPath,
};