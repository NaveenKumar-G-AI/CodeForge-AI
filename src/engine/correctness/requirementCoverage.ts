import {
  RequirementCoverageStatus,
  CorrectnessTestOutcome,
  CorrectnessRequirement as Requirement,
  RequirementCoverage,
  CorrectnessExecutionEvidence,
  StaticFinding,
} from '../../domain/types.js';

/**
 * For each requirement, determine coverage status from real evidence only.
 * A requirement is matched to test evidence via `relatedTags` <-> `TestResult.tags`
 * intersection — a simple, auditable, deterministic join. No LLM involved.
 */
export function computeRequirementCoverage(
  requirements: Requirement[],
  evidence: CorrectnessExecutionEvidence,
  staticFindings: StaticFinding[]
): RequirementCoverage[] {
  const results = evidence.tests?.results ?? [];

  return requirements.map((req) => {
    const relatedTests = results.filter((t) =>
      t.tags.some((tag) => req.relatedTags.includes(tag))
    );
    const passing = relatedTests.filter((t) => t.outcome === CorrectnessTestOutcome.PASSED);
    const failing = relatedTests.filter(
      (t) => t.outcome !== CorrectnessTestOutcome.PASSED && t.outcome !== CorrectnessTestOutcome.SKIPPED
    );
    const relatedStatic = staticFindings.filter((f) =>
      f.message.toLowerCase().includes(req.category)
    );

    const supportingIds = [
      ...passing.map((t) => t.id),
      ...relatedStatic.filter((f) => f.severity === 'info').map((f) => f.ruleId),
    ];
    const contradictingIds = [
      ...failing.map((t) => t.id),
      ...relatedStatic.filter((f) => f.severity === 'error').map((f) => f.ruleId),
    ];

    let status: RequirementCoverageStatus;
    let rationale: string;

    if (relatedTests.length === 0) {
      status = RequirementCoverageStatus.NOT_COVERED;
      rationale = `No available test is tagged in a way that exercises "${req.description}".`;
    } else if (failing.length === 0) {
      status = RequirementCoverageStatus.COVERED;
      rationale = `${passing.length}/${relatedTests.length} tagged test(s) covering this requirement pass, and none fail.`;
    } else if (passing.length === 0) {
      status = RequirementCoverageStatus.CONTRADICTED;
      rationale = `All ${failing.length} tagged test(s) covering this requirement fail.`;
    } else {
      status = RequirementCoverageStatus.PARTIALLY_COVERED;
      rationale = `${passing.length}/${relatedTests.length} tagged test(s) pass; ${failing.length} fail.`;
    }

    return {
      requirement: req,
      status,
      supportingEvidenceIds: supportingIds,
      rationale,
    };
  });
}
