/**
 * CodeForge AI — Execution Types
 *
 * Unified execution types used across Parts 3, 4, 12, 13.
 */

import type {
  UUID,
  SupportedLanguage,
  TestCategory,
  ExecutionStatus,
  Verdict,
  ComparisonMode,
} from '../domain/types.js';

export type { UUID, SupportedLanguage, TestCategory, ExecutionStatus, Verdict, ComparisonMode } from '../domain/types.js';

// ============================================================================
// EXECUTION LIMITS
// ============================================================================

export interface ExecutionLimits {
  wallTimeMs: number;
  cpuTimeSec: number;
  memoryKB: number;
  heapMB: number;
  outputLimitBytes: number;
}

export const DEFAULT_EXECUTION_LIMITS: ExecutionLimits = {
  wallTimeMs: 5000,
  cpuTimeSec: 4,
  memoryKB: 256 * 1024,
  heapMB: 256,
  outputLimitBytes: 64 * 1024,
};

export const LANGUAGE_EXECUTION_LIMITS: Partial<Record<SupportedLanguage, ExecutionLimits>> = {
  python: { ...DEFAULT_EXECUTION_LIMITS, wallTimeMs: 8000, cpuTimeSec: 6, memoryKB: 512 * 1024 },
  javascript: { ...DEFAULT_EXECUTION_LIMITS, wallTimeMs: 5000, cpuTimeSec: 4, heapMB: 256 },
  typescript: { ...DEFAULT_EXECUTION_LIMITS, wallTimeMs: 8000, cpuTimeSec: 6, heapMB: 384 },
  java: { ...DEFAULT_EXECUTION_LIMITS, wallTimeMs: 10000, cpuTimeSec: 8, memoryKB: 512 * 1024 },
  cpp: { ...DEFAULT_EXECUTION_LIMITS, wallTimeMs: 5000, cpuTimeSec: 4, memoryKB: 256 * 1024 },
  go: { ...DEFAULT_EXECUTION_LIMITS, wallTimeMs: 5000, cpuTimeSec: 4, memoryKB: 256 * 1024 },
  rust: { ...DEFAULT_EXECUTION_LIMITS, wallTimeMs: 10000, cpuTimeSec: 8, memoryKB: 512 * 1024 },
};

export function getExecutionLimits(language: SupportedLanguage, baseLimits: ExecutionLimits = DEFAULT_EXECUTION_LIMITS): ExecutionLimits {
  const langLimits = LANGUAGE_EXECUTION_LIMITS[language] || {};
  return { ...baseLimits, ...langLimits };
}

// ============================================================================
// TEST CASES
// ============================================================================

export interface RunnerTestCase {
  id: UUID;
  input: unknown;
  category: TestCategory;
  expectedOutput?: unknown; // Only used by evaluator, never sent to sandbox
  points: number;
  hidden: boolean;
}

export interface TestCaseInput {
  id: UUID;
  input: unknown;
  category: TestCategory;
}

// ============================================================================
// HARNESS TYPES
// ============================================================================

export type HarnessType = 'function' | 'cli' | 'http' | 'class' | 'sql';

export interface HarnessConfig {
  type: HarnessType;
  functionName?: string;        // for 'function' harness
  className?: string;           // for 'class' harness
  entryPoint?: string;          // for 'cli' harness
  httpPort?: number;            // for 'http' harness
  sqlDialect?: string;          // for 'sql' harness
}

// ============================================================================
// EXECUTION INPUT/OUTPUT
// ============================================================================

export interface ExecutionInput {
  submissionId: UUID;
  challengeId: UUID;
  language: SupportedLanguage;
  code: string;
  testCases: RunnerTestCase[];
  harness: HarnessConfig;
  limits: ExecutionLimits;
  comparisonMode: ComparisonMode;
}

export interface RawExecutionResult {
  testCaseId: UUID;
  actualOutput: unknown;
  error: ExecutionError | null;
  timedOut: boolean;
  runtimeMs: number;
  memoryKB: number;
  stdout: string;
  stderr: string;
}

