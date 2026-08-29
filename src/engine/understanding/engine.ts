// Understanding Check Engine — Core logic
import {
  UnderstandingDimension,
  UnderstandingDimensionProfile,
  Probe,
  ProbeType,
  DifficultyRung,
  EvidenceItem,
  EvidenceResult,
  UnderstandingProfile,
  AssessmentStatus,
  ResultClassification,
  UnderstandingExecutionEvidence,
  StudentSubmission,
  MentalModel,
  PROBE_TYPES,
  UNDERSTANDING_DIMENSIONS,
  PROCEDURAL_WEIGHTED_DIMENSIONS,
  CONCEPTUAL_WEIGHTED_DIMENSIONS,
  DIFFICULTY_LADDER,
  PROBE_TYPE_DIFFICULTY,
  toPublicProbe,
  UnderstandingRecommendation,
  AssessmentReport,
} from '../../domain/types.js';

// Evidence strength thresholds
const EVIDENCE_THRESHOLDS = {
  strong: { minScore: 80, minConfidence: 0.7, minCount: 3 },
  moderate: { minScore: 50, minConfidence: 0.5, minCount: 1 },
  weak: { minScore: 0, minConfidence: 0, minCount: 0 },
};

/**
 * Compute dimension profile from evidence items
 */
export function computeDimensionProfile(
  dimension: UnderstandingDimension,
  evidence: EvidenceItem[]
): UnderstandingDimensionProfile {
  const dimEvidence = evidence.filter((e) => e.dimension === dimension);
  const correctCount = dimEvidence.filter((e) => e.result === 'correct').length;
  const partialCount = dimEvidence.filter((e) => e.result === 'partially_correct').length;
  const totalCount = dimEvidence.length;

  let score = 0;
  let confidence = 0;
  let evidenceStrength: 'weak' | 'moderate' | 'strong' = 'weak';
  let status: UnderstandingDimensionProfile['status'] = 'not_assessed';

  if (totalCount === 0) {
    status = 'not_assessed';
  } else if (correctCount === 0 && partialCount === 0) {
    score = 0;
    confidence = 0.2;
    evidenceStrength = 'weak';
    status = 'gap_identified';
  } else {
    score = Math.round(((correctCount * 1.0 + partialCount * 0.5) / totalCount) * 100);
    confidence = Math.min(0.9, 0.3 + (correctCount / totalCount) * 0.6);

    if (score >= EVIDENCE_THRESHOLDS.strong.minScore && confidence >= EVIDENCE_THRESHOLDS.strong.minConfidence && totalCount >= EVIDENCE_THRESHOLDS.strong.minCount) {
      evidenceStrength = 'strong';
      status = score >= 80 ? 'strong' : 'demonstrated';
    } else if (score >= EVIDENCE_THRESHOLDS.moderate.minScore && confidence >= EVIDENCE_THRESHOLDS.moderate.minConfidence && totalCount >= EVIDENCE_THRESHOLDS.moderate.minCount) {
      evidenceStrength = 'moderate';
      status = 'developing';
    } else {
      evidenceStrength = 'weak';
      status = 'insufficient_evidence';
    }
  }

  const supporting = dimEvidence.filter((e) => e.result === 'correct' || e.result === 'partially_correct').map((e) => e.id);
  const gaps = dimEvidence.filter((e) => e.result === 'incorrect' || e.result === 'ambiguous').map((e) => e.observed_evidence);

  return {
    dimension,
    score,
    confidence,
    evidence_strength: evidenceStrength,
    status,
    supporting_evidence: supporting,
    identified_gaps: gaps,
  };
}

/**
 * Generate probes for a dimension based on student's current state
 */
export function generateProbesForDimension(
  dimension: UnderstandingDimension,
  mentalModel: MentalModel,
  existingEvidence: EvidenceItem[],
  maxProbes: number
): Probe[] {
  const probes: Probe[] = [];
  const dimEvidence = existingEvidence.filter((e) => e.dimension === dimension);

  // Determine which concepts need probing
  const conceptsToProbe = getConceptsForDimension(dimension, mentalModel);

  // Sort probe types by difficulty
  const probeTypes = [...PROBE_TYPES].sort((a, b) => {
    const difficultyOrder = DIFFICULTY_LADDER.indexOf(PROBE_TYPE_DIFFICULTY[a]);
    const difficultyOrderB = DIFFICULTY_LADDER.indexOf(PROBE_TYPE_DIFFICULTY[b]);
    return difficultyOrder - difficultyOrderB;
  });

  for (const concept of conceptsToProbe) {
    for (const probeType of probeTypes) {
      if (probes.length >= maxProbes) break;

      // Skip if already have strong evidence for this concept
      const hasStrongEvidence = dimEvidence.some(
        (e) => e.concept === concept && e.result === 'correct' && e.confidence > 0.7
      );
      if (hasStrongEvidence) continue;

      const probe = createProbe(dimension, concept, probeType, mentalModel);
      probes.push(probe);
    }
  }

  return probes.slice(0, maxProbes);
}

