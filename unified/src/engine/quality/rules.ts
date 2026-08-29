// Code Quality Engine — Deterministic Rules
import { NormalizedNode, walk, findAll } from '../../parsers/ir.js';
import {
  QualityFinding,
  Severity,
  QualityConfidence,
  QualitySourceLocation,
  QualityDimension,
} from '../../domain/types.js';

/** Extract location info from IR node */
function extractLocation(node: NormalizedNode): QualitySourceLocation | null {
  if (!node.loc) return null;
  return {
    startLine: node.loc.startLine,
    endLine: node.loc.endLine,
    startCol: node.loc.startCol,
    endCol: node.loc.endCol,
  };
}

/** Base rule interface */
export interface Rule {
  id: string;
  version: string;
  name: string;
  check(fn: FunctionMetrics, context: RuleContext): QualityFinding[];
}

/** Context available to all rules */
export interface RuleContext {
  sourceCode: string;
  language: 'python' | 'javascript' | 'typescript';
  astRoot: NormalizedNode;
  findings: QualityFinding[];
  allFunctions: FunctionMetrics[];
}

/** Function metrics shared across rules */
export interface FunctionMetrics {
  node: NormalizedNode;
  name: string;
  loc: { startLine: number; endLine: number };
  lineCount: number;
  statementCount: number;
  paramCount: number;
  maxNestingDepth: number;
  cyclomaticComplexity: number;
  calledFunctionNames: string[];
}

const BRANCH_KINDS = new Set(['If', 'For', 'While', 'Catch']);
const NESTING_KINDS = new Set(['If', 'For', 'While', 'Try']);
const STATEMENT_KINDS = new Set([
  'If', 'For', 'While', 'Try', 'With', 'Return', 'Throw', 'Break', 'Continue',
  'Assignment', 'AugAssignment', 'VariableDecl', 'ExpressionStmt',
]);

export function extractFunctions(root: NormalizedNode): FunctionMetrics[] {
  return findAll(root, 'FunctionDecl').map(analyzeFunction);
}

function analyzeFunction(fn: NormalizedNode): FunctionMetrics {
  const params = fn.children.filter((c) => c.kind === 'Param');
  const block = fn.children.find((c) => c.kind === 'Block') || ({ kind: 'Block', children: [], loc: fn.loc } as NormalizedNode);

  let statementCount = 0;
  let maxDepth = 0;
  let cyclomatic = 1;
  const calledNames: string[] = [];

  walk(
    block,
    (node, parents) => {
      if (STATEMENT_KINDS.has(node.kind)) statementCount++;
      if (node.kind === 'Call' && node.name) calledNames.push(node.name);
      if (BRANCH_KINDS.has(node.kind)) cyclomatic++;
      if (node.kind === 'BoolOp') cyclomatic += Math.max(0, node.children.length - 1);
      if (NESTING_KINDS.has(node.kind)) {
        const depth = parents.filter((p) => NESTING_KINDS.has(p.kind)).length + 1;
        maxDepth = Math.max(maxDepth, depth);
      }
    },
    [],
    (node) => node.kind === 'FunctionDecl'
  );

  return {
    node: fn,
    name: (fn.name as string) ?? '<anonymous>',
    loc: { startLine: fn.loc?.startLine ?? 1, endLine: fn.loc?.endLine ?? 1 },
    lineCount: (fn.loc?.endLine ?? 1) - (fn.loc?.startLine ?? 1) + 1,
    statementCount,
    paramCount: params.length,
    maxNestingDepth: maxDepth,
    cyclomaticComplexity: cyclomatic,
    calledFunctionNames: calledNames,
  };
}

/** Rule 1: Long Function */
export const longFunctionRule: Rule = {
  id: 'LONG_FUNCTION',
  version: '1.0.0',
  name: 'Function is too long',
  check(fn: FunctionMetrics, ctx: RuleContext): QualityFinding[] {
    if (fn.lineCount <= 50) return [];

    return [
      {
        findingId: `LONG_FUNCTION-${fn.name}-${fn.loc.startLine}`,
        ruleId: 'LONG_FUNCTION',
        ruleVersion: '1.0.0',
        category: 'STRUCTURAL_QUALITY',
        severity: fn.lineCount > 100 ? Severity.HIGH : Severity.MEDIUM,
        confidence: QualityConfidence.HIGH,
        title: `Function "${fn.name}" is ${fn.lineCount} lines long`,
        description:
          `Function "${fn.name}" spans ${fn.lineCount} lines (threshold: 50). Long functions are harder to understand, test, and maintain.`,
        impact: 'Reduced readability, harder to test, increased bug risk.',
        sourceLocation: extractLocation(fn.node),
        evidence: [`Line count: ${fn.lineCount}`, 'Threshold: 50 lines'],
        suggestedAction: 'Extract helper functions. Group related logic into smaller, single-purpose functions.',
        dimensions: { STRUCTURAL_QUALITY: 0.5, MAINTAINABILITY: 0.3, READABILITY: 0.2 },
        origin: 'DETERMINISTIC',
      },
    ];
  },
};

