/**
 * CodeForge AI — Local Process Execution Provider
 *
 * Development/testing execution provider that runs code in isolated subprocesses.
 * NOT for production use - use container/firecracker provider instead.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type {
  ExecutionProvider,
  ExecutionInput,
  ExecutionOutcome,
  RawExecutionResult,
  ExecutionError,
  ExecutionLimits,
  SupportedLanguage,
  HarnessType,
  SandboxConfig,
} from './types.js';
import {
  LANGUAGE_RUNTIMES,
  registerExecutionProviderFactory,
} from './types.js';

const execAsync = promisify(exec);

export class LocalProcessExecutionProvider implements ExecutionProvider {
  name = 'local-process';
  private config: SandboxConfig;

  constructor(config: SandboxConfig) {
    this.config = config;
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return ['python', 'javascript', 'typescript', 'java', 'cpp', 'go', 'rust'];
  }

  getSupportedHarnesses(): HarnessType[] {
    return ['function', 'cli'];
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async execute(input: ExecutionInput): Promise<ExecutionOutcome> {
    const runtime = LANGUAGE_RUNTIMES[input.language];
    if (!runtime) {
      return this.createErrorOutcome(`Unsupported language: ${input.language}`);
    }

    if (!runtime.harnessTemplates[input.harness.type]) {
      return this.createErrorOutcome(`Unsupported harness type: ${input.harness.type} for ${input.language}`);
    }

    // Create temp directory for this execution
    const workDir = await mkdtemp(join(tmpdir(), `codeforge-exec-${input.submissionId}-`));

    try {
      // Write student code
      const codeFile = join(workDir, `solution${runtime.fileExtension}`);
      await writeFile(codeFile, input.code);

      // Write test cases (without expected outputs for security)
      const testCasesFile = join(workDir, 'test_cases.json');
      const testInputs = input.testCases.map(tc => ({
        id: tc.id,
        input: tc.input,
        category: tc.category,
      }));
      await writeFile(testCasesFile, JSON.stringify(testInputs));

      // Write harness
      const harnessFile = join(workDir, `harness${runtime.fileExtension}`);
      const harnessTemplate = runtime.harnessTemplates[input.harness.type];
      const harnessCode = this.renderHarness(harnessTemplate, input, runtime);
      await writeFile(harnessFile, harnessCode);

      // Compile if needed
      if (runtime.compileCommand) {
        const compileCmd = runtime.compileCommand.replace('{file}', codeFile);
        const compileResult = await this.runCommand(compileCmd, workDir, this.config);
        if (compileResult.error) {
          return {
            globalError: {
              type: 'COMPILATION',
              message: compileResult.error.message,
              stackTrace: compileResult.error.stackTrace,
            },
            timedOut: false,
            results: [],
            totalRuntimeMs: compileResult.runtimeMs,
            peakMemoryKB: 0,
          };
        }
      }

      // Run harness
      const runCmd = runtime.runCommand.replace('{file}', `harness${runtime.fileExtension}`);
      const runResult = await this.runCommand(runCmd, workDir, this.config);

      if (runResult.error && runResult.error.type === 'TIMEOUT') {
        return {
          globalError: null,
          timedOut: true,
          results: [],
          totalRuntimeMs: this.config.timeoutMs,
          peakMemoryKB: 0,
        };
      }

      if (runResult.error) {
        return this.createErrorOutcome(runResult.error.message, runResult.error);
      }

      // Parse results
      let results: RawExecutionResult[];
      try {
        results = JSON.parse(runResult.stdout.trim());
      } catch (e) {
        return this.createErrorOutcome(`Failed to parse harness output: ${runResult.stdout.substring(0, 500)}`);
      }

      // Validate results
      const validatedResults = this.validateResults(results, input.testCases);

      return {
        globalError: null,
        timedOut: false,
        results: validatedResults,
        totalRuntimeMs: runResult.runtimeMs,
        peakMemoryKB: runResult.memoryKB,
      };
    } finally {
      // Cleanup
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private renderHarness(template: string, input: ExecutionInput, runtime: any): string {
    let harness = template;

    // Replace function name
    if (input.harness.functionName) {
      harness = harness.replace(/{function_name}/g, input.harness.functionName);
    }

    // Replace function signature for C++
    if (input.language === 'cpp' && input.harness.functionName) {
      // This is a simplified version - real implementation would need proper type info
      harness = harness.replace(/{function_signature}/g, `// Function signature would be generated here`);
    }

    return harness;
  }

  private async runCommand(
    command: string,
    cwd: string,
    config: SandboxConfig
  ): Promise<{
    stdout: string;
    stderr: string;
    runtimeMs: number;
    memoryKB: number;
    error: ExecutionError | null;
  }> {
    const start = Date.now();

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: config.timeoutMs,
        maxBuffer: 1024 * 1024, // 1MB
        env: {
          ...process.env,
          ...LANGUAGE_RUNTIMES.python.environmentVariables, // Will be overridden per language
        },
      });

      return {
        stdout: this.truncateOutput(stdout, config),
        stderr: this.truncateOutput(stderr, config),
        runtimeMs: Date.now() - start,
        memoryKB: 0, // Not measured in local process
        error: null,
      };
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
        return {
          stdout: '',
          stderr: 'Execution timed out',
          runtimeMs: config.timeoutMs,
          memoryKB: 0,
          error: { type: 'TIMEOUT', message: 'Execution timed out' },
        };
      }

      return {
        stdout: error.stdout ? this.truncateOutput(error.stdout, config) : '',
        stderr: error.stderr ? this.truncateOutput(error.stderr, config) : error.message,
        runtimeMs: Date.now() - start,
        memoryKB: 0,
        error: {
          type: 'RUNTIME',
          message: error.message || 'Unknown error',
          stackTrace: error.stack,
        },
      };
    }
  }

  private truncateOutput(output: string, config: SandboxConfig): string {
    // This is a simplified version - the actual config doesn't have outputLimitBytes
    // but we'll use a reasonable default
    const limit = 64 * 1024;
    if (output.length > limit) {
      return output.substring(0, limit) + '\n... [truncated]';
    }
    return output;
  }

  private validateResults(
    results: RawExecutionResult[],
    expectedTestCases: any[]
  ): RawExecutionResult[] {
    const expectedById = new Map(expectedTestCases.map(tc => [tc.id, tc]));
    const validated: RawExecutionResult[] = [];

    for (const result of results) {
      const expected = expectedById.get(result.testCaseId);
      if (!expected) {
        // Unknown test case - include but mark as error
        validated.push({
          ...result,
          error: {
            type: 'SYSTEM',
            message: 'Unknown test case ID returned by harness',
          },
        });
        continue;
      }
      validated.push(result);
    }

    // Check for missing test cases
    for (const expected of expectedTestCases) {
      if (!results.some(r => r.testCaseId === expected.id)) {
        validated.push({
          testCaseId: expected.id,
          actualOutput: null,
          error: { type: 'SYSTEM', message: 'Test case not executed by harness' },
          timedOut: false,
          runtimeMs: 0,
          memoryKB: 0,
          stdout: '',
          stderr: '',
        });
      }
    }

    return validated;
  }

  private createErrorOutcome(message: string, error?: ExecutionError): ExecutionOutcome {
    return {
      globalError: error || { type: 'SYSTEM', message },
      timedOut: false,
      results: [],
      totalRuntimeMs: 0,
      peakMemoryKB: 0,
    };
  }
}

// Register factory
registerExecutionProviderFactory('process', async (config: SandboxConfig) => {
  return new LocalProcessExecutionProvider(config);
});

export default LocalProcessExecutionProvider;