/**
 * Get concepts to probe for a dimension based on mental model
 */
function getConceptsForDimension(dimension: UnderstandingDimension, mentalModel: MentalModel): string[] {
  switch (dimension) {
    case 'problem':
      return ['problem_objective', 'constraints'];
    case 'algorithm':
      return ['algorithm', 'algorithm_steps'];
    case 'data_structure':
      return ['data_structures'];
    case 'state':
      return ['important_variables', 'state_transitions'];
    case 'control_flow':
      return ['control_flow_summary'];
    case 'invariant':
      return ['candidate_invariants'];
    case 'correctness':
      return ['correctness_argument'];
    case 'complexity':
      return ['complexity'];
    case 'space':
      return ['complexity'];
    case 'edge_case':
      return ['relevant_edge_cases'];
    case 'debugging':
      return ['candidate_invariants', 'state_transitions'];
    case 'adaptation':
      return ['tradeoffs', 'assumptions'];
    case 'transfer':
      return ['tradeoffs', 'assumptions'];
    default:
      return [];
  }
}

/**
 * Create a single probe
 */
function createProbe(
  dimension: UnderstandingDimension,
  concept: string,
  probeType: ProbeType,
  mentalModel: MentalModel
): Probe {
  const difficulty = PROBE_TYPE_DIFFICULTY[probeType];
  const id = `probe-${dimension}-${concept}-${probeType}-${Date.now()}`;

  // Build grounding from mental model
  let grounding: Probe['grounding'] = {};
  let question = '';
  let expectedReasoning = '';
  let expectedEvidence = '';
  let purpose = '';
  let evaluationCriteria: string[] = [];

  switch (probeType) {
    case 'explanation':
      question = `Explain the ${concept.replace('_', ' ')} in your own words.`;
      expectedReasoning = `Student should articulate the ${concept} clearly without just repeating code.`;
      expectedEvidence = `Clear explanation showing understanding of ${concept}.`;
      purpose = `Assess whether student can explain the ${concept}.`;
      evaluationCriteria = ['accuracy', 'completeness', 'own words'];
      grounding = { code_excerpt: getCodeForConcept(concept, mentalModel) };
      break;

    case 'causal_why':
      question = `Why does the ${concept} work this way? What would happen if we changed it?`;
      expectedReasoning = `Student identifies causal relationships, not just correlations.`;
      expectedEvidence = `Causal explanation linking mechanism to outcome.`;
      purpose = `Test causal understanding of ${concept}.`;
      evaluationCriteria = ['identifies cause', 'predicts effect of change', 'not just descriptive'];
      grounding = { code_excerpt: getCodeForConcept(concept, mentalModel) };
      break;

    case 'prediction':
      question = `Given input X, what would the ${concept} produce? Trace through step by step.`;
      expectedReasoning = `Student simulates execution mentally, showing state at each step.`;
      expectedEvidence = `Correct prediction with intermediate states shown.`;
      purpose = `Test predictive mental model of ${concept}.`;
      evaluationCriteria = ['correct final answer', 'shows intermediate steps', 'handles edge cases'];
      grounding = { input: 'sample_input', state_snapshot: {} };
      break;

    case 'state_trace':
      question = `How does ${concept} change during execution? Show the state at each step.`;
      expectedReasoning = `Student traces variable/state changes through execution.`;
      expectedEvidence = `Accurate state trace with all key variables.`;
      purpose = `Test state understanding of ${concept}.`;
      evaluationCriteria = ['identifies all state variables', 'correct transitions', 'complete trace'];
      grounding = { state_snapshot: {} };
      break;

    case 'invariant':
      question = `What stays true throughout the ${concept}? What invariant does it maintain?`;
      expectedReasoning = `Student identifies a property that holds before, during, and after.`;
      expectedEvidence = `Valid invariant statement with explanation of why it holds.`;
      purpose = `Test invariant understanding of ${concept}.`;
      evaluationCriteria = ['identifies valid invariant', 'explains why it holds', 'relates to correctness'];
      grounding = { code_excerpt: getCodeForConcept(concept, mentalModel) };
      break;

    case 'edge_case':
      question = `What edge cases could break the ${concept}? How does your code handle them?`;
      expectedReasoning = `Student identifies boundary conditions and explains handling.`;
      expectedEvidence = `Specific edge cases with handling explanation.`;
      purpose = `Test edge case awareness for ${concept}.`;
      evaluationCriteria = ['identifies real edge cases', 'explains handling', 'not just "it works"'];
      grounding = { input: 'edge_case_input' };
      break;

    case 'complexity':
      question = `What is the time/space complexity of the ${concept}? Explain your reasoning.`;
      expectedReasoning = `Student derives complexity from algorithm structure, not memorization.`;
      expectedEvidence = `Correct complexity with derivation (loops, recursion, data structures).`;
      purpose = `Test complexity reasoning for ${concept}.`;
      evaluationCriteria = ['correct complexity class', 'derives from code structure', 'accounts for all factors'];
      grounding = { code_excerpt: getCodeForConcept(concept, mentalModel) };
      break;

    case 'counterfactual':
      question = `What would happen if we removed/changed the ${concept}?`;
      expectedReasoning = `Student predicts behavioral change from modification.`;
      expectedEvidence = `Specific prediction with causal explanation.`;
      purpose = `Test counterfactual reasoning about ${concept}.`;
      evaluationCriteria = ['predicts specific change', 'explains why', 'identifies affected behaviors'];
      grounding = { mutated_code: getMutatedCodeForConcept(concept, mentalModel) };
      break;

    case 'modification':
      question = `How would you modify the ${concept} to handle [new requirement]?`;
      expectedReasoning = `Student adapts solution showing understanding of structure.`;
      expectedEvidence = `Coherent modification preserving core logic.`;
      purpose = `Test adaptation ability for ${concept}.`;
      evaluationCriteria = ['preserves correctness', 'minimal necessary change', 'explains rationale'];
      grounding = { code_excerpt: getCodeForConcept(concept, mentalModel) };
      break;

    case 'debugging':
      question = `This code has a bug in the ${concept}. Can you find and fix it?`;
      expectedReasoning = `Student localizes bug, explains root cause, applies minimal fix.`;
      expectedEvidence = `Correct bug location, root cause explanation, working fix.`;
      purpose = `Test debugging understanding of ${concept}.`;
      evaluationCriteria = ['localizes correctly', 'explains root cause', 'minimal fix', 'verifies fix'];
      grounding = { code_excerpt: getBuggyCodeForConcept(concept, mentalModel) };
      break;

    case 'alternative_approach':
      question = `What's a different way to implement the ${concept}? Compare tradeoffs.`;
      expectedReasoning = `Student identifies alternative and analyzes tradeoffs.`;
      expectedEvidence = `Valid alternative with tradeoff analysis (time/space/readability).`;
      purpose = `Test transfer/adaptation for ${concept}.`;
      evaluationCriteria = ['valid alternative', 'identifies tradeoffs', 'justifies choice'];
      grounding = { code_excerpt: getCodeForConcept(concept, mentalModel) };
      break;

    case 'transfer':
      question = `How would you apply the ${concept} to solve [different but related problem]?`;
      expectedReasoning = `Student maps core concept to new context, identifies what changes.`;
      expectedEvidence = `Correct mapping with adaptation explanation.`;
      purpose = `Test transfer ability for ${concept}.`;
      evaluationCriteria = ['identifies core concept', 'maps to new context', 'explains adaptations'];
      grounding = { input: 'transfer_problem' };
      break;

    default:
      question = `Explain the ${concept}.`;
      expectedReasoning = '';
      expectedEvidence = '';
      purpose = '';
      evaluationCriteria = [];
  }

  return {
    id,
    assessment_id: '', // Will be set by caller
    target_dimension: dimension,
    target_concept: concept,
    probe_type: probeType,
    difficulty,
    purpose,
    question,
    grounding,
    expected_reasoning: expectedReasoning,
    evaluation_criteria: evaluationCriteria,
    expected_evidence: expectedEvidence,
    created_at: new Date().toISOString(),
  };
}