/** Rule 2: High Cyclomatic Complexity */
export const highComplexityRule: Rule = {
  id: 'HIGH_CYCLOMATIC_COMPLEXITY',
  version: '1.0.0',
  name: 'High cyclomatic complexity',
  check(fn: FunctionMetrics, ctx: RuleContext): QualityFinding[] {
    if (fn.cyclomaticComplexity <= 10) return [];

    return [
      {
        findingId: `HIGH_CYCLOMATIC_COMPLEXITY-${fn.name}-${fn.loc.startLine}`,
        ruleId: 'HIGH_CYCLOMATIC_COMPLEXITY',
        ruleVersion: '1.0.0',
        category: 'STRUCTURAL_QUALITY',
        severity: fn.cyclomaticComplexity > 20 ? Severity.HIGH : Severity.MEDIUM,
        confidence: QualityConfidence.HIGH,
        title: `Function "${fn.name}" has cyclomatic complexity ${fn.cyclomaticComplexity}`,
        description:
          `Cyclomatic complexity of ${fn.cyclomaticComplexity} exceeds threshold of 10. High complexity indicates many decision paths, making testing and reasoning difficult.`,
        impact: 'Exponential test case growth, higher defect density, difficult maintenance.',
        sourceLocation: extractLocation(fn.node),
        evidence: [`Cyclomatic complexity: ${fn.cyclomaticComplexity}`, 'Threshold: 10'],
        suggestedAction: 'Simplify conditional logic. Extract conditions into well-named boolean functions. Use early returns.',
        dimensions: { STRUCTURAL_QUALITY: 0.5, MAINTAINABILITY: 0.3, SIMPLICITY: 0.2 },
        origin: 'DETERMINISTIC',
      },
    ];
  },
};

/** Rule 3: Deep Nesting */
export const deepNestingRule: Rule = {
  id: 'DEEP_NESTING',
  version: '1.0.0',
  name: 'Excessive nesting depth',
  check(fn: FunctionMetrics, ctx: RuleContext): QualityFinding[] {
    if (fn.maxNestingDepth <= 4) return [];

    return [
      {
        findingId: `DEEP_NESTING-${fn.name}-${fn.loc.startLine}`,
        ruleId: 'DEEP_NESTING',
        ruleVersion: '1.0.0',
        category: 'READABILITY',
        severity: fn.maxNestingDepth > 6 ? Severity.HIGH : Severity.MEDIUM,
        confidence: QualityConfidence.HIGH,
        title: `Function "${fn.name}" has nesting depth ${fn.maxNestingDepth}`,
        description:
          `Maximum nesting depth of ${fn.maxNestingDepth} exceeds threshold of 4. Deep nesting makes code hard to follow and increases cognitive load.`,
        impact: 'Reduced readability, difficulty tracking variable scope, error-prone modifications.',
        sourceLocation: extractLocation(fn.node),
        evidence: [`Max nesting depth: ${fn.maxNestingDepth}`, 'Threshold: 4'],
        suggestedAction: 'Use guard clauses/early returns. Extract nested blocks into separate functions. Flatten conditionals.',
        dimensions: { READABILITY: 0.5, MAINTAINABILITY: 0.3, SIMPLICITY: 0.2 },
        origin: 'DETERMINISTIC',
      },
    ];
  },
};

