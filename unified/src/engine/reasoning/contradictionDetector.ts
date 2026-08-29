// Reasoning Verification Engine — Contradiction Detector
import {
  Claim,
  ClaimVerification,
  Contradiction,
  ContradictionCategory,
  ReasoningSourceLocation,
} from '../../domain/types.js';

const CONTRADICTION_RULES: Array<{
  category: ContradictionCategory;
  claimTypes: string[];
  check: (claim: Claim, verification: ClaimVerification, ctx: { sourceCode: string; astFacts: any; complexity: any }) => boolean;
  makeExplanation: (claim: Claim, ctx: any) => string;
  getLocation: (claim: Claim, ctx: any) => ReasoningSourceLocation | null;
}> = [
  {
    category: ContradictionCategory.ALGORITHM_MISMATCH,
    claimTypes: ['ALGORITHM'],
    check: (claim, verification) =>
      verification.status === 'CONTRADICTED' &&
      claim.normalizedMeaning.toLowerCase().includes('algorithm'),
    makeExplanation: (claim) =>
      `Student claims algorithm "${claim.normalizedMeaning}" but implementation uses a different approach.`,
    getLocation: () => null,
  },
  {
    category: ContradictionCategory.DATA_STRUCTURE_MISMATCH,
    claimTypes: ['DATA_STRUCTURE'],
    check: (claim, verification) =>
      verification.status === 'CONTRADICTED' &&
      claim.normalizedMeaning.toLowerCase().includes('data'),
    makeExplanation: (claim) =>
      `Student claims data structure "${claim.normalizedMeaning}" but code uses a different structure.`,
    getLocation: () => null,
  },
  {
    category: ContradictionCategory.CONTROL_FLOW_MISMATCH,
    claimTypes: ['CONTROL_FLOW'],
    check: (claim, verification) =>
      verification.status === 'CONTRADICTED' &&
      (claim.normalizedMeaning.toLowerCase().includes('loop') ||
        claim.normalizedMeaning.toLowerCase().includes('branch') ||
        claim.normalizedMeaning.toLowerCase().includes('conditional')),
    makeExplanation: (claim) =>
      `Student claims control flow "${claim.normalizedMeaning}" but actual control flow differs.`,
    getLocation: () => null,
  },
  {
    category: ContradictionCategory.COMPLEXITY_MISMATCH,
    claimTypes: ['COMPLEXITY'],
    check: (claim, verification) =>
      verification.status === 'CONTRADICTED' &&
      claim.normalizedMeaning.toLowerCase().includes('complexity'),
    makeExplanation: (claim, ctx) =>
      `Student claims complexity "${claim.normalizedMeaning}" but static analysis estimates ${ctx.complexity?.timeComplexity || 'unknown'}.`,
    getLocation: () => null,
  },
  {
    category: ContradictionCategory.SPACE_COMPLEXITY_MISMATCH,
    claimTypes: ['SPACE_COMPLEXITY'],
    check: (claim, verification) =>
      verification.status === 'CONTRADICTED' &&
      claim.normalizedMeaning.toLowerCase().includes('space'),
    makeExplanation: (claim, ctx) =>
      `Student claims space complexity "${claim.normalizedMeaning}" but analysis estimates ${ctx.complexity?.spaceComplexity || 'unknown'}.`,
    getLocation: () => null,
  },
  {
    category: ContradictionCategory.EDGE_CASE_MISMATCH,
    claimTypes: ['EDGE_CASE'],
    check: (claim, verification) =>
      verification.status === 'CONTRADICTED' &&
      claim.normalizedMeaning.toLowerCase().includes('edge'),
    makeExplanation: (claim) =>
      `Student claims edge case handling "${claim.normalizedMeaning}" but code lacks corresponding checks.`,
    getLocation: () => null,
  },
  {
    category: ContradictionCategory.CORRECTNESS_REASONING_MISMATCH,
    claimTypes: ['CORRECTNESS'],
    check: (claim, verification) =>
      verification.status === 'CONTRADICTED' &&
      claim.normalizedMeaning.toLowerCase().includes('correct'),
    makeExplanation: (claim) =>
      `Student's correctness reasoning "${claim.normalizedMeaning}" contradicts execution evidence.`,
    getLocation: () => null,
  },
  {
    category: ContradictionCategory.IMPLEMENTATION_DECISION_MISMATCH,
    claimTypes: ['IMPLEMENTATION_DECISION'],
    check: (claim, verification) =>
      verification.status === 'CONTRADICTED',
    makeExplanation: (claim) =>
      `Student's implementation decision "${claim.normalizedMeaning}" not reflected in code.`,
    getLocation: () => null,
  },
  {
    category: ContradictionCategory.INVARIANT_MISMATCH,
    claimTypes: ['INVARIANT'],
    check: (claim, verification) =>
      verification.status === 'CONTRADICTED' &&
      claim.normalizedMeaning.toLowerCase().includes('invariant'),
    makeExplanation: (claim) =>
      `Student claims invariant "${claim.normalizedMeaning}" but no supporting assertions found.`,
    getLocation: () => null,
  },
  {
    category: ContradictionCategory.BEHAVIOR_MISMATCH,
    claimTypes: ['BEHAVIOR'],
    check: (claim, verification) =>
      verification.status === 'CONTRADICTED' &&
      claim.normalizedMeaning.toLowerCase().includes('behav'),
    makeExplanation: (claim) =>
      `Student claims behavior "${claim.normalizedMeaning}" but observed behavior differs.`,
    getLocation: () => null,
  },
  {
    category: ContradictionCategory.PROBLEM_UNDERSTANDING_MISMATCH,
    claimTypes: ['PROBLEM_UNDERSTANDING'],
    check: (claim, verification) =>
      verification.status === 'CONTRADICTED' ||
      (verification.status === 'PARTIALLY_SUPPORTED' && verification.confidence < 0.4),
    makeExplanation: (claim) =>
      `Student's problem understanding "${claim.normalizedMeaning}" misaligned with actual requirements.`,
    getLocation: () => null,
  },
];

export function detectContradictions(
  claims: Claim[],
  verifications: ClaimVerification[],
  ctx: { sourceCode: string; astFacts: any; complexity: any }
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  for (const verification of verifications) {
    const claim = claims.find((c) => c.claimId === verification.claimId);
    if (!claim) continue;

    for (const rule of CONTRADICTION_RULES) {
      if (!rule.claimTypes.includes(claim.claimType)) continue;
      if (!rule.check(claim, verification, ctx)) continue;

      contradictions.push({
        category: rule.category,
        claimId: claim.claimId,
        severity: claim.importance === 'CORE' ? 'HIGH' : claim.importance === 'IMPORTANT' ? 'MEDIUM' : 'LOW',
        studentClaim: claim.normalizedMeaning,
        actualEvidence: verification.explanation,
        explanation: rule.makeExplanation(claim, ctx),
        sourceLocation: rule.getLocation(claim, ctx),
      });
    }
  }

  return contradictions;
}