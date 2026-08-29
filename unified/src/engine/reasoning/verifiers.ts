// Reasoning Verification Engine — Verifiers
import {
  Claim,
  ClaimVerification,
  VerificationStatus,
  ReasoningEvidence,
  ReasoningEvidenceType,
  ReasoningEvidenceStrength,
  ContradictionCategory,
  Contradiction,
  ReasoningSourceLocation,
} from '../../domain/types.js';

export interface VerifierContext {
  sourceCode: string;
  language: string;
  problem?: any;
  astFacts: AstFacts;
  detectedPatterns: DetectedPattern[];
  complexity: any;
}

export interface AstFacts {
  functions: Array<{ name: string; params: string[]; body: string; complexity: string }>;
  loops: Array<{ type: string; depth: number; body: string }>;
  conditionals: Array<{ condition: string; depth: number }>;
  dataStructures: string[];
  imports: string[];
  variables: Array<{ name: string; type: string; scope: string }>;
}

export interface DetectedPattern {
  type: string;
  location: ReasoningSourceLocation;
  description: string;
}

function makeEvidence(
  type: ReasoningEvidenceType,
  strength: ReasoningEvidenceStrength,
  description: string,
  location: ReasoningSourceLocation | null,
  data?: Record<string, unknown>
): ReasoningEvidence {
  return { evidenceType: type, strength, description, sourceLocation: location, data };
}

function makeVerification(
  claimId: string,
  status: VerificationStatus,
  confidence: number,
  evidence: ReasoningEvidence[],
  explanation: string
): ClaimVerification {
  return { claimId, status, confidence, evidence, explanation };
}

export function verifyAlgorithmClaim(claim: Claim, ctx: VerifierContext): ClaimVerification {
  const { astFacts } = ctx;
  const evidence: ReasoningEvidence[] = [];

  // Check if claimed algorithm matches actual implementation
  const claimedAlgo = claim.normalizedMeaning.toLowerCase();
  const actualAlgos = astFacts.functions
    .map((f) => f.name.toLowerCase())
    .concat(astFacts.dataStructures.map((d) => d.toLowerCase()));

  const matched = actualAlgos.some((a) => claimedAlgo.includes(a) || a.includes(claimedAlgo));

  if (matched) {
    evidence.push(
      makeEvidence(
        ReasoningEvidenceType.SOURCE_EVIDENCE,
        ReasoningEvidenceStrength.DIRECT,
        `Implementation contains algorithm-related construct matching claim`,
        null,
        { matchedAlgorithms: actualAlgos.filter((a) => claimedAlgo.includes(a)) }
      )
    );
    return makeVerification(
      claim.claimId,
      VerificationStatus.SUPPORTED,
      0.85,
      evidence,
      `Code contains constructs consistent with claimed algorithm "${claim.normalizedMeaning}".`
    );
  }

  // Check for common algorithm patterns in AST
  const hasRecursion = astFacts.functions.some((f) =>
    f.body.toLowerCase().includes(f.name.toLowerCase() + '(')
  );
  const hasLoop = astFacts.loops.length > 0;

  if (claimedAlgo.includes('recursive') && hasRecursion) {
    evidence.push(
      makeEvidence(ReasoningEvidenceType.AST_EVIDENCE, ReasoningEvidenceStrength.STRONG, 'Recursive function detected', null)
    );
    return makeVerification(claim.claimId, VerificationStatus.SUPPORTED, 0.8, evidence, 'Recursive implementation found');
  }

  if ((claimedAlgo.includes('iterative') || claimedAlgo.includes('loop')) && hasLoop) {
    evidence.push(
      makeEvidence(ReasoningEvidenceType.CONTROL_FLOW_EVIDENCE, ReasoningEvidenceStrength.STRONG, 'Loop structure detected', null)
    );
    return makeVerification(claim.claimId, VerificationStatus.SUPPORTED, 0.75, evidence, 'Iterative implementation found');
  }

  evidence.push(
    makeEvidence(ReasoningEvidenceType.SOURCE_EVIDENCE, ReasoningEvidenceStrength.INSUFFICIENT, 'No matching algorithm pattern found in code', null)
  );
  return makeVerification(
    claim.claimId,
    VerificationStatus.UNVERIFIED,
    0.3,
    evidence,
    `Cannot verify algorithm claim "${claim.normalizedMeaning}" from available code evidence.`
  );
}

