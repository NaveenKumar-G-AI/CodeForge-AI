// Complexity Analysis Engine — deterministic AST-based complexity estimation
import { ComplexityClass, ComplexityReportPart17, ComplexityConstraints, ComplexityEvidence } from '../../domain/types.js';

// Complexity class ordering for comparison
const COMPLEXITY_ORDER: ComplexityClass[] = [
  'O(1)',
  'O(log n)',
  'O(n)',
  'O(n log n)',
  'O(n^2)',
  'O(n^3)',
  'O(2^n)',
  'O(n!)',
  'UNKNOWN',
];

export function compareComplexity(a: ComplexityClass, b: ComplexityClass): number {
  const idxA = COMPLEXITY_ORDER.indexOf(a);
  const idxB = COMPLEXITY_ORDER.indexOf(b);
  if (idxA === -1 || idxB === -1) return 0;
  return idxA - idxB;
}

export function extractComplexityEvidence(sourceCode: string, language: string): ComplexityEvidence {
  // Deterministic AST-based extraction
  // This is a simplified version - real implementation would use tree-sitter or similar
  const loopDepths: number[] = [];
  let currentDepth = 0;
  const nestedCalls: Array<{ function: string; depth: number }> = [];
  let recursionDepth = 0;
  let dominantOperation = '';

  // For Python
  if (language === 'python') {
    const lines = sourceCode.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Track indentation for loop nesting
      const indent = line.length - line.trimStart().length;
      const expectedDepth = indent / 4; // Python uses 4 spaces

      if (line.startsWith('for ') || line.startsWith('while ')) {
        currentDepth = Math.max(currentDepth, expectedDepth + 1);
        loopDepths.push(currentDepth);
      } else if (line && !line.startsWith('#')) {
        // Check for function calls
        const callMatch = line.match(/(\w+)\s*\(/);
        if (callMatch) {
          nestedCalls.push({ function: callMatch[1], depth: currentDepth });
        }
      }

      // Track recursion
      if (line.includes('def ') && i > 0) {
        const funcName = line.match(/def\s+(\w+)/)?.[1];
        if (funcName && sourceCode.includes(funcName + '(')) {
          recursionDepth = Math.max(recursionDepth, 1);
        }
      }
    }

    // Determine dominant operation
    const opCounts = new Map<string, number>();
    for (const call of nestedCalls) {
      opCounts.set(call.function, (opCounts.get(call.function) || 0) + 1);
    }
    if (opCounts.size > 0) {
      dominantOperation = Array.from(opCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
    }
  }

  return {
    loopDepths,
    nestedCalls,
    recursionDepth,
    dominantOperation,
  };
}

export function estimateComplexity(
  evidence: ComplexityEvidence,
  constraints?: ComplexityConstraints
): ComplexityReportPart17 {
  const maxLoopDepth = Math.max(...evidence.loopDepths, 0);

  // Determine time complexity based on loop nesting
  let timeComplexity: ComplexityClass = 'O(1)';
  if (maxLoopDepth >= 3) timeComplexity = 'O(n^3)';
  else if (maxLoopDepth === 2) timeComplexity = 'O(n^2)';
  else if (maxLoopDepth === 1) {
    // Check if nested call inside loop
    const hasNestedCallInLoop = evidence.nestedCalls.some((c) => c.depth > 0);
    timeComplexity = hasNestedCallInLoop ? 'O(n log n)' : 'O(n)';
  }

  // Determine space complexity
  let spaceComplexity: ComplexityClass = 'O(1)';
  if ((evidence.recursionDepth ?? 0) > 0) {
    spaceComplexity = 'O(n)'; // Recursive call stack
  } else if (maxLoopDepth >= 2) {
    spaceComplexity = 'O(n)'; // Nested data structures
  }

  // Check constraint fit
  let constraintFit: 'FITS' | 'MARGINAL' | 'EXCEEDS' | 'UNKNOWN' = 'UNKNOWN';
  if (constraints) {
    // Check against constraints
    const timeRank = COMPLEXITY_ORDER.indexOf(timeComplexity);
    for (const constraint of constraints.constraints) {
      // Simplified constraint checking
      for (const satisfied of constraint.satisfiedBy) {
        if (compareComplexity(timeComplexity, satisfied) <= 0) {
          constraintFit = 'FITS';
        }
      }
    }
    if (constraintFit === 'UNKNOWN') {
      constraintFit = 'EXCEEDS';
    }
  }

  // Confidence based on evidence quality
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' = 'MEDIUM';
  if (evidence.loopDepths.length === 0 && evidence.nestedCalls.length === 0) {
    confidence = 'LOW';
  } else if (evidence.loopDepths.length > 0) {
    confidence = 'HIGH';
  }

  return {
    timeComplexity,
    spaceComplexity,
    dominantCost: evidence.dominantOperation || 'loop iteration',
    constraintFit,
    confidence,
    evidence: `Loop depths: [${evidence.loopDepths.join(', ')}]; Max depth: ${maxLoopDepth}`,
  };
}

export function buildExpressionTree(
  evidence: ComplexityEvidence
): { operator: string; operands: Array<any>; raw: string } | undefined {
  // Build expression tree from evidence
  if (evidence.loopDepths.length === 0) return undefined;

  const maxDepth = Math.max(...evidence.loopDepths);
  let expr: any = { operator: 'O(1)', operands: [], raw: 'O(1)' };

  for (let i = 0; i < maxDepth; i++) {
    const hasNestedCall = evidence.nestedCalls.some((c) => c.depth > i);
    if (hasNestedCall) {
      expr = {
        operator: '*',
        operands: [expr, { operator: 'n', operands: [], raw: 'n' }],
        raw: `(${expr.raw} * n)`,
      };
    } else {
      expr = {
        operator: '*',
        operands: [expr, { operator: 'n', operands: [], raw: 'n' }],
        raw: `(${expr.raw} * n)`,
      };
    }
  }

  return expr;
}
