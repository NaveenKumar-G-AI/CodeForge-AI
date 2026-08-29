// Role Readiness Engine
import {
  ReadinessState31,
  ReadinessBlocker,
  ReadinessResult,
  SignalSkillState,
  SignalTrend,
} from '../../domain/types.js';

export interface ReadinessInput {
  studentId: string;
  roleId: string;
  roleRequirements: Array<{
    skillId: string;
    skillName: string;
    targetMastery: number; // 0-100
    isCore: boolean;
  }>;
  studentSkills: Map<string, {
    signal: number; // 0-1
    confidence: number;
    state: SignalSkillState;
    trend: SignalTrend;
    evidenceCount: number;
  }>;
}

/**
 * Compute role readiness
 */
export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const { studentId, roleId, roleRequirements, studentSkills } = input;

  let totalWeight = 0;
  let weightedScore = 0;
  const blockers: ReadinessBlocker[] = [];

  for (const req of roleRequirements) {
    const skill = studentSkills.get(req.skillId);
    const currentMastery = skill ? Math.round(skill.signal * 100) : 0;
    const targetMastery = req.targetMastery;
    const evidenceCount = skill?.evidenceCount ?? 0;

    // Weight by importance
    const weight = req.isCore ? 2 : 1;
    totalWeight += weight;
    weightedScore += (currentMastery / 100) * weight;

    // Identify blockers
    if (currentMastery < targetMastery && req.isCore) {
      blockers.push({
        skillId: req.skillId,
        skillName: req.skillName,
        reason: `Core skill below target: ${currentMastery}/${targetMastery}`,
        currentMastery,
        targetMastery,
        evidenceCount,
      });
    }
  }

  const overallScore = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

  // Determine readiness state
  let readinessState: ReadinessState31;
  const coreBlockers = blockers.length;

  if (overallScore >= 90 && coreBlockers === 0) {
    readinessState = 'STRONG';
  } else if (overallScore >= 75 && coreBlockers === 0) {
    readinessState = 'READY';
  } else if (overallScore >= 55 && coreBlockers <= 1) {
    readinessState = 'APPROACHING_READY';
  } else if (overallScore >= 35) {
    readinessState = 'DEVELOPING';
  } else {
    readinessState = 'NOT_READY';
  }

  // Identify strengths
  const strengths: string[] = [];
  for (const req of roleRequirements) {
    const skill = studentSkills.get(req.skillId);
    if (skill && Math.round(skill.signal * 100) >= req.targetMastery + 10) {
      strengths.push(req.skillName);
    }
  }

  // Confidence in readiness assessment
  const totalEvidence = Array.from(studentSkills.values()).reduce((s, sk) => s + sk.evidenceCount, 0);
  const avgConfidence = Array.from(studentSkills.values()).reduce((s, sk) => s + sk.confidence, 0) /
    Math.max(1, studentSkills.size);
  const evidenceConfidence = Math.min(1, totalEvidence / 20);
  const confidence = Math.round((avgConfidence * 0.7 + evidenceConfidence * 0.3) * 100) / 100;

  return {
    studentId,
    roleId,
    readinessState,
    overallScore,
    blockers,
    strengths,
    confidence,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate readiness explanation
 */
export function generateReadinessExplanation(result: ReadinessResult): string {
  const parts: string[] = [];

  parts.push(`Overall readiness: ${result.readinessState} (${result.overallScore}%)`);
  parts.push(`Confidence: ${Math.round(result.confidence * 100)}%`);

  if (result.blockers.length > 0) {
    parts.push(`\nBlockers (${result.blockers.length}):`);
    for (const blocker of result.blockers) {
      parts.push(`  • ${blocker.skillName}: ${blocker.currentMastery}/${blocker.targetMastery} — ${blocker.reason}`);
    }
  }

  if (result.strengths.length > 0) {
    parts.push(`\nStrengths:`);
    for (const strength of result.strengths) {
      parts.push(`  ✓ ${strength}`);
    }
  }

  return parts.join('\n');
}

/**
 * Get next steps for improving readiness
 */
export function getReadinessNextSteps(result: ReadinessResult): Array<{
  skillId: string;
  skillName: string;
  action: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}> {
  const steps: Array<{
    skillId: string;
    skillName: string;
    action: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }> = [];

  for (const blocker of result.blockers) {
    steps.push({
      skillId: blocker.skillId,
      skillName: blocker.skillName,
      action: `Focus on ${blocker.skillName} — complete targeted practice to reach ${blocker.targetMastery}% mastery`,
      priority: blocker.currentMastery < blocker.targetMastery * 0.5 ? 'CRITICAL' : 'HIGH',
    });
  }

  // Add maintenance for strengths at risk
  // (would check freshness in real implementation)

  return steps;
}