export function verifyDataStructureClaim(claim: Claim, ctx: VerifierContext): ClaimVerification {
  const { astFacts } = ctx;
  const evidence: ReasoningEvidence[] = [];
  const claimedDS = claim.normalizedMeaning.toLowerCase();
  const actualDS = astFacts.dataStructures.map((d) => d.toLowerCase());

  const matched = actualDS.some((d) => claimedDS.includes(d) || d.includes(claimedDS));

  if (matched) {
    evidence.push(
      makeEvidence(
        ReasoningEvidenceType.AST_EVIDENCE,
        ReasoningEvidenceStrength.DIRECT,
        `AST shows data structure matching claim`,
        null,
        { matchedStructures: actualDS.filter((d) => claimedDS.includes(d)) }
      )
    );
    return makeVerification(
      claim.claimId,
      VerificationStatus.SUPPORTED,
      0.9,
      evidence,
      `Code uses data structure consistent with claim: "${claim.normalizedMeaning}".`
    );
  }

  evidence.push(
    makeEvidence(ReasoningEvidenceType.AST_EVIDENCE, ReasoningEvidenceStrength.INSUFFICIENT, 'No matching data structure found', null)
  );
  return makeVerification(
    claim.claimId,
    VerificationStatus.UNVERIFIED,
    0.2,
    evidence,
    `Cannot verify data structure claim "${claim.normalizedMeaning}" — not found in code.`
  );
}

export function verifyImplementationDecisionClaim(claim: Claim, ctx: VerifierContext): ClaimVerification {
  const { astFacts } = ctx;
  const evidence: ReasoningEvidence[] = [];

  // Check if implementation pattern matches claim
  const claimedDecision = claim.normalizedMeaning.toLowerCase();
  const hasPattern = ctx.detectedPatterns.some((p: DetectedPattern) =>
    p.description.toLowerCase().includes(claimedDecision) ||
    p.type.toLowerCase().includes(claimedDecision)
  );

  if (hasPattern) {
    evidence.push(
      makeEvidence(
        ReasoningEvidenceType.SOURCE_EVIDENCE,
        ReasoningEvidenceStrength.STRONG,
        `Implementation pattern matches claim`,
        null
      )
    );
    return makeVerification(
      claim.claimId,
      VerificationStatus.SUPPORTED,
      0.8,
      evidence,
      `Implementation decision "${claim.normalizedMeaning}" is reflected in code structure.`
    );
  }

  evidence.push(
    makeEvidence(ReasoningEvidenceType.SOURCE_EVIDENCE, ReasoningEvidenceStrength.INSUFFICIENT, 'No matching implementation pattern', null)
  );
  return makeVerification(
    claim.claimId,
    VerificationStatus.UNVERIFIED,
    0.3,
    evidence,
    `Cannot verify implementation decision "${claim.normalizedMeaning}".`
  );
}