/** Rule 4: Too Many Parameters */
export const tooManyParamsRule: Rule = {
  id: 'TOO_MANY_PARAMETERS',
  version: '1.0.0',
  name: 'Too many function parameters',
  check(fn: FunctionMetrics, ctx: RuleContext): QualityFinding[] {
    if (fn.paramCount <= 5) return [];

    return [
      {
        findingId: `TOO_MANY_PARAMETERS-${fn.name}-${fn.loc.startLine}`,
        ruleId: 'TOO_MANY_PARAMETERS',
        ruleVersion: '1.0.0',
        category: 'ENGINEERING_PRACTICES',
        severity: fn.paramCount > 8 ? Severity.MEDIUM : Severity.LOW,
        confidence: QualityConfidence.HIGH,
        title: `Function "${fn.name}" has ${fn.paramCount} parameters`,
        description:
          `Function takes ${fn.paramCount} parameters (threshold: 5). Many parameters indicate the function may be doing too much or needs a parameter object.`,
        impact: 'Error-prone calls, difficult testing, poor encapsulation.',
        sourceLocation: extractLocation(fn.node),
        evidence: [`Parameter count: ${fn.paramCount}`, 'Threshold: 5'],
        suggestedAction: 'Group related parameters into a config object or data class. Consider builder pattern.',
        dimensions: { ENGINEERING_PRACTICES: 0.5, MAINTAINABILITY: 0.3, READABILITY: 0.2 },
        origin: 'DETERMINISTIC',
      },
    ];
  },
};

/** Rule 5: Magic Numbers */
export const magicNumberRule: Rule = {
  id: 'MAGIC_NUMBER',
  version: '1.0.0',
  name: 'Magic number detected',
  check(fn: FunctionMetrics, ctx: RuleContext): QualityFinding[] {
    const findings: QualityFinding[] = [];
    const lines = ctx.sourceCode.split('\n');

    // Look for numeric literals in function body
    for (let i = fn.loc.startLine - 1; i < fn.loc.endLine && i < lines.length; i++) {
      const line = lines[i];
      // Match numeric literals (but not 0, 1, -1 which are often acceptable)
      const matches = line.match(/\b(-?\d{2,})\b/g);
      if (matches) {
        for (const match of matches) {
          const num = parseInt(match);
          if (num !== 0 && num !== 1 && num !== -1 && num !== 2 && num !== 10 && num !== 100) {
            findings.push({
              findingId: `MAGIC_NUMBER-${fn.name}-${i + 1}-${match}`,
              ruleId: 'MAGIC_NUMBER',
              ruleVersion: '1.0.0',
              category: 'READABILITY',
              severity: Severity.LOW,
              confidence: QualityConfidence.MEDIUM,
              title: `Magic number ${match} in function "${fn.name}"`,
              description: `Numeric literal ${match} used without explanation. Magic numbers reduce readability and maintainability.`,
              impact: 'Unclear intent, harder to modify, risk of inconsistent values.',
              sourceLocation: {
                startLine: i + 1,
                endLine: i + 1,
              },
              evidence: [`Value: ${match}`, `Line: ${line.trim()}`],
              suggestedAction: 'Extract to a named constant with descriptive name.',
              dimensions: { READABILITY: 0.6, MAINTAINABILITY: 0.4 },
              origin: 'DETERMINISTIC',
            });
          }
        }
      }
    }

    return findings;
  },
};

/** Rule 6: Missing Error Handling */
export const missingErrorHandlingRule: Rule = {
  id: 'MISSING_ERROR_HANDLING',
  version: '1.0.0',
  name: 'Missing error handling for fallible operations',
  check(fn: FunctionMetrics, ctx: RuleContext): QualityFinding[] {
    const findings: QualityFinding[] = [];
    const fallibleCalls = ['readFile', 'writeFile', 'fetch', 'query', 'execute', 'connect', 'open', 'parse'];
    const hasTryCatch = ctx.sourceCode
      .split('\n')
      .slice(fn.loc.startLine - 1, fn.loc.endLine)
      .some((l) => l.trim().startsWith('try') || l.trim().startsWith('catch') || l.trim().startsWith('except'));

    for (const callName of fallibleCalls) {
      if (fn.calledFunctionNames.includes(callName) && !hasTryCatch) {
        findings.push({
          findingId: `MISSING_ERROR_HANDLING-${fn.name}-${callName}`,
          ruleId: 'MISSING_ERROR_HANDLING',
          ruleVersion: '1.0.0',
          category: 'ERROR_HANDLING',
          severity: Severity.MEDIUM,
          confidence: QualityConfidence.MEDIUM,
          title: `Call to "${callName}" without error handling in "${fn.name}"`,
          description: `Function calls fallible operation "${callName}" but has no try/catch or error handling.`,
          impact: 'Unhandled exceptions can crash the program or leave it in inconsistent state.',
          sourceLocation: extractLocation(fn.node),
          evidence: [`Call: ${callName}`, 'No try/catch/except found in function'],
          suggestedAction: 'Wrap fallible calls in try/catch (JS/TS) or try/except (Python). Handle or rethrow with context.',
          dimensions: { ERROR_HANDLING: 0.6, ROBUSTNESS: 0.4 },
          origin: 'DETERMINISTIC',
        });
        break; // One finding per function for this rule
      }
    }

    return findings;
  },
};

