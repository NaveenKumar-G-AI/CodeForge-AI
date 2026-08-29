// Code Quality Engine — Scoring Logic
import {
  QualityFinding,
  DimensionScoreDetail,
  QualityDimension,
  ComparisonResult,
  QualityConfidence,
  Severity,
} from '../../domain/types.js';
import { DIMENSION_WEIGHTS, SEVERITY_BASE_DEDUCTION, CONFIDENCE_MULTIPLIER, SCORE_LABELS } from './config.js';

export function computeScore(findings: QualityFinding[]): {
  dimensionScores: DimensionScoreDetail[];
  overallScore: number;
  overallLabel: string;
} {
  const dims = Object.keys(DIMENSION_WEIGHTS) as QualityDimension[];
  const running: Record<string, { score: number; contributions: DimensionScoreDetail['contributions'] }> = {};
  for (const d of dims) running[d] = { score: 100, contributions: [] };

  for (const f of findings) {
    // AI-origin findings are interpretive, not structural facts — they never move the
    // deterministic score. Only DETERMINISTIC findings can deduct points.
    if (f.origin !== 'DETERMINISTIC') continue;
    const base = SEVERITY_BASE_DEDUCTION[f.severity as Severity];
    const mult = CONFIDENCE_MULTIPLIER[f.confidence as QualityConfidence];
    for (const [dim, fraction] of Object.entries(f.dimensions)) {
      const deduction = base * mult * (fraction as number);
      if (deduction <= 0) continue;
      const bucket = running[dim];
      if (!bucket) continue;
      bucket.score -= deduction;
      bucket.contributions.push({
        findingId: f.findingId,
        ruleId: f.ruleId,
        pointsDeducted: Math.round(deduction * 10) / 10,
      });
    }
  }

  const dimensionScores: DimensionScoreDetail[] = dims.map((d) => ({
    dimension: d,
    score: Math.max(0, Math.round(running[d].score)),
    contributions: running[d].contributions,
  }));

  let overall = 0;
  for (const ds of dimensionScores) overall += ds.score * DIMENSION_WEIGHTS[ds.dimension];
  overall = Math.max(0, Math.min(100, Math.round(overall)));

  let label = 'POOR';
  for (const [threshold, name] of SCORE_LABELS) {
    if (overall >= threshold) {
      label = name;
      break;
    }
  }

  return { dimensionScores, overallScore: overall, overallLabel: label };
}

export function computeComparison(
  previous: { dimensionScores: DimensionScoreDetail[]; overallScore: number } | null,
  current: { dimensionScores: DimensionScoreDetail[]; overallScore: number }
): ComparisonResult {
  if (!previous) {
    return {
      previousScore: 0,
      currentScore: current.overallScore,
      delta: current.overallScore,
      dimensionDeltas: {},
      narrative: ['First analysis — no previous snapshot to compare against.'],
    };
  }

  const dimensionDeltas: Partial<Record<QualityDimension, number>> = {};
  const narrative: string[] = [];

  for (const prevDim of previous.dimensionScores) {
    const currDim = current.dimensionScores.find((d) => d.dimension === prevDim.dimension);
    if (!currDim) continue;
    const delta = currDim.score - prevDim.score;
    dimensionDeltas[prevDim.dimension] = delta;
    if (Math.abs(delta) >= 5) {
      narrative.push(
        `${prevDim.dimension}: ${prevDim.score} → ${currDim.score} (${delta > 0 ? '+' : ''}${delta})`
      );
    }
  }

  const delta = current.overallScore - previous.overallScore;
  if (Math.abs(delta) >= 5) {
    narrative.unshift(
      `Overall: ${previous.overallScore} → ${current.overallScore} (${delta > 0 ? '+' : ''}${delta})`
    );
  }

  if (narrative.length === 1) {
    narrative.push('No dimension changed by ≥5 points.');
  }

  return {
    previousScore: previous.overallScore,
    currentScore: current.overallScore,
    delta,
    dimensionDeltas,
    narrative,
  };
}