export function verifyComplexityClaim(claim: Claim, ctx: VerifierContext): ClaimVerification {
  const { complexity, astFacts } = ctx;
  const evidence: ReasoningEvidence[] = [];
  const claimedComplexity = claim.normalizedMeaning.toLowerCase();

  const estimated = complexity?.timeComplexity || 'UNKNOWN';
  const match = claimedComplexity.includes(estimated.toLowerCase().replace(/[()^]/g, ''));

  if (match) {
    evidence.push(
      makeEvidence(
        ReasoningEvidenceType.COMPLEXITY_EVIDENCE,
        ReasoningEvidenceStrength.DIRECT,
        `Estimated complexity matches claim`,
        null,
        { estimated, claimed: claim.normalizedMeaning }
      )
    );
    return makeVerification(
      claim.claimId,
      VerificationStatus.SUPPORTED,
      0.85,
      evidence,
      `Complexity claim "${claim.normalizedMeaning}" aligns with static analysis estimate: ${estimated}.`
    );
  }

  // Check if claim is more generous than actual (optimistic)
  const complexityOrder = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(n^3)', 'O(2^n)', 'O(n!)'];
  const claimedIdx = complexityOrder.findIndex((c) => claimedComplexity.includes(c.toLowerCase()));
  const actualIdx = complexityOrder.indexOf(estimated);

  if (claimedIdx >= 0 && actualIdx >= 0 && claimedIdx > actualIdx) {
    evidence.push(
      makeEvidence(
        ReasoningEvidenceType.COMPLEXITY_EVIDENCE,
        ReasoningEvidenceStrength.STRONG,
        `Claimed complexity is better than actual`,
        null,
        { estimated, claimed: claim.normalizedMeaning }
      )
    );
    return makeVerification(
      claim.claimId,
      VerificationStatus.CONTRADICTED,
      0.75,
      evidence,
      `Claimed complexity "${claim.normalizedMeaning}" is optimistic — actual estimate is ${estimated}.`
    );
  }

  evidence.push(
    makeEvidence(
      ReasoningEvidenceType.COMPLEXITY_EVIDENCE,
      ReasoningEvidenceStrength.WEAK,
      `Claimed complexity does not match estimate`,
      null,
      { estimated, claimed: claim.normalizedMeaning }
    )
  );
  return makeVerification(
    claim.claimId,
    VerificationStatus.PARTIALLY_SUPPORTED,
    0.4,
    evidence,
    `Complexity claim "${claim.normalizedMeaning}" partially matches — estimated ${estimated}.`
  );
}

export function verifySpaceComplexityClaim(claim: Claim, ctx: VerifierContext): ClaimVerification {
  const { complexity } = ctx;
  const evidence: ReasoningEvidence[] = [];
  const claimedSpace = claim.normalizedMeaning.toLowerCase();
  const estimated = complexity?.spaceComplexity || 'UNKNOWN';
  const match = claimedSpace.includes(estimated.toLowerCase().replace(/[()^]/g, ''));

  if (match) {
    evidence.push(
      makeEvidence(
        ReasoningEvidenceType.COMPLEXITY_EVIDENCE,
        ReasoningEvidenceStrength.DIRECT,
        `Estimated space complexity matches claim`,
        null,
        { estimated, claimed: claim.normalizedMeaning }
      )
    );
    return makeVerification(
      claim.claimId,
      VerificationStatus.SUPPORTED,
      0.85,
      evidence,
      `Space complexity claim "${claim.normalizedMeaning}" matches estimate: ${estimated}.`
    );
  }

  evidence.push(
    makeEvidence(
      ReasoningEvidenceType.COMPLEXITY_EVIDENCE,
      ReasoningEvidenceStrength.WEAK,
      `Claimed space complexity does not match estimate`,
      null
    )
  );
  return makeVerification(
    claim.claimId,
    VerificationStatus.UNVERIFIED,
    0.4,
    evidence,
    `Space complexity claim "${claim.normalizedMeaning}" — estimated ${estimated}.`
  );
}