/** Rule 7: Inconsistent Naming */
export const inconsistentNamingRule: Rule = {
  id: 'INCONSISTENT_NAMING',
  version: '1.0.0',
  name: 'Inconsistent naming convention',
  check(fn: FunctionMetrics, ctx: RuleContext): QualityFinding[] {
    const findings: QualityFinding[] = [];

    // Check function naming (camelCase for JS/TS, snake_case for Python)
    const isPython = ctx.language === 'python';
    const expectedPattern = isPython ? /^[a-z][a-z0-9_]*$/ : /^[a-z][a-zA-Z0-9]*$/;

    if (!expectedPattern.test(fn.name) && !fn.name.startsWith('_')) {
      findings.push({
        findingId: `INCONSISTENT_NAMING-${fn.name}-${fn.loc.startLine}`,
        ruleId: 'INCONSISTENT_NAMING',
        ruleVersion: '1.0.0',
        category: 'NAMING',
        severity: Severity.LOW,
        confidence: QualityConfidence.MEDIUM,
        title: `Function "${fn.name}" doesn't follow ${isPython ? 'snake_case' : 'camelCase'} convention`,
        description: `Function name "${fn.name}" doesn't match expected ${isPython ? 'snake_case' : 'camelCase'} convention for ${ctx.language}.`,
        impact: 'Inconsistent codebase style, harder to read and navigate.',
        sourceLocation: extractLocation(fn.node),
        evidence: [`Function name: ${fn.name}`, `Expected: ${isPython ? 'snake_case' : 'camelCase'}`],
        suggestedAction: `Rename to follow ${isPython ? 'snake_case' : 'camelCase'} convention.`,
        dimensions: { NAMING: 0.7, READABILITY: 0.3 },
        origin: 'DETERMINISTIC',
      });
    }

    return findings;
  },
};

/** Rule 8: Duplicate Code (simplified) */
export const duplicateCodeRule: Rule = {
  id: 'DUPLICATE_CODE',
  version: '1.0.0',
  name: 'Potential duplicate code block',
  check(fn: FunctionMetrics, ctx: RuleContext): QualityFinding[] {
    // Simplified: check for repeated similar lines in function
    const lines = ctx.sourceCode
      .split('\n')
      .slice(fn.loc.startLine - 1, fn.loc.endLine)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));

    const lineCounts = new Map<string, number>();
    for (const line of lines) {
      lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
    }

    const findings: QualityFinding[] = [];
    for (const [line, count] of lineCounts) {
      if (count >= 3 && line.length > 20) {
        findings.push({
          findingId: `DUPLICATE_CODE-${fn.name}-${line.substring(0, 20)}`,
          ruleId: 'DUPLICATE_CODE',
          ruleVersion: '1.0.0',
          category: 'DUPLICATION',
          severity: Severity.MEDIUM,
          confidence: QualityConfidence.LOW,
          title: `Repeated code pattern in "${fn.name}" (${count} occurrences)`,
          description: `The line "${line.substring(0, 60)}..." appears ${count} times in this function.`,
          impact: 'Code duplication increases maintenance burden and bug risk.',
          sourceLocation: extractLocation(fn.node),
          evidence: [`Occurrences: ${count}`, `Pattern: ${line.substring(0, 80)}`],
          suggestedAction: 'Extract repeated logic into a helper function or loop.',
          dimensions: { DUPLICATION: 0.6, MAINTAINABILITY: 0.4 },
          origin: 'DETERMINISTIC',
        });
        break; // One finding per function
      }
    }

    return findings;
  },
};

/** All deterministic rules */
export const DETERMINISTIC_RULES: Rule[] = [
  longFunctionRule,
  highComplexityRule,
  deepNestingRule,
  tooManyParamsRule,
  magicNumberRule,
  missingErrorHandlingRule,
  inconsistentNamingRule,
  duplicateCodeRule,
];

/** Run all deterministic rules on a source file */
export function runDeterministicRules(
  sourceCode: string,
  language: 'python' | 'javascript' | 'typescript',
  astRoot: NormalizedNode
): QualityFinding[] {
  const context: RuleContext = {
    sourceCode,
    language,
    astRoot,
    findings: [],
    allFunctions: extractFunctions(astRoot),
  };

  const findings: QualityFinding[] = [];

  for (const fn of context.allFunctions) {
    for (const rule of DETERMINISTIC_RULES) {
      findings.push(...rule.check(fn, context));
    }
  }

  return findings;
}
