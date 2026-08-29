// Role Skill Gap Analysis Engine
import {
  RoleGapStatus,
  RoleGapSeverity,
  RoleGapPriority,
  RoleSkillGap,
  RoleSkillGapProfile,
  SignalSkillState,
  SignalTrend,
} from '../../domain/types.js';

export interface RoleSkillRequirement {
  skillId: string;
  skillName: string;
  targetLevel: string; // e.g., 'PROFICIENT', 'MASTERED'
  targetScore: number; // 0-100
  importance: 'CORE' | 'IMPORTANT' | 'SUPPORTING';
  dependencies: string[]; // skillIds that must be met first
}

export interface StudentSkillSignal {
  skillId: string;
  signal: number; // 0-1
  confidence: number;
  state: SignalSkillState;
  trend: SignalTrend;
  evidenceCount: number;
}

/**
 * Analyze skill gaps for a student against a target role
 */
export function analyzeSkillGaps(
  studentId: string,
  roleId: string,
  roleVersion: number,
  roleRequirements: RoleSkillRequirement[],
  studentSignals: Map<string, StudentSkillSignal>
): RoleSkillGap[] {
  const gaps: RoleSkillGap[] = [];

  for (const req of roleRequirements) {
    const signal = studentSignals.get(req.skillId);
    const currentScore = signal ? Math.round(signal.signal * 100) : 0;
    const currentLevel = signal ? mapSignalToLevel(signal.signal) : 'NO_EVIDENCE';
    const targetScore = req.targetScore;
    const magnitude = targetScore - currentScore;

    // Check if blocked by dependencies
    const dependencyBlocked = req.dependencies.some((depId) => {
      const depSignal = studentSignals.get(depId);
      return !depSignal || depSignal.signal < 0.6; // Dependency not met
    });

    // Determine status
    let status: RoleGapStatus;
    if (!signal || signal.evidenceCount === 0) {
      status = 'UNKNOWN';
    } else if (currentScore >= targetScore) {
      status = currentScore >= targetScore + 10 ? 'EXCEEDS_TARGET' : 'MEETS_TARGET';
    } else if (currentScore >= targetScore * 0.7) {
      status = 'PARTIAL';
    } else {
      status = 'BELOW_TARGET';
    }

    // Determine severity
    let severity: RoleGapSeverity;
    if (status === 'UNKNOWN') severity = 'NONE';
    else if (status === 'MEETS_TARGET' || status === 'EXCEEDS_TARGET') severity = 'NONE';
    else if (status === 'PARTIAL') severity = req.importance === 'CORE' ? 'HIGH' : 'MEDIUM';
    else severity = req.importance === 'CORE' ? 'CRITICAL' : req.importance === 'IMPORTANT' ? 'HIGH' : 'MEDIUM';

    // Determine priority
    let priority: RoleGapPriority;
    if (status === 'MEETS_TARGET' || status === 'EXCEEDS_TARGET') priority = 'LOW';
    else if (dependencyBlocked) priority = 'HIGH'; // Blockers are high priority
    else if (req.importance === 'CORE' && status === 'BELOW_TARGET') priority = 'CRITICAL';
    else if (req.importance === 'CORE' && status === 'PARTIAL') priority = 'HIGH';
    else if (req.importance === 'IMPORTANT' && status === 'BELOW_TARGET') priority = 'HIGH';
    else if (req.importance === 'IMPORTANT' && status === 'PARTIAL') priority = 'MEDIUM';
    else priority = 'LOW';

    // Check if root gap (no dependencies but fundamental)
    const rootGap = req.dependencies.length === 0 && req.importance === 'CORE' && status === 'BELOW_TARGET';

    // Trend
    const trend = signal?.trend === 'IMPROVING' ? 'IMPROVING' :
      signal?.trend === 'DECLINING' ? 'DECLINING' :
      signal?.trend === 'STABLE' ? 'STABLE' : 'INSUFFICIENT';

    // Explanation
    let explanation = '';
    if (status === 'UNKNOWN') {
      explanation = `No evidence available for ${req.skillName}. Assessment needed.`;
    } else if (status === 'MEETS_TARGET') {
      explanation = `${req.skillName} meets the target level (${currentScore}/${targetScore}).`;
    } else if (status === 'EXCEEDS_TARGET') {
      explanation = `${req.skillName} exceeds the target level (${currentScore}/${targetScore}).`;
    } else if (status === 'PARTIAL') {
      explanation = `${req.skillName} is partially met (${currentScore}/${targetScore}). Needs improvement to reach ${req.targetLevel}.`;
    } else {
      explanation = `${req.skillName} is below target (${currentScore}/${targetScore}). Significant gap — requires focused development.`;
    }

    if (dependencyBlocked) {
      explanation += ` Blocked by unmet prerequisites: ${req.dependencies.join(', ')}.`;
    }

    gaps.push({
      skillId: req.skillId,
      skillName: req.skillName,
      currentLevel,
      targetLevel: req.targetLevel,
      status,
      magnitude: Math.round(magnitude),
      confidence: signal?.confidence ?? 0,
      severity,
      priority,
      dependencyBlocked,
      rootGap,
      trend,
      explanation,
    });
  }

  // Sort by priority and severity
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };
  gaps.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return gaps;
}

