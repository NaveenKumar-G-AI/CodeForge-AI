/**
 * CodeForge AI — Gap Detection Engine
 *
 * Parts 5, 9: Detects skill gaps, transfer gaps, prerequisite gaps,
 * and insufficient evidence from mastery state and evidence.
 */

import type {
  UUID,
  Evidence,
  StudentSkillState,
  SkillGap,
  GapAssessment,
  GapType,
  GapStatus,
  MasteryState,
} from '../domain/types.js';
import { MASTERY_LEVELS } from '../domain/types.js';
import {
  GAP_CONFIG,
  MASTERY_CONFIG,
} from '../config/index.js';
import { filterAlgorithmicEvidence } from './mastery.js';

// ============================================================================
// GAP DETECTION
// ============================================================================

export function detectGap(
  state: StudentSkillState | null,
  evidence: Evidence[],
  prerequisiteStates: Map<UUID, StudentSkillState> = new Map()
): GapAssessment | null {
  const skillId = state?.skillId || evidence[0]?.skillId;
  const algorithmicEvidence = filterAlgorithmicEvidence(evidence);

  // No meaningful evidence
  if (!state || state.evidenceCount < GAP_CONFIG.insufficientEvidenceMinCount) {
    return {
      skillId: skillId as UUID,
      gapType: 'INSUFFICIENT_EVIDENCE',
      severity: 0.2,
      explanation: `Only ${state?.evidenceCount ?? 0} piece(s) of evidence exist for this skill — not enough to assess mastery either way.`,
    };
  }

  // Check prerequisite gaps first (Phase 12 - prerequisite gating)
  const prereqGap = detectPrerequisiteGap(state, prerequisiteStates);
  if (prereqGap) return prereqGap;

  // Check transfer gap: does fine on STANDARD, struggles on NOVEL
  const transferGap = detectTransferGap(algorithmicEvidence);
  if (transferGap) return transferGap;

  // Check for critical gap (very low mastery with evidence)
  const criticalGap = detectCriticalGap(state, algorithmicEvidence);
  if (criticalGap) return criticalGap;

  // Check for developing gap (below target but not critical)
  const developingGap = detectDevelopingGap(state);
  if (developingGap) return developingGap;

  // No gap - skill is complete for current level
  return {
    skillId: skillId as UUID,
    gapType: 'NONE',
    severity: 0,
    explanation: `Skill is at ${state.masteryState} level with ${state.evidenceCount} evidence points.`,
  };
}

function detectPrerequisiteGap(
  state: StudentSkillState,
  prerequisiteStates: Map<UUID, StudentSkillState>
): GapAssessment | null {
  // This would be called with the prerequisite states already populated
  // The prerequisite analyzer (separate module) handles walking the chain
  // Here we just check if this skill is BLOCKED by prerequisites
  if ((state.masteryState as string) === 'BLOCKED') {
    return {
      skillId: state.skillId,
      gapType: 'PREREQUISITE_GAP',
      severity: 0.8,
      explanation: 'This skill is blocked by unmet prerequisite requirements.',
    };
  }
  return null;
}

function detectTransferGap(evidence: Evidence[]): GapAssessment | null {
  const standardEvidence = evidence.filter(e => e.contextType === 'STANDARD');
  const novelEvidence = evidence.filter(e => e.contextType === 'NOVEL' || e.contextType === 'TRANSFER');

  if (standardEvidence.length === 0 || novelEvidence.length === 0) return null;

  const standardAvg = standardEvidence.reduce((sum, e) => sum + e.rawScore, 0) / standardEvidence.length;
  const novelAvg = novelEvidence.reduce((sum, e) => sum + e.rawScore, 0) / novelEvidence.length;

  const { transferGapMinStandardScore, transferGapMaxNovelScore } = GAP_CONFIG;

  if (standardAvg >= transferGapMinStandardScore && novelAvg <= transferGapMaxNovelScore) {
    const severity = Math.min(1, (transferGapMinStandardScore - novelAvg) * 2);
    return {
      skillId: evidence[0].skillId,
      gapType: 'TRANSFER_GAP',
      severity,
      explanation: `Performs well on familiar contexts (${Math.round(standardAvg * 100)}%) but struggles with novel applications (${Math.round(novelAvg * 100)}%).`,
    };
  }

  return null;
}

function detectCriticalGap(state: StudentSkillState, evidence: Evidence[]): GapAssessment | null {
  if (state.masteryScore < 20 && state.evidenceCount >= 3) {
    const recentFailures = evidence
      .filter(e => e.rawScore < 0.5)
      .slice(-3);

    if (recentFailures.length >= 2) {
      const mistakeCategories = [...new Set(recentFailures.map(e => e.mistakeCategory).filter(Boolean))];
      return {
        skillId: state.skillId,
        gapType: 'CRITICAL_GAP',
        severity: 0.9,
        explanation: `Consistently failing (${Math.round(state.masteryScore)}% mastery) with recurring issues: ${mistakeCategories.join(', ') || 'unknown'}.`,
      };
    }
  }
  return null;
}

function detectDevelopingGap(state: StudentSkillState): GapAssessment | null {
  if (state.masteryState === 'DEVELOPING' || state.masteryState === 'NOVICE') {
    const severity = state.masteryState === 'NOVICE' ? 0.6 : 0.4;
    return {
      skillId: state.skillId,
      gapType: 'SKILL_GAP',
      severity,
      explanation: `Skill is at ${state.masteryState} level (${state.masteryScore}% mastery). Needs targeted practice.`,
    };
  }
  return null;
}