export function verifyEdgeCaseClaim(claim: Claim, ctx: VerifierContext): ClaimVerification {
  const { astFacts } = ctx;
  const evidence: ReasoningEvidence[] = [];
  const claimedEdge = claim.normalizedMeaning.toLowerCase();

  // Look for boundary checks, empty handling, null checks
  const hasBoundaryCheck = astFacts.conditionals.some(
    (c) =>
      c.condition.toLowerCase().includes('empty') ||
      c.condition.toLowerCase().includes('null') ||
      c.condition.toLowerCase().includes('undefined') ||
      c.condition.toLowerCase().includes('length') ||
      c.condition.toLowerCase().includes('size') ||
      c.condition.toLowerCase().includes('== 0') ||
      c.condition.toLowerCase().includes('=== 0')
  );

  if (hasBoundaryCheck) {
    evidence.push(
      makeEvidence(
        ReasoningEvidenceType.CONTROL_FLOW_EVIDENCE,
        ReasoningEvidenceStrength.STRONG,
        `Boundary/edge case checks detected in conditionals`,
        null
      )
    );
    return makeVerification(
      claim.claimId,
      VerificationStatus.SUPPORTED,
      0.8,
      evidence,
      `Edge case handling consistent with claim "${claim.normalizedMeaning}" found in conditionals.`
    );
  }

  evidence.push(
    makeEvidence(
      ReasoningEvidenceType.CONTROL_FLOW_EVIDENCE,
      ReasoningEvidenceStrength.WEAK,
      `No explicit edge case handling detected`,
      null
    )
  );
  return makeVerification(
    claim.claimId,
    VerificationStatus.UNVERIFIED,
    0.3,
    evidence,
    `Cannot verify edge case claim "${claim.normalizedMeaning}" — no boundary checks found.`
  );
}

export function verifyControlFlowClaim(claim: Claim, ctx: VerifierContext): ClaimVerification {
  const { astFacts } = ctx;
  const evidence: ReasoningEvidence[] = [];
  const claimedFlow = claim.normalizedMeaning.toLowerCase();

  const hasLoops = astFacts.loops.length > 0;
  const hasConditionals = astFacts.conditionals.length > 0;
  const hasRecursion = astFacts.functions.some((f) =>
    f.body.toLowerCase().includes(f.name.toLowerCase() + '(')
  );

  let supported = false;
  if (claimedFlow.includes('loop') && hasLoops) supported = true;
  if (claimedFlow.includes('conditional') && hasConditionals) supported = true;
  if (claimedFlow.includes('branch') && hasConditionals) supported = true;
  if (claimedFlow.includes('recursive') && hasRecursion) supported = true;
  if (claimedFlow.includes('iteration') && hasLoops) supported = true;

  if (supported) {
    evidence.push(
      makeEvidence(
        ReasoningEvidenceType.CONTROL_FLOW_EVIDENCE,
        ReasoningEvidenceStrength.DIRECT,
        `Control flow structures match claim`,
        null,
        { loops: astFacts.loops.length, conditionals: astFacts.conditionals.length, recursion: hasRecursion }
      )
    );
    return makeVerification(
      claim.claimId,
      VerificationStatus.SUPPORTED,
      0.85,
      evidence,
      `Control flow claim "${claim.normalizedMeaning}" supported by code structure.`
    );
  }

  evidence.push(
    makeEvidence(ReasoningEvidenceType.CONTROL_FLOW_EVIDENCE, ReasoningEvidenceStrength.INSUFFICIENT, 'No matching control flow pattern', null)
  );
  return makeVerification(
    claim.claimId,
    VerificationStatus.UNVERIFIED,
    0.2,
    evidence,
    `Cannot verify control flow claim "${claim.normalizedMeaning}".`
  );
}

