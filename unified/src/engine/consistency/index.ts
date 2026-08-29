// Code-Reasoning Consistency Engine
import {
  iso8601,
  uuid,
  ConsistencyStatus,
  DimensionComparisonStatus,
  ConsistencyScore,
  DimensionComparison,
  ConsistencyReport,
  ClaimType,
} from '../../domain/types.js';

export interface CodeClaims {
  [dimension: string]: { value: number | string; evidence: string[] };
}

export interface ReasoningClaims {
  [dimension: string]: { value: number | string; confidence: number };
}

export function compareClaims(
  codeClaims: CodeClaims,
  reasoningClaims: ReasoningClaims,
  dimensions: string[]
): { comparisons: DimensionComparison[]; score: ConsistencyScore } {
  const comparisons: DimensionComparison[] = [];

  for (const dim of dimensions) {
    const code = codeClaims[dim];
    const reasoning = reasoningClaims[dim];

    if (!code && !reasoning) {
      comparisons.push({
        dimension: dim,
        codeValue: 'N/A',
        reasoningValue: 'N/A',
        status: DimensionComparisonStatus.INSUFFICIENT,
        severity: 'LOW',
        explanation: 'No claims from either source for this dimension.',
      });
      continue;
    }

    if (!code) {
      comparisons.push({
        dimension: dim,
        codeValue: 'N/A',
        reasoningValue: reasoning.value,
        status: DimensionComparisonStatus.INSUFFICIENT,
        severity: 'MEDIUM',
        explanation: 'Reasoning makes claim but code provides no evidence.',
      });
      continue;
    }

    if (!reasoning) {
      comparisons.push({
        dimension: dim,
        codeValue: code.value,
        reasoningValue: 'N/A',
        status: DimensionComparisonStatus.INSUFFICIENT,
        severity: 'MEDIUM',
        explanation: 'Code provides evidence but reasoning makes no claim.',
      });
      continue;
    }

    // Compare values
    const codeVal = code.value;
    const reasonVal = reasoning.value;

    let status: DimensionComparisonStatus;
    let severity: 'HIGH' | 'MEDIUM' | 'LOW';
    let delta: number | undefined;
    let explanation: string;

    if (typeof codeVal === 'number' && typeof reasonVal === 'number') {
      delta = Math.abs(codeVal - reasonVal);
      const maxVal = Math.max(Math.abs(codeVal), Math.abs(reasonVal), 1);
      const relativeDelta = delta / maxVal;

      if (relativeDelta < 0.1) {
        status = DimensionComparisonStatus.MATCH;
        severity = 'LOW';
        explanation = `Values match closely (${codeVal} vs ${reasonVal}).`;
      } else if (relativeDelta < 0.3) {
        status = DimensionComparisonStatus.MISMATCH;
        severity = 'MEDIUM';
        explanation = `Moderate discrepancy (${codeVal} vs ${reasonVal}, ${Math.round(relativeDelta * 100)}% diff).`;
      } else {
        status = DimensionComparisonStatus.CONTRADICTION;
        severity = 'HIGH';
        explanation = `Significant contradiction (${codeVal} vs ${reasonVal}, ${Math.round(relativeDelta * 100)}% diff).`;
      }
    } else {
      // String comparison
      const codeStr = String(codeVal).toLowerCase();
      const reasonStr = String(reasonVal).toLowerCase();
      const match = codeStr.includes(reasonStr) || reasonStr.includes(codeStr);

      if (match) {
        status = DimensionComparisonStatus.MATCH;
        severity = 'LOW';
        explanation = `Claims are semantically compatible.`;
      } else {
        status = DimensionComparisonStatus.MISMATCH;
        severity = 'MEDIUM';
        explanation = `Claims differ: code="${codeVal}" vs reasoning="${reasonVal}".`;
      }
    }

    comparisons.push({ dimension: dim, codeValue: codeVal, reasoningValue: reasonVal, status, delta, severity, explanation });
  }

  // Compute overall score
  const matchCount = comparisons.filter((c) => c.status === DimensionComparisonStatus.MATCH).length;
  const mismatchCount = comparisons.filter((c) => c.status === DimensionComparisonStatus.MISMATCH).length;
  const contradictionCount = comparisons.filter((c) => c.status === DimensionComparisonStatus.CONTRADICTION).length;
  const insufficientCount = comparisons.filter((c) => c.status === DimensionComparisonStatus.INSUFFICIENT).length;
  const total = comparisons.length;

  let overall = 100;
  if (total > 0) {
    overall = Math.round(
      (matchCount * 100 + mismatchCount * 50 + insufficientCount * 25 + contradictionCount * 0) / total
    );
  }

  let band: ConsistencyScore['band'];
  if (overall >= 80) band = 'STRONG_CONSISTENCY';
  else if (overall >= 60) band = 'SOLID_CONSISTENCY';
  else if (overall >= 40) band = 'PARTIAL_CONSISTENCY';
  else band = 'WEAK_CONSISTENCY';

  let confidence: 'High' | 'Medium' | 'Low' = 'Medium';
  if (insufficientCount / total > 0.5) confidence = 'Low';
  else if (contradictionCount > 0) confidence = 'Medium';
  else if (matchCount / total > 0.7) confidence = 'High';

  return {
    comparisons,
    score: {
      overall,
      band,
      dimensions: comparisons,
      confidence,
    },
  };
}

export function buildConsistencyReport(
  submissionId: string,
  analysisVersion: string,
  comparisons: DimensionComparison[],
  score: ConsistencyScore,
  reconciled: boolean = false,
  reconciliationNote?: string
): ConsistencyReport {
  let status: ConsistencyStatus;
  if (score.overall >= 80 && comparisons.every((c) => c.status !== DimensionComparisonStatus.CONTRADICTION)) {
    status = ConsistencyStatus.CONSISTENT;
  } else if (score.overall < 40 || comparisons.some((c) => c.status === DimensionComparisonStatus.CONTRADICTION)) {
    status = ConsistencyStatus.INCONSISTENT;
  } else if (comparisons.some((c) => c.status === DimensionComparisonStatus.INSUFFICIENT)) {
    status = ConsistencyStatus.INCONCLUSIVE;
  } else {
    status = ConsistencyStatus.PARTIAL;
  }

  return {
    submissionId: uuid(submissionId),
    analysisVersion,
    generatedAt: iso8601(new Date().toISOString()),
    status,
    score,
    reconciled,
    reconciliationNote,
  };
}