function mapSignalToLevel(signal: number): string {
  if (signal >= 0.9) return 'MASTERED';
  if (signal >= 0.8) return 'PROFICIENT';
  if (signal >= 0.6) return 'PRACTICED';
  if (signal >= 0.4) return 'DEVELOPING';
  if (signal >= 0.2) return 'INTRODUCED';
  return 'NO_EVIDENCE';
}

/**
 * Compute overall readiness from gaps
 */
export function computeOverallReadiness(gaps: RoleSkillGap[]): number {
  if (gaps.length === 0) return 0;

  // Weight by importance
  let totalWeight = 0;
  let weightedScore = 0;

  for (const gap of gaps) {
    let importanceWeight = 1;
    // We could infer importance from priority/severity
    if (gap.severity === 'CRITICAL') importanceWeight = 4;
    else if (gap.severity === 'HIGH') importanceWeight = 3;
    else if (gap.severity === 'MEDIUM') importanceWeight = 2;
    else importanceWeight = 1;

    const currentScore = 100 - Math.max(0, gap.magnitude); // If magnitude is negative (exceeds), score is > 100
    const score = Math.min(100, Math.max(0, currentScore));

    weightedScore += score * importanceWeight;
    totalWeight += importanceWeight;
  }

  return Math.round(weightedScore / totalWeight);
}

/**
 * Identify blockers and strengths
 */
export function identifyBlockersAndStrengths(gaps: RoleSkillGap[]): {
  blockers: Array<{ skillId: string; skillName: string; reason: string }>;
  strengths: string[];
} {
  const blockers: Array<{ skillId: string; skillName: string; reason: string }> = [];
  const strengths: string[] = [];

  for (const gap of gaps) {
    if (gap.status === 'BELOW_TARGET' && gap.priority === 'CRITICAL') {
      blockers.push({
        skillId: gap.skillId,
        skillName: gap.skillName,
        reason: gap.explanation,
      });
    }
    if (gap.status === 'MEETS_TARGET' || gap.status === 'EXCEEDS_TARGET') {
      strengths.push(gap.skillName);
    }
  }

  return { blockers, strengths };
}

/**
 * Build full gap profile
 */
export function buildGapProfile(
  studentId: string,
  roleId: string,
  roleVersion: number,
  gaps: RoleSkillGap[],
  modelVersion: string
): RoleSkillGapProfile {
  const overallReadiness = computeOverallReadiness(gaps);
  return {
    studentId,
    roleId,
    roleVersion,
    gaps,
    overallReadiness,
    generatedAt: new Date().toISOString(),
    modelVersion,
  };
}

/**
 * Generate recommendations from gaps
 */
export function generateGapRecommendations(gaps: RoleSkillGap[]): Array<{
  skillId: string;
  skillName: string;
  priority: RoleGapPriority;
  recommendation: string;
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
}> {
  const recommendations: Array<{
    skillId: string;
    skillName: string;
    priority: RoleGapPriority;
    recommendation: string;
    estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  }> = [];

  for (const gap of gaps) {
    if (gap.status === 'BELOW_TARGET' || gap.status === 'PARTIAL') {
      let recommendation = '';
      let effort: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

      if (gap.magnitude >= 40) {
        recommendation = `Complete foundational learning for ${gap.skillName}, then practice with progressively harder challenges.`;
        effort = 'HIGH';
      } else if (gap.magnitude >= 20) {
        recommendation = `Targeted practice on ${gap.skillName} focusing on identified weak areas.`;
        effort = 'MEDIUM';
      } else {
        recommendation = `Refine ${gap.skillName} with advanced challenges and transfer exercises.`;
        effort = 'LOW';
      }

      if (gap.dependencyBlocked) {
        recommendation = `First resolve prerequisite gaps, then: ${recommendation}`;
        effort = 'HIGH';
      }

      recommendations.push({
        skillId: gap.skillId,
        skillName: gap.skillName,
        priority: gap.priority,
        recommendation,
        estimatedEffort: effort,
      });
    }
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}