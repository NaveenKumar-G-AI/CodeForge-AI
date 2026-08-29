/**
 * CodeForge AI — Execution Module Exports
 */

export * from './types.js';
export * from './localProcessProvider.js';

// ============================================================================
// EXECUTION SERVICE
// ============================================================================

import { ExecutionProvider, SandboxConfig, ExecutionInput, ExecutionOutcome, getExecutionLimits, LANGUAGE_RUNTIMES } from './types.js';
import type { SupportedLanguage, TestCategory } from '../domain/types.js';
import { uuid } from '../domain/types.js';
import { LocalProcessExecutionProvider } from './localProcessProvider.js';
import { getEffectiveConfig } from '../config/index.js';

let executionProviderInstance: ExecutionProvider | null = null;

/**
 * Initialize execution provider from config
 */
export async function initializeExecutionProvider(config?: SandboxConfig): Promise<ExecutionProvider> {
  const effectiveConfig = getEffectiveConfig();

  const sandboxConfig: SandboxConfig = config || {
    type: 'process',
    timeoutMs: effectiveConfig.execution.wallTimeMs,
    memoryLimitMB: Math.floor(effectiveConfig.execution.memoryKB / 1024),
    cpuLimit: effectiveConfig.execution.cpuTimeSec,
    networkEnabled: false,
    readOnlyRoot: false,
    tmpfsSizeMB: 512,
  };

  if (sandboxConfig.type === 'process') {
    executionProviderInstance = new LocalProcessExecutionProvider(sandboxConfig);
  } else {
    // For other types, use factory
    const { createExecutionProvider } = await import('./types.js');
    executionProviderInstance = await createExecutionProvider(sandboxConfig);
  }

  return executionProviderInstance;
}

/**
 * Get current execution provider
 */
export function getExecutionProvider(): ExecutionProvider {
  if (!executionProviderInstance) {
    throw new Error('Execution provider not initialized. Call initializeExecutionProvider() first.');
  }
  return executionProviderInstance;
}

/**
 * Execute a submission
 */
export async function executeSubmission(input: ExecutionInput): Promise<ExecutionOutcome> {
  const provider = getExecutionProvider();
  return provider.execute(input);
}

/**
 * Create execution input from challenge and submission
 */
export function createExecutionInput(
  submissionId: string,
  challengeId: string,
  language: string,
  code: string,
  testCases: Array<{ id: string; input: unknown; category: string; expectedOutput: unknown; hidden: boolean; points: number }>,
  harnessType: string,
  functionName: string,
  comparisonMode: string
): ExecutionInput {
  const supportedLanguage = language as SupportedLanguage;
  if (!LANGUAGE_RUNTIMES[supportedLanguage]) {
    throw new Error(`Unsupported execution language: ${language}`);
  }
  const limits = getExecutionLimits(supportedLanguage);

  return {
    submissionId: uuid(submissionId),
    challengeId: uuid(challengeId),
    language: supportedLanguage,
    code,
    testCases: testCases.map(tc => ({
      id: uuid(tc.id),
      input: tc.input,
      category: tc.category as TestCategory,
      expectedOutput: tc.expectedOutput,
      points: tc.points,
      hidden: tc.hidden,
    })),
    harness: {
      type: harnessType as any,
      functionName,
    },
    limits,
    comparisonMode: comparisonMode as any,
  };
}

export default {
  initializeExecutionProvider,
  getExecutionProvider,
  executeSubmission,
  createExecutionInput,
};