export interface ExecutionError {
  type: 'COMPILATION' | 'RUNTIME' | 'TIMEOUT' | 'MEMORY' | 'SYSTEM';
  message: string;
  stackTrace?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface ExecutionOutcome {
  globalError: ExecutionError | null;
  timedOut: boolean;
  results: RawExecutionResult[];
  totalRuntimeMs: number;
  peakMemoryKB: number;
}

// ============================================================================
// EVALUATION RESULT
// ============================================================================

export interface EvaluationResult {
  submissionId: UUID;
  challengeId: UUID;
  status: ExecutionStatus;
  verdict: Verdict;
  testResults: TestResult[];
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  runtimeMs: number;
  memoryKB: number;
  compileError: string | null;
  resourceViolations: ResourceViolation[];
}

export interface TestResult {
  testCaseId: UUID;
  category: TestCategory;
  hidden: boolean;
  passed: boolean;
  expectedOutput: unknown;
  actualOutput: unknown;
  error: ExecutionError | null;
  runtimeMs: number;
  memoryKB: number;
  points: number;
  earnedPoints: number;
}

export interface ResourceViolation {
  type: 'TIME' | 'MEMORY' | 'CPU' | 'OUTPUT_SIZE' | 'FILE_DESCRIPTOR';
  limit: number;
  actual: number;
  severity: 'WARNING' | 'VIOLATION';
}

// ============================================================================
// EXECUTION PROVIDER INTERFACE
// ============================================================================

export interface ExecutionProvider {
  name: string;
  execute(input: ExecutionInput): Promise<ExecutionOutcome>;
  isHealthy(): Promise<boolean>;
  getSupportedLanguages(): SupportedLanguage[];
  getSupportedHarnesses(): HarnessType[];
}

// ============================================================================
// EXECUTION CONTEXT (for sandbox isolation)
// ============================================================================

export interface ExecutionContext {
  submissionId: UUID;
  workingDirectory: string;
  environmentVariables: Record<string, string>;
  resourceLimits: ExecutionLimits;
  networkAllowed: boolean;
  filesystemAllowed: boolean;
}

export interface SandboxConfig {
  type: 'process' | 'container' | 'firecracker' | 'judge0';
  image?: string;              // for container/firecracker
  endpoint?: string;           // for judge0
  timeoutMs: number;
  memoryLimitMB: number;
  cpuLimit: number;
  networkEnabled: boolean;
  readOnlyRoot: boolean;
  tmpfsSizeMB: number;
}

// ============================================================================
// LANGUAGE RUNTIME CONFIG
// ============================================================================

export interface LanguageRuntime {
  language: SupportedLanguage;
  version: string;
  compileCommand?: string;      // for compiled languages
  runCommand: string;           // template with {file} placeholder
  fileExtension: string;
  harnessTemplates: Record<HarnessType, string>;
  environmentVariables: Record<string, string>;
}

export const LANGUAGE_RUNTIMES: Record<SupportedLanguage, LanguageRuntime> = {
  python: {
    language: 'python',
    version: '3.11',
    runCommand: 'python3 {file}',
    fileExtension: '.py',
    harnessTemplates: {
      function: `import sys, json, importlib.util, traceback

def load_solution(filepath, function_name):
    spec = importlib.util.spec_from_file_location("solution", filepath)
    module = importlib.util.module_from_spec(spec)
    sys.modules["solution"] = module
    spec.loader.exec_module(module)
    return getattr(module, function_name)

def run_tests():
    with open("test_cases.json") as f:
        test_cases = json.load(f)

    solve = load_solution("solution.py", "{function_name}")

    results = []
    for tc in test_cases:
        try:
            result = solve(*tc["input"])
            results.append({
                "testCaseId": tc["id"],
                "actualOutput": result,
                "error": None,
                "timedOut": False,
                "runtimeMs": 0,
                "memoryKB": 0,
                "stdout": "",
                "stderr": "",
            })
        except Exception as e:
            results.append({
                "testCaseId": tc["id"],
                "actualOutput": None,
                "error": {
                    "type": "RUNTIME",
                    "message": str(e),
                    "stackTrace": traceback.format_exc(),
                },
                "timedOut": False,
                "runtimeMs": 0,
                "memoryKB": 0,
                "stdout": "",
                "stderr": "",
            })

    print(json.dumps(results))

if __name__ == "__main__":
    run_tests()`,
      cli: `import sys, json, subprocess, traceback

def run_tests():
    with open("test_cases.json") as f:
        test_cases = json.load(f)

    results = []
    for tc in test_cases:
        try:
            proc = subprocess.run(
                [sys.executable, "solution.py"],
                input=json.dumps(tc["input"]),
                capture_output=True,
                text=True,
                timeout=5,
            )
            results.append({
                "testCaseId": tc["id"],
                "actualOutput": proc.stdout.strip(),
                "error": None if proc.returncode == 0 else {
                    "type": "RUNTIME",
                    "message": proc.stderr.strip(),
                },
                "timedOut": False,
                "runtimeMs": 0,
                "memoryKB": 0,
                "stdout": proc.stdout,
                "stderr": proc.stderr,
            })
        except subprocess.TimeoutExpired:
            results.append({
                "testCaseId": tc["id"],
                "actualOutput": None,
                "error": { "type": "TIMEOUT", "message": "Execution timed out" },
                "timedOut": True,
                "runtimeMs": 5000,
                "memoryKB": 0,
                "stdout": "",
                "stderr": "Timeout",
            })
        except Exception as e:
            results.append({
                "testCaseId": tc["id"],
                "actualOutput": None,
                "error": { "type": "RUNTIME", "message": str(e), "stackTrace": traceback.format_exc() },
                "timedOut": False,
                "runtimeMs": 0,
                "memoryKB": 0,
                "stdout": "",
                "stderr": "",
            })

    print(json.dumps(results))

if __name__ == "__main__":
    run_tests()`,
      class: '',
      http: '',
      sql: '',
    },
    environmentVariables: { PYTHONUNBUFFERED: '1', PYTHONDONTWRITEBYTECODE: '1' },
  },
  javascript: {
    language: 'javascript',
    version: '20',
    runCommand: 'node {file}',
    fileExtension: '.js',
    harnessTemplates: {
      function: `const fs = require('fs');

async function runTests() {
  const testCases = JSON.parse(fs.readFileSync('test_cases.json', 'utf8'));
  const solution = require('./solution.js');
  const solve = solution.{function_name};

  const results = [];
  for (const tc of testCases) {
    try {
      const start = process.hrtime.bigint();
      const result = await solve(...tc.input);
      const end = process.hrtime.bigint();
      const runtimeMs = Number(end - start) / 1_000_000;

      results.push({
        testCaseId: tc.id,
        actualOutput: result,
        error: null,
        timedOut: false,
        runtimeMs,
        memoryKB: 0,
        stdout: '',
        stderr: '',
      });
    } catch (e) {
      results.push({
        testCaseId: tc.id,
        actualOutput: null,
        error: { type: 'RUNTIME', message: e.message, stackTrace: e.stack },
        timedOut: false,
        runtimeMs: 0,
        memoryKB: 0,
        stdout: '',
        stderr: '',
      });
    }
  }

  console.log(JSON.stringify(results));
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});`,
      cli: '',
      class: '',
      http: '',
      sql: '',
    },
    environmentVariables: { NODE_OPTIONS: '--max-old-space-size=256' },
  },
  typescript: {
    language: 'typescript',
    version: '5.3',
    compileCommand: 'tsc --strict --esModuleInterop --skipLibCheck {file}',
    runCommand: 'node {file}.js',
    fileExtension: '.ts',
    harnessTemplates: {
      function: `const fs = require('fs');

async function runTests() {
  const testCases = JSON.parse(fs.readFileSync('test_cases.json', 'utf8'));
  const solution = require('./solution.js');
  const solve = solution.{function_name};

  const results = [];
  for (const tc of testCases) {
    try {
      const start = process.hrtime.bigint();
      const result = await solve(...tc.input);
      const end = process.hrtime.bigint();
      const runtimeMs = Number(end - start) / 1_000_000;

      results.push({
        testCaseId: tc.id,
        actualOutput: result,
        error: null,
        timedOut: false,
        runtimeMs,
        memoryKB: 0,
        stdout: '',
        stderr: '',
      });
    } catch (e) {
      results.push({
        testCaseId: tc.id,
        actualOutput: null,
        error: { type: 'RUNTIME', message: e.message, stackTrace: e.stack },
        timedOut: false,
        runtimeMs: 0,
        memoryKB: 0,
        stdout: '',
        stderr: '',
      });
    }
  }

  console.log(JSON.stringify(results));
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});`,
      cli: '',
      class: '',
      http: '',
      sql: '',
    },
    environmentVariables: { NODE_OPTIONS: '--max-old-space-size=384' },
  },
  java: {
    language: 'java',
    version: '21',
    compileCommand: 'javac {file}',
    runCommand: 'java -Xmx256m -cp . Solution',
    fileExtension: '.java',
    harnessTemplates: {
      function: `import java.io.*;
import java.lang.reflect.*;
import java.util.*;
import com.google.gson.*;

public class Runner {
    public static void main(String[] args) throws Exception {
        Gson gson = new Gson();
        TestCase[] testCases = gson.fromJson(new FileReader("test_cases.json"), TestCase[].class);

        Class<?> solutionClass = Class.forName("Solution");
        Method solveMethod = solutionClass.getMethod("{function_name}", getParameterTypes(testCases[0].input));
        Object solutionInstance = solutionClass.getDeclaredConstructor().newInstance();

        List<TestResult> results = new ArrayList<>();
        for (TestCase tc : testCases) {
            long start = System.nanoTime();
            try {
                Object result = solveMethod.invoke(solutionInstance, tc.input);
                long end = System.nanoTime();

                results.add(new TestResult(
                    tc.id, result, null, false,
                    (end - start) / 1_000_000, 0, "", ""
                ));
            } catch (InvocationTargetException e) {
                results.add(new TestResult(
                    tc.id, null,
                    new ExecutionError("RUNTIME", e.getCause().getMessage(), e.getCause().toString()),
                    false, 0, 0, "", ""
                ));
            }
        }

        System.out.println(gson.toJson(results));
    }

    static Class<?>[] getParameterTypes(Object input) {
        if (input instanceof Object[]) {
            Object[] arr = (Object[]) input;
            Class<?>[] types = new Class<?>[arr.length];
            for (int i = 0; i < arr.length; i++) {
                types[i] = arr[i] != null ? arr[i].getClass() : Object.class;
            }
            return types;
        }
        return new Class<?>[]{ input != null ? input.getClass() : Object.class };
    }

    static class TestCase {
        public String id;
        public Object[] input;
    }

    static class TestResult {
        public String testCaseId;
        public Object actualOutput;
        public ExecutionError error;
        public boolean timedOut;
        public long runtimeMs;
        public long memoryKB;
        public String stdout;
        public String stderr;

        public TestResult(String testCaseId, Object actualOutput, ExecutionError error, boolean timedOut, long runtimeMs, long memoryKB, String stdout, String stderr) {
            this.testCaseId = testCaseId;
            this.actualOutput = actualOutput;
            this.error = error;
            this.timedOut = timedOut;
            this.runtimeMs = runtimeMs;
            this.memoryKB = memoryKB;
            this.stdout = stdout;
            this.stderr = stderr;
        }
    }

    static class ExecutionError {
        public String type;
        public String message;
        public String stackTrace;

        public ExecutionError(String type, String message, String stackTrace) {
            this.type = type;
            this.message = message;
            this.stackTrace = stackTrace;
        }
    }
}`,
      cli: '',
      class: '',
      http: '',
      sql: '',
    },
    environmentVariables: { JAVA_TOOL_OPTIONS: '-Xmx256m' },
  },
  cpp: {
    language: 'cpp',
    version: '17',
    compileCommand: 'g++ -std=c++17 -O2 -pipe -static -s {file} -o solution',
    runCommand: './solution',
    fileExtension: '.cpp',
    harnessTemplates: {
      function: `#include <bits/stdc++.h>
#include <nlohmann/json.hpp>
using json = nlohmann::json;
using namespace std;

extern "C" {
    // Solution function will be linked here
    // {function_signature}
}

struct TestCase {
    string id;
    json input;
};

struct TestResult {
    string testCaseId;
    json actualOutput;
    json error;
    bool timedOut;
    long runtimeMs;
    long memoryKB;
    string stdout;
    string stderr;
};

int main() {
    ifstream f("test_cases.json");
    json testCasesJson = json::parse(f);
    vector<TestCase> testCases;
    for (auto& tc : testCasesJson) {
        testCases.push_back({tc["id"], tc["input"]});
    }

    json results = json::array();
    for (auto& tc : testCases) {
        auto start = chrono::high_resolution_clock::now();
        try {
            // Call solution function - this needs to be adapted per challenge
            // json result = {function_name}(tc.input);
            json result = json::null();
            auto end = chrono::high_resolution_clock::now();
            auto runtimeMs = chrono::duration_cast<chrono::milliseconds>(end - start).count();

            results.push({
                {"testCaseId", tc.id},
                {"actualOutput", result},
                {"error", nullptr},
                {"timedOut", false},
                {"runtimeMs", runtimeMs},
                {"memoryKB", 0},
                {"stdout", ""},
                {"stderr", ""}
            });
        } catch (exception& e) {
            results.push({
                {"testCaseId", tc.id},
                {"actualOutput", nullptr},
                {"error", {{"type", "RUNTIME"}, {"message", e.what()}}},
                {"timedOut", false},
                {"runtimeMs", 0},
                {"memoryKB", 0},
                {"stdout", ""},
                {"stderr", ""}
            });
        }
    }

    cout << results.dump() << endl;
    return 0;
}`,
      cli: '',
      class: '',
      http: '',
      sql: '',
    },
    environmentVariables: {},
  },
  go: {
    language: 'go',
    version: '1.21',
    compileCommand: 'go build -o solution {file}',
    runCommand: './solution',
    fileExtension: '.go',
    harnessTemplates: {
      function: `package main

import (
    "encoding/json"
    "fmt"
    "os"
    "time"
)

type TestCase struct {
    ID     string          \`json:"id"\`
    Input  json.RawMessage \`json:"input"\`
}

type TestResult struct {
    TestCaseID   string          \`json:"testCaseId"\`
    ActualOutput json.RawMessage \`json:"actualOutput"\`
    Error        *Error          \`json:"error"\`
    TimedOut     bool            \`json:"timedOut"\`
    RuntimeMs    int64           \`json:"runtimeMs"\`
    MemoryKB     int64           \`json:"memoryKB"\`
    Stdout       string          \`json:"stdout"\`
    Stderr       string          \`json:"stderr"\`
}

type Error struct {
    Type       string \`json:"type"\`
    Message    string \`json:"message"\`
    StackTrace string \`json:"stackTrace,omitempty"\`
}

func main() {
    data, _ := os.ReadFile("test_cases.json")
    var testCases []TestCase
    json.Unmarshal(data, &testCases)

    results := make([]TestResult, 0, len(testCases))
    for _, tc := range testCases {
        start := time.Now()
        var input []interface{}
        json.Unmarshal(tc.Input, &input)

        // Call solution function - adapt per challenge
        // result := {function_name}(input...)
        var result interface{} = nil
        elapsed := time.Since(start).Milliseconds()

        results = append(results, TestResult{
            TestCaseID:   tc.ID,
            ActualOutput: json.RawMessage("null"),
            Error:        nil,
            TimedOut:     false,
            RuntimeMs:    elapsed,
            MemoryKB:     0,
            Stdout:       "",
            Stderr:       ""
        })
    }

    output, _ := json.Marshal(results)
    fmt.Println(string(output))
}`,
      cli: '',
      class: '',
      http: '',
      sql: '',
    },
    environmentVariables: {},
  },
  rust: {
    language: 'rust',
    version: '1.75',
    compileCommand: 'rustc -C opt-level=3 {file} -o solution',
    runCommand: './solution',
    fileExtension: '.rs',
    harnessTemplates: {
      function: `use serde_json::{json, Value};
use std::fs;
use std::time::Instant;

#[derive(serde::Deserialize)]
struct TestCase {
    id: String,
    input: Value,
}

#[derive(serde::Serialize)]
struct TestResult {
    testCaseId: String,
    actualOutput: Value,
    error: Option<Error>,
    timedOut: bool,
    runtimeMs: u64,
    memoryKB: u64,
    stdout: String,
    stderr: String,
}

#[derive(serde::Serialize)]
struct Error {
    errorType: String,
    message: String,
    stackTrace: Option<String>,
}

fn main() {
    let data = fs::read_to_string("test_cases.json").unwrap();
    let test_cases: Vec<TestCase> = serde_json::from_str(&data).unwrap();

    let mut results = Vec::new();
    for tc in test_cases {
        let start = Instant::now();
        // Call solution function - adapt per challenge
        // let result = {function_name}(tc.input);
        let result = Value::Null;
        let elapsed = start.elapsed().as_millis() as u64;

        results.push(TestResult {
            testCaseId: tc.id,
            actualOutput: result,
            error: None,
            timedOut: false,
            runtimeMs: elapsed,
            memoryKB: 0,
            stdout: String::new(),
            stderr: String::new(),
        });
    }

    println!("{}", serde_json::to_string(&results).unwrap());
}`,
      cli: '',
      class: '',
      http: '',
      sql: '',
    },
    environmentVariables: {},
  },
};

// ============================================================================
// EXECUTION PROVIDER FACTORY
// ============================================================================

export type ExecutionProviderFactory = (config: SandboxConfig) => Promise<ExecutionProvider>;

export const executionProviderFactories: Record<string, ExecutionProviderFactory> = {};

export function registerExecutionProviderFactory(name: string, factory: ExecutionProviderFactory): void {
  executionProviderFactories[name] = factory;
}

export async function createExecutionProvider(config: SandboxConfig): Promise<ExecutionProvider> {
  const factory = executionProviderFactories[config.type];
  if (!factory) {
    throw new Error(`Unknown execution provider type: ${config.type}`);
  }
  return factory(config);
}

export default {
  DEFAULT_EXECUTION_LIMITS,
  LANGUAGE_EXECUTION_LIMITS,
  getExecutionLimits,
  LANGUAGE_RUNTIMES,
  registerExecutionProviderFactory,
  createExecutionProvider,
};