function getCodeForConcept(concept: string, mentalModel: MentalModel): string {
  // Extract relevant code snippet from mental model
  switch (concept) {
    case 'algorithm':
    case 'algorithm_steps':
      return `// Algorithm: ${mentalModel.algorithm}\n// Steps:\n${mentalModel.algorithm_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    case 'data_structures':
      return `// Data structures: ${mentalModel.data_structures.join(', ')}`;
    case 'state_transitions':
      return `// State transitions:\n${mentalModel.state_transitions.join('\n')}`;
    case 'control_flow_summary':
      return `// Control flow:\n${mentalModel.control_flow_summary}`;
    case 'candidate_invariants':
      return `// Invariants:\n${mentalModel.candidate_invariants.join('\n')}`;
    case 'correctness_argument':
      return `// Correctness:\n${mentalModel.correctness_argument}`;
    case 'complexity':
      return `// Complexity: ${mentalModel.complexity.time} time, ${mentalModel.complexity.space} space\n// Justification: ${mentalModel.complexity.justification}`;
    case 'relevant_edge_cases':
      return `// Edge cases:\n${mentalModel.relevant_edge_cases.join('\n')}`;
    case 'tradeoffs':
      return `// Tradeoffs:\n${mentalModel.tradeoffs.join('\n')}`;
    case 'assumptions':
      return `// Assumptions:\n${mentalModel.assumptions.join('\n')}`;
    default:
      return '';
  }
}