export function verifyInvariantClaim(claim: Claim, ctx: VerifierContext): ClaimVerification {
  const { astFacts } = ctx;
  const evidence: ReasoningEvidence[] = [];

  // Look for loop invariants, assertions, or pre/post conditions
  const hasAssert = astFacts.conditionals.some(
    (c) =>
      c.condition.toLowerCase().includes('assert') ||
      c.condition.toLowerCase().includes('invariant') ||
      c.condition.toLowerCase().includes('precondition') ||
      c.condition.toLowerCase().includes('postcondition')
  );

  if (hasAssert) {
    evidence.push(
      makeEvidence(
        ReasoningEvidenceType.SOURCE_EVIDENCE,
        ReasoningEvidenceStrength.STRONG,
        `Assertion/invariant-like checks found`,
        null
      )
    );
    return makeVerification(
      claim.claimId,
      VerificationStatus.SUPPORTED,
      0.75,
      evidence,
      `Invariant claim "${claim.normalizedMeaning}" supported by assertion-like constructs.`
    );
  }

  evidence.push(
    makeEvidence(ReasoningEvidenceType.SOURCE_EVIDENCE, ReasoningEvidenceStrength.INSUFFICIENT, 'No invariant assertions found', null)
  );
  return makeVerification(
    claim.claimId,
    VerificationStatus.UNVERIFIED,
    0.3,
    evidence,
    `Cannot verify invariant claim "${claim.normalizedMeaning}" — no assertions detected.`
  );
}

export function verifyProblemUnderstandingClaim(claim: Claim, ctx: VerifierContext): ClaimVerification {
  const { problem } = ctx;
  const evidence: ReasoningEvidence[] = [];

  if (!problem) {
    evidence.push(
      makeEvidence(
        ReasoningEvidenceType.PROBLEM_REQUIREMENT_EVIDENCE,
        ReasoningEvidenceStrength.INSUFFICIENT,
        'No problem specification available for comparison',
        null
      )
    );
    return makeVerification(
      claim.claimId,
      VerificationStatus.UNVERIFIED,
      0.1,
      evidence,
      'Problem specification unavailable — cannot verify understanding claim.'
    );
  }

  // Compare claim against problem requirements
  const problemText = `${problem.inputs} ${problem.outputs} ${problem.constraints.join(' ')} ${problem.requiredBehavior}`.toLowerCase();
  const claimText = claim.normalizedMeaning.toLowerCase();

  // Simple keyword overlap check
  const problemKeywords = new Set(problemText.split(/\s+/).filter((w) => w.length > 3));
  const claimKeywords = claimText.split(/\s+/).filter((w) => w.length > 3);
  const overlap = claimKeywords.filter((k) => problemKeywords.has(k)).length;
  const overlapRatio = claimKeywords.length > 0 ? overlap / claimKeywords.length : 0;

  if (overlapRatio > 0.5) {
    evidence.push(
      makeEvidence(
        ReasoningEvidenceType.PROBLEM_REQUIREMENT_EVIDENCE,
        ReasoningEvidenceStrength.STRONG,
        `High keyword overlap with problem specification`,
        null,
        { overlapRatio, overlapCount: overlap }
      )
    );
    return makeVerification(
      claim.claimId,
      VerificationStatus.SUPPORTED,
      0.7,
      evidence,
      `Understanding claim aligns well with problem requirements (${Math.round(overlapRatio * 100)}% keyword overlap).`
    );
  }

  evidence.push(
    makeEvidence(
      ReasoningEvidenceType.PROBLEM_REQUIREMENT_EVIDENCE,
      ReasoningEvidenceStrength.WEAK,
      `Low keyword overlap with problem specification`,
      null,
      { overlapRatio }
    )
  );
  return makeVerification(
    claim.claimId,
    VerificationStatus.PARTIALLY_SUPPORTED,
    0.4,
    evidence,
    `Understanding claim "${claim.normalizedMeaning}" has limited alignment with problem spec (${Math.round(overlapRatio * 100)}% overlap).`
  );
}

export function verifyUnhandledClaimType(claim: Claim, ctx: VerifierContext): ClaimVerification {
  return makeVerification(
    claim.claimId,
    VerificationStatus.UNVERIFIED,
    0.1,
    [
      makeEvidence(
        ReasoningEvidenceType.SEMANTIC_EVIDENCE,
        ReasoningEvidenceStrength.INSUFFICIENT,
        `No verifier available for claim type: ${claim.claimType}`,
        null
      ),
    ],
    `Claim type "${claim.claimType}" not yet supported by verification engine.`
  );
}
