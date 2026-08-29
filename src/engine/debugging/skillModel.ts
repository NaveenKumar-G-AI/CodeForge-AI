// Debugging Engine — Skill Assessment Model
import {
  SkillDimensionName,
  SKILL_DIMENSIONS,
  SkillDimensionScore,
  DebuggingResult,
  DebuggingResultStatus,
  DebuggingReport,
  TimelineEvent,
  RootCauseChain,
  RegressionVerification,
  OverfittingSignal,
} from '../../domain/types.js';

/**
 * Score debugging skills based on session activity
 */
export function scoreDebuggingSkills(
  actions: any[],
  hypotheses: any[],
  experiments: any[],
  rootCause: RootCauseChain | null,
  regression: RegressionVerification | null
): SkillDimensionScore[] {
  const dimensions: SkillDimensionScore[] = [];

  // FAILURE_RECOGNITION: How quickly was the failure identified
  const recognizeActions = actions.filter((a) =>
    ['INSPECT_OUTPUT', 'RUN_FAILING_TEST', 'INSPECT_TRACE'].includes(a.type)
  );
  dimensions.push(scoreDimension(
    'FAILURE_RECOGNITION',
    recognizeActions.length,
    [0, 1, 2, 3],
    [0, 30, 60, 80, 100]
  ));

  // REPRODUCTION: Was failure reproduced?
  const hasRepro = actions.some((a) => a.type === 'RUN_FAILING_TEST');
  dimensions.push(scoreDimension(
    'REPRODUCTION',
    hasRepro ? 1 : 0,
    [0, 1],
    [0, 50, 90]
  ));

  // LOCALIZATION: Was issue located?
  const localizeActions = actions.filter((a) =>
    ['INSPECT_VARIABLE', 'INSPECT_TRACE', 'ADD_DIAGNOSTIC'].includes(a.type)
  );
  dimensions.push(scoreDimension(
    'LOCALIZATION',
    localizeActions.length,
    [0, 1, 2, 3],
    [0, 30, 60, 80, 100]
  ));

  // HYPOTHESIS_FORMATION: Were hypotheses formed?
  const qualityHyps = hypotheses.filter((h) => h.suspectedLocation || h.suspectedCause);
  dimensions.push(scoreDimension(
    'HYPOTHESIS_FORMATION',
    qualityHyps.length,
    [0, 1, 2, 3],
    [0, 40, 70, 85, 100]
  ));

  // EVIDENCE_GATHERING: Was evidence collected?
  const evidenceActions = actions.filter((a) =>
    ['RUN_FAILING_TEST', 'RUN_SELECTED_TEST', 'RUN_FULL_SUITE', 'INSPECT_OUTPUT', 'INSPECT_VARIABLE', 'INSPECT_TRACE', 'ADD_DIAGNOSTIC'].includes(a.type)
  );
  dimensions.push(scoreDimension(
    'EVIDENCE_GATHERING',
    evidenceActions.length,
    [0, 2, 4, 6],
    [0, 25, 50, 75, 100]
  ));

  // EXPERIMENT_DESIGN: Were experiments conducted?
  const completeExps = experiments.filter((e) => e.conclusion !== null);
  dimensions.push(scoreDimension(
    'EXPERIMENT_DESIGN',
    completeExps.length,
    [0, 1, 2],
    [0, 40, 70, 90]
  ));

  // ROOT_CAUSE_ANALYSIS: Was root cause identified?
  const hasRootCause = rootCause !== null;
  const rootCauseQuality = rootCause ? 1 : 0;
  dimensions.push(scoreDimension(
    'ROOT_CAUSE_ANALYSIS',
    rootCauseQuality,
    [0, 1],
    [0, 40, 90]
  ));

  // FIX_QUALITY: Was fix effective?
  const hasFix = actions.some((a) => a.type === 'APPLY_FIX');
  const fixWorked = regression?.originalFailureFixed || false;
  dimensions.push(scoreDimension(
    'FIX_QUALITY',
    hasFix && fixWorked ? 2 : hasFix ? 1 : 0,
    [0, 1, 2],
    [0, 40, 80, 100]
  ));

  // REGRESSION_VERIFICATION: Were other tests checked?
  const verifiedRegression = regression?.relatedTestsPassed && regression?.hiddenTestsPassed;
  dimensions.push(scoreDimension(
    'REGRESSION_VERIFICATION',
    verifiedRegression ? 1 : 0,
    [0, 1],
    [0, 50, 90]
  ));

  // DEBUGGING_EFFICIENCY: Actions per outcome
  const totalActions = actions.length;
  const effective = rootCause ? 1 : 0;
  const efficiency = totalActions > 0 ? Math.round((effective / totalActions) * 100) : 0;
  dimensions.push(scoreDimension(
    'DEBUGGING_EFFICIENCY',
    efficiency,
    [0, 50, 80, 100],
    [0, 20, 50, 80, 100]
  ));

  return dimensions;
}