function getMutatedCodeForConcept(concept: string, mentalModel: MentalModel): string {
  // Return a slightly buggy version for debugging probes
  const code = getCodeForConcept(concept, mentalModel);
  return code + '\n// [INTENTIONAL BUG FOR DEBUGGING PROBE]';
}

function getBuggyCodeForConcept(concept: string, mentalModel: MentalModel): string {
  return getMutatedCodeForConcept(concept, mentalModel);
}

/**
 * Evaluate student response to a probe
 */
export function evaluateResponse(
  probe: Probe,
  studentResponse: string
): { result: EvidenceResult; confidence: number; observedEvidence: string } {
  // Simplified evaluation - in production would use AI or more sophisticated matching
  const response = studentResponse.toLowerCase().trim();

  if (response.length < 10) {
    return {
      result: 'no_response',
      confidence: 0.1,
      observedEvidence: 'Response too short to evaluate',
    };
  }

  // Check for key expected evidence terms
  const expectedTerms = probe.expected_evidence.toLowerCase().split(' ').filter((t) => t.length > 3);
  const foundTerms = expectedTerms.filter((t) => response.includes(t));
  const matchRatio = expectedTerms.length > 0 ? foundTerms.length / expectedTerms.length : 0;

  let result: EvidenceResult;
  let confidence: number;

  if (matchRatio >= 0.7) {
    result = 'correct';
    confidence = 0.8 + matchRatio * 0.2;
  } else if (matchRatio >= 0.4) {
    result = 'partially_correct';
    confidence = 0.5 + matchRatio * 0.3;
  } else if (matchRatio > 0) {
    result = 'incorrect';
    confidence = 0.3;
  } else {
    result = 'ambiguous';
    confidence = 0.2;
  }

  return {
    result,
    confidence: Math.min(1, confidence),
    observedEvidence: studentResponse.substring(0, 500),
  };
}

/**
 * Build final understanding profile from all evidence
 */
