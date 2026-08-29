import {
  CorrectnessStatus,
  ConfidenceLevel,
  ErrorCategory,
  CorrectnessTestOutcome,
} from '../../domain/types.js';
import type {
  DeterministicVerdict,
  EvidenceConfidence,
  FailureCluster,
  SubmissionRef,
  CompilationEvidence,
  CorrectnessTestResult,
  CorrectnessExecutionEvidence,
} from '../../domain/types.js';

/**
 * Pure function: ExecutionEvidence -> DeterministicVerdict.
 *
 * This function is the single source of truth for `status`. Nothing
 * downstream (including the AI layer) is permitted to change the value it
 * returns here. Every branch below is reachable by a real evidence shape —
 * there is no "ask the model" fallback baked into this file.
 */
export function classify(evidence: CorrectnessExecutionEvidence): DeterministicVerdict {
  const { compilation, tests } = evidence;

  // --- 1. Compilation gate -------------------------------------------------
  if (compilation && compilation.attempted && !compilation.success) {
    return {
      status: CorrectnessStatus.REJECTED,
      errorCategory: ErrorCategory.COMPILATION,
      confidence: {
        level: ConfidenceLevel.HIGH,
        reasons: ['Compilation failed; this is a deterministic, unambiguous fact.'],
      },
      passRateAvailable: null,
      totalAvailable: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      clusters: [],
      summary: 'Compilation failed. No test evidence is available because the program never ran.',
    };
  }

  // --- 2. No test evidence at all ------------------------------------------
  if (!tests || tests.totalAvailable === 0 || tests.results.length === 0) {
    return {
      status: CorrectnessStatus.INCONCLUSIVE,
      errorCategory: ErrorCategory.NONE,
      confidence: {
        level: ConfidenceLevel.LOW,
        reasons: ['No execution evidence is available for this submission version.'],
      },
      passRateAvailable: null,
      totalAvailable: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      clusters: [],
      summary: 'No test results available — cannot determine correctness.',
    };
  }

  // --- 3. Test evidence available ------------------------------------------
  const results = tests.results;
  const totalAvailable = tests.totalAvailable;
  const resultsAvailable = results.length;
  const gradingComplete = tests.gradingComplete;

  const passed = results.filter((r) => r.outcome === CorrectnessTestOutcome.PASSED).length;
  const failed = results.filter((r) => r.outcome === CorrectnessTestOutcome.FAILED).length;
  const errored = results.filter((r) => r.outcome === CorrectnessTestOutcome.ERRORED).length;
  const timeout = results.filter((r) => r.outcome === CorrectnessTestOutcome.TIMEOUT).length;
  const skipped = results.filter((r) => r.outcome === CorrectnessTestOutcome.SKIPPED).length;

  const hardFailures = failed + errored + timeout;
  const passRate = resultsAvailable > 0 ? passed / resultsAvailable : 0;
  const passRateAvailable = gradingComplete ? passed / totalAvailable : passed / resultsAvailable;

  // Cluster failures for diagnostic value
  const failingResults = results.filter(
    (r) =>
      r.outcome === CorrectnessTestOutcome.FAILED ||
      r.outcome === CorrectnessTestOutcome.ERRORED ||
      r.outcome === CorrectnessTestOutcome.TIMEOUT
  );
  const clusters = clusterFailures(failingResults);

  // --- 4. Status classification --------------------------------------------
  let status: CorrectnessStatus;
  let errorCategory: ErrorCategory;
  let summary: string;
  const confidence: EvidenceConfidence = { level: ConfidenceLevel.MEDIUM, reasons: [] };

  if (hardFailures === 0 && passed === resultsAvailable) {
    status = CorrectnessStatus.ACCEPTED;
    errorCategory = ErrorCategory.NONE;
    summary = `All ${resultsAvailable} available test(s) pass.`;
    confidence.level = gradingComplete ? ConfidenceLevel.HIGH : ConfidenceLevel.MEDIUM;
    confidence.reasons = [
      gradingComplete
        ? `All ${totalAvailable} tests pass (grading complete).`
        : `All ${resultsAvailable} available tests pass; ${totalAvailable - resultsAvailable} tests pending.`,
    ];
  } else if (passed === 0 && hardFailures > 0) {
    status = CorrectnessStatus.REJECTED;
    errorCategory = timeout > 0 ? ErrorCategory.TIMEOUT : ErrorCategory.LOGIC;
    summary = `All ${resultsAvailable} available test(s) fail (${hardFailures} hard failure${hardFailures > 1 ? 's' : ''}).`;
    confidence.level = gradingComplete ? ConfidenceLevel.HIGH : ConfidenceLevel.MEDIUM;
    confidence.reasons = [
      gradingComplete
        ? `All ${totalAvailable} tests fail (grading complete).`
        : `All ${resultsAvailable} available tests fail; ${totalAvailable - resultsAvailable} tests pending.`,
    ];
  } else if (passed > 0 && hardFailures > 0) {
    status = CorrectnessStatus.PARTIALLY_ACCEPTED;
    errorCategory = ErrorCategory.LOGIC;
    summary = `${passed}/${resultsAvailable} available test(s) pass; ${hardFailures} fail.`;
    confidence.level = gradingComplete ? ConfidenceLevel.MEDIUM : ConfidenceLevel.LOW;
    confidence.reasons = [
      'Mixed pass/fail results — correctness is ambiguous without full test suite visibility.',
    ];
  } else {
    status = CorrectnessStatus.INCONCLUSIVE;
    errorCategory = ErrorCategory.NONE;
    summary = 'Unable to determine status from available evidence.';
    confidence.level = ConfidenceLevel.LOW;
    confidence.reasons = ['Insufficient or conflicting evidence.'];
  }

  return {
    status,
    errorCategory,
    confidence,
    passRateAvailable: gradingComplete ? passRateAvailable : null,
    totalAvailable,
    passed,
    failed: hardFailures,
    skipped,
    clusters,
    summary,
  };
}