// ============================================================================
// GAP SEVERITY RANKING
// ============================================================================

export function rankGapsBySeverity(gaps: GapAssessment[]): GapAssessment[] {
  const severityOrder: Record<GapType, number> = {
    CRITICAL_GAP: 1.0,
    GAP: 0.7,
    PREREQUISITE_GAP: 0.9,
    TRANSFER_GAP: 0.8,
    SKILL_GAP: 0.6,
    INSUFFICIENT_EVIDENCE: 0.3,
    NONE: 0,
  };

  return [...gaps].sort((a, b) => {
    const severityA = severityOrder[a.gapType] ?? a.severity;
    const severityB = severityOrder[b.gapType] ?? b.severity;
    return severityB - severityA;
  });
}

// ============================================================================
// SKILL GAP DETAIL (for recommendations)
// ============================================================================

export function buildSkillGapDetail(
  state: StudentSkillState | null,
  evidence: Evidence[],
  prerequisiteStates: Map<UUID, StudentSkillState>
): SkillGap | null {
  const assessment = detectGap(state, evidence, prerequisiteStates);
  if (!assessment || assessment.gapType === 'NONE') return null;

  const algorithmicEvidence = filterAlgorithmicEvidence(evidence);
  const recentMistakes = [...algorithmicEvidence]
    .filter(e => e.mistakeCategory)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(e => e.mistakeCategory!);

  const uniqueMistakes = [...new Set(recentMistakes)];

  return {
    skillId: assessment.skillId,
    skillName: '', // Will be filled by caller
    level: state?.masteryState || 'NOVICE',
    gapScore: assessment.severity,
    evidenceCount: state?.evidenceCount || 0,
    recentMistakes: uniqueMistakes,
    hasActiveMisconception: uniqueMistakes.length > 2,
    gapType: assessment.gapType,
    severity: assessment.severity,
    explanation: assessment.explanation,
  };
}

// ============================================================================
// PREREQUISITE ANALYZER
// ============================================================================

export interface PrerequisiteAnalyzer {
  analyze(studentId: UUID, skillId: UUID): Promise<GapAssessment | null>;
  getWeakestPrerequisite(skillId: UUID, studentStates: Map<UUID, StudentSkillState>): Promise<{ skillId: UUID; score: number } | null>;
}

export function createPrerequisiteAnalyzer(
  getPrerequisites: (skillId: UUID) => UUID[] | Promise<UUID[]>,
  getState: (studentId: UUID, skillId: UUID) => StudentSkillState | null | Promise<StudentSkillState | null>
): PrerequisiteAnalyzer {
  return {
    async analyze(studentId: UUID, skillId: UUID): Promise<GapAssessment | null> {
      const prerequisites = await getPrerequisites(skillId);
      if (prerequisites.length === 0) return null;

      let weakest: { skillId: UUID; score: number } | null = null;

      for (const prereqId of prerequisites) {
        const state = await getState(studentId, prereqId);
        if (!state) continue;

        const score = state.masteryScore / 100;

        // Check if prerequisite is below gate threshold
        const gateThreshold = MASTERY_CONFIG.prerequisiteGateThreshold;
        const prereqLevelIndex = MASTERY_LEVELS.indexOf(state.masteryState as any);

        if (prereqLevelIndex !== -1 && prereqLevelIndex <= gateThreshold) {
          if (!weakest || score < weakest.score) {
            weakest = { skillId: prereqId, score };
          }
        }
      }

      if (weakest) {
        return {
          skillId: weakest.skillId,
          gapType: 'PREREQUISITE_GAP',
          severity: 0.8,
          explanation: `Prerequisite skill ${weakest.skillId} is at ${Math.round(weakest.score * 100)}% mastery, below the required threshold for ${skillId}.`,
        };
      }

      return null;
    },

    async getWeakestPrerequisite(skillId: UUID, studentStates: Map<UUID, StudentSkillState>): Promise<{ skillId: UUID; score: number } | null> {
      const prerequisites = await getPrerequisites(skillId);
      if (prerequisites.length === 0) return null;

      let weakest: { skillId: UUID; score: number } | null = null;

      for (const prereqId of prerequisites) {
        const state = studentStates.get(prereqId);
        if (!state) continue;

        const score = state.masteryScore / 100;

        if (!weakest || score < weakest.score) {
          weakest = { skillId: prereqId, score };
        }
      }

      return weakest;
    },
  };
}

// ============================================================================
// GAP STATUS FROM MASTERY STATE
// ============================================================================

export function gapStatusFromMastery(masteryState: MasteryState, evidenceCount: number): GapStatus {
  if (evidenceCount < GAP_CONFIG.insufficientEvidenceMinCount) {
    return 'INSUFFICIENT_EVIDENCE';
  }

  switch (masteryState) {
    case 'MASTERED':
    case 'STRONG':
      return 'COMPLETE';
    case 'COMPETENT':
      return 'DEVELOPING';
    case 'DEVELOPING':
      return 'GAP';
    case 'NOVICE':
      return 'CRITICAL_GAP';
    case 'STALE':
      return 'DEVELOPING'; // Stale but was competent+
    default:
      return 'UNKNOWN';
  }
}

export default {
  detectGap,
  rankGapsBySeverity,
  buildSkillGapDetail,
  createPrerequisiteAnalyzer,
  gapStatusFromMastery,
};