export function buildProfile(
  assessmentId: string,
  studentId: string,
  challengeId: string,
  evidence: EvidenceItem[],
  probesAsked: number,
  maxProbes: number
): UnderstandingProfile {
  const dimensions: Record<UnderstandingDimension, UnderstandingDimensionProfile> = {} as Record<
    UnderstandingDimension,
    UnderstandingDimensionProfile
  >;

  for (const dim of UNDERSTANDING_DIMENSIONS) {
    dimensions[dim] = computeDimensionProfile(dim, evidence);
  }

  // Compute procedural and conceptual scores
  const proceduralDims = PROCEDURAL_WEIGHTED_DIMENSIONS;
  const conceptualDims = CONCEPTUAL_WEIGHTED_DIMENSIONS;

  const proceduralScore = Math.round(
    proceduralDims.reduce((sum, d) => sum + dimensions[d].score, 0) / proceduralDims.length
  );
  const conceptualScore = Math.round(
    conceptualDims.reduce((sum, d) => sum + dimensions[d].score, 0) / conceptualDims.length
  );

  // Overall confidence
  const allConfidences = UNDERSTANDING_DIMENSIONS.map((d) => dimensions[d].confidence);
  const overallConfidence = allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length;

  // Overall evidence strength
  const strengthCounts = UNDERSTANDING_DIMENSIONS.map((d) => dimensions[d].evidence_strength);
  const strongCount = strengthCounts.filter((s) => s === 'strong').length;
  const moderateCount = strengthCounts.filter((s) => s === 'moderate').length;
  let overallEvidenceStrength: 'weak' | 'moderate' | 'strong' = 'weak';
  if (strongCount >= 5) overallEvidenceStrength = 'strong';
  else if (strongCount + moderateCount >= 8) overallEvidenceStrength = 'moderate';

  // Classification
  let classification: ResultClassification;
  if (overallConfidence < 0.3 || overallEvidenceStrength === 'weak') {
    classification = 'INSUFFICIENT_EVIDENCE';
  } else if (proceduralScore >= 80 && conceptualScore >= 80) {
    classification = 'STRONG_UNDERSTANDING';
  } else if (proceduralScore >= 60 && conceptualScore >= 60) {
    classification = 'UNDERSTANDING_DEMONSTRATED';
  } else if (proceduralScore >= 40 || conceptualScore >= 40) {
    classification = 'PARTIAL_UNDERSTANDING';
  } else {
    classification = 'UNDERSTANDING_GAP';
  }

  return {
    assessment_id: assessmentId,
    student_id: studentId,
    challenge_id: challengeId,
    status: 'completed',
    dimensions,
    procedural_score: proceduralScore,
    conceptual_score: conceptualScore,
    overall_confidence: Math.round(overallConfidence * 100) / 100,
    overall_evidence_strength: overallEvidenceStrength,
    classification,
    probes_asked: probesAsked,
    max_probes: maxProbes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Generate recommendations from profile
 */
export function generateRecommendations(profile: UnderstandingProfile): UnderstandingRecommendation[] {
  const recommendations: UnderstandingRecommendation[] = [];

  for (const dim of UNDERSTANDING_DIMENSIONS) {
    const dimProfile = profile.dimensions[dim];
    if (dimProfile.status === 'gap_identified' || dimProfile.status === 'insufficient_evidence') {
      for (const gap of dimProfile.identified_gaps) {
        recommendations.push({
          dimension: dim,
          gap,
          recommendation: getRecommendationForGap(dim, gap),
        });
      }
      if (dimProfile.identified_gaps.length === 0) {
        recommendations.push({
          dimension: dim,
          gap: `Insufficient evidence for ${dim}`,
          recommendation: getGenericRecommendation(dim),
        });
      }
    }
  }

  return recommendations.slice(0, 10); // Top 10
}

function getRecommendationForGap(dimension: UnderstandingDimension, gap: string): string {
  const recs: Record<UnderstandingDimension, string> = {
    problem: 'Re-read the problem statement. Identify inputs, outputs, and constraints explicitly.',
    algorithm: 'Trace through your algorithm step by step. Explain why each step is necessary.',
    data_structure: 'Draw the data structure. Explain why this structure fits the problem.',
    state: 'List all variables that change. Trace their values through a sample execution.',
    control_flow: 'Draw a flowchart. Identify all branches and loops.',
    invariant: 'State what stays true before, during, and after each loop iteration.',
    correctness: 'Prove your algorithm works: base case, inductive step, termination.',
    complexity: 'Count operations in terms of input size. Identify the dominant term.',
    space: 'Track all data structures created. What grows with input size?',
    edge_case: 'Test with: empty input, single element, maximum size, invalid input.',
    debugging: 'Add print statements. Trace actual vs expected at each step.',
    adaptation: 'Change one requirement. What breaks? What minimal changes fix it?',
    transfer: 'Apply this technique to a different problem. What stays the same?',
  };
  return recs[dimension] || 'Review this concept and practice with similar problems.';
}

function getGenericRecommendation(dimension: UnderstandingDimension): string {
  return `Practice more problems focusing on ${dimension.replace('_', ' ')}. Seek explanations, not just solutions.`;
}

/**
 * Generate assessment report
 */
export function generateReport(profile: UnderstandingProfile, evidence: EvidenceItem[]): AssessmentReport {
  const demonstrated: string[] = [];
  const uncertain: string[] = [];

  for (const dim of UNDERSTANDING_DIMENSIONS) {
    const dimProfile = profile.dimensions[dim];
    if (dimProfile.status === 'demonstrated' || dimProfile.status === 'strong') {
      demonstrated.push(dim);
    } else if (dimProfile.status === 'gap_identified' || dimProfile.status === 'insufficient_evidence') {
      uncertain.push(dim);
    }
  }

  return {
    profile,
    summary: { demonstrated, uncertain },
    evidence,
    recommendations: generateRecommendations(profile),
  };
}