/**
 * Known tag -> hypothesis mapping. This is intentionally a fixed table, not
 * an LLM call: clustering by shared metadata is a deterministic set
 * operation, and the *hypothesis text* is explicitly worded as a possible
 * explanation, never a proven fact.
 */
const TAG_HYPOTHESES: Record<string, string> = {
  boundary: 'Possible boundary-handling issue: initialization, off-by-one, or empty/single-element handling.',
  empty: 'Possible issue handling empty input (e.g. N = 0).',
  'single-element': 'Possible issue handling a single-element input.',
  'large-n': 'Possible resource, scaling, or numeric-limit issue on large inputs.',
  'duplicate-values': 'Possible incorrect handling of duplicate values or a hidden uniqueness assumption.',
  'negative-values': 'Possible sign-handling, initialization, or comparison-assumption issue with negative values.',
  'already-sorted': 'Possible assumption that input arrives unsorted.',
  'reverse-sorted': 'Possible incorrect comparator direction or ordering assumption.',
  'overflow-boundary': 'Possible integer overflow near a numeric boundary.',
  'precision-boundary': 'Possible floating-point precision issue.',
  'disconnected-graph': 'Possible assumption that the graph is fully connected.',
  cyclic: 'Possible missing cycle handling (infinite loop / stack risk).',
  'recursion-boundary': 'Possible recursion depth or base-case issue.',
};

/**
 * Clusters failing tests by shared tags. Never receives or exposes raw
 * hidden test inputs — only the non-identifying `tags` metadata that the
 * execution system already attaches to each TestResult.
 */
export function clusterFailures(failing: CorrectnessTestResult[]): FailureCluster[] {
  if (failing.length === 0) return [];

  // Count tag frequency among failing tests only.
  const tagCounts = new Map<string, number>();
  for (const t of failing) {
    for (const tag of t.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  // Tags that appear in ALL failing tests are the strongest candidates.
  const universalTags = Array.from(tagCounts.entries())
    .filter(([, count]) => count === failing.length)
    .map(([tag]) => tag);

  // Form clusters: one per universal tag; if none, single "general" cluster.
  if (universalTags.length > 0) {
    return universalTags.map((tag, idx) => ({
      id: `cluster-${idx}`,
      testIds: failing.map((t) => t.id),
      sharedTags: [tag],
      hypothesis: TAG_HYPOTHESES[tag] ?? `Common failure pattern: all failing tests share tag "${tag}".`,
      observedFact: `All ${failing.length} failing test(s) carry the tag "${tag}".`,
    }));
  }

  // Fallback: group by individual tag where count > 1
  const sharedTags = Array.from(tagCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([tag]) => tag);

  if (sharedTags.length > 0) {
    const clusters: FailureCluster[] = [];
    for (let i = 0; i < sharedTags.length; i++) {
      const tag = sharedTags[i];
      clusters.push({
        id: `cluster-${i}`,
        testIds: failing.filter((t) => t.tags.includes(tag)).map((t) => t.id),
        sharedTags: [tag],
        hypothesis: TAG_HYPOTHESES[tag] ?? `Common failure pattern associated with "${tag}".`,
        observedFact: `${tagCounts.get(tag)} of ${failing.length} failing test(s) share tag "${tag}".`,
      });
    }
    return clusters;
  }

  // No shared tags — single generic cluster
  return [
    {
      id: 'cluster-general',
      testIds: failing.map((t) => t.id),
      sharedTags: [],
      hypothesis: 'Failures do not share a common metadata tag; root cause may be diverse.',
      observedFact: `${failing.length} failing test(s) with no shared classification tags.`,
    },
  ];
}
