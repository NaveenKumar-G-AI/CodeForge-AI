// Reasoning Verification Engine — Main exports
export {
  verifyAlgorithmClaim,
  verifyDataStructureClaim,
  verifyImplementationDecisionClaim,
  verifyComplexityClaim,
  verifySpaceComplexityClaim,
  verifyEdgeCaseClaim,
  verifyControlFlowClaim,
  verifyInvariantClaim,
  verifyProblemUnderstandingClaim,
  verifyUnhandledClaimType,
  type VerifierContext,
} from './verifiers.js';

export { detectContradictions } from './contradictionDetector.js';