function scoreDimension(
  name: SkillDimensionName,
  value: number,
  thresholds: number[],
  scores: number[]
): SkillDimensionScore {
  let score = 0;
  let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let status: 'INSUFFICIENT_EVIDENCE' | 'SCORED' = 'INSUFFICIENT_EVIDENCE';

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) {
      score = scores[i + 1] || scores[i];
      break;
    }
  }

  if (value > 0) {
    status = 'SCORED';
    if (value >= thresholds[thresholds.length - 1]) confidence = 'HIGH';
    else if (value >= thresholds[Math.floor(thresholds.length / 2)]) confidence = 'MEDIUM';
    else confidence = 'LOW';
  }

  return {
    dimension: name,
    score: Math.min(100, Math.max(0, score)),
    confidence,
    evidence: [`${name}: value=${value}`],
    status,
  };
}

/**
 * Generate debugging report from result
 */
export function generateDebuggingReport(
  status: DebuggingResultStatus,
  rootCause: RootCauseChain | null,
  regression: RegressionVerification | null,
  overfitting: OverfittingSignal | null,
  dimensions: SkillDimensionScore[]
): DebuggingReport {
  const strengths: string[] = [];
  const improvements: string[] = [];

  // Identify strengths
  for (const dim of dimensions) {
    if (dim.score >= 80 && dim.status === 'SCORED') {
      strengths.push(dim.dimension.replace(/_/g, ' ').toLowerCase());
    }
    if (dim.score < 50 && dim.status === 'SCORED') {
      improvements.push(dim.dimension.replace(/_/g, ' ').toLowerCase());
    }
  }

  // Build summaries
  const failureSummary = rootCause
    ? `Root cause identified: ${rootCause.rootCause}`
    : 'Root cause not definitively identified';

  const rootCauseSummary = rootCause
    ? `Symptom: ${rootCause.symptom}; Location: ${rootCause.location}; Cause: ${rootCause.cause}`
    : 'Root cause analysis incomplete';

  const processSummary = `Debugging sessions completed with status: ${status}`;
  const fixSummary = regression?.originalFailureFixed
    ? 'Fix verified as effective'
    : regression
    ? 'Fix partially effective'
    : 'Fix verification incomplete';

  const verificationSummary = regression
    ? `Original: ${regression.originalFailureFixed ? 'fixed' : 'not fixed'}; Related: ${regression.relatedTestsPassed ? 'pass' : 'fail'}; Hidden: ${regression.hiddenTestsPassed ? 'pass' : 'fail'}`
    : 'Verification not completed';

  return {
    failureSummary,
    rootCauseSummary,
    processSummary,
    fixSummary,
    verificationSummary,
    strengths: strengths.length > 0 ? strengths : ['Attempted systematic debugging'],
    improvements: improvements.length > 0 ? improvements : ['Consider more structured hypothesis testing'],
  };
}

/**
 * Generate timeline from actions
 */
export function generateTimeline(actions: any[]): TimelineEvent[] {
  return actions
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((a) => ({
      type: a.type,
      at: a.createdAt,
      detail: a.metadata ? JSON.stringify(a.metadata).substring(0, 100) : undefined,
    }));
}