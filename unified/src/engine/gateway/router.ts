// AI Gateway — Request Router & Control Plane
import {
  GatewayOperation,
  GatewayProvider,
  ResilienceState,
  GatewayRequest,
  GatewayResponse,
} from '../../domain/types.js';

/**
 * Model configuration per operation
 */
export interface ModelConfig {
  operation: GatewayOperation;
  preferredProvider: GatewayProvider;
  fallbackProviders: GatewayProvider[];
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  costPer1kTokens: number;
}

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    operation: 'hint_ladder.next_hint',
    preferredProvider: 'groq',
    fallbackProviders: ['gemini', 'anthropic'],
    maxTokens: 500,
    temperature: 0.3,
    systemPrompt: 'You are a helpful coding tutor. Provide the next hint in a progressive hint ladder. Be encouraging but don\'t give away the answer.',
    costPer1kTokens: 0.001,
  },
  {
    operation: 'code_coach.explain_error',
    preferredProvider: 'gemini',
    fallbackProviders: ['groq', 'anthropic'],
    maxTokens: 800,
    temperature: 0.2,
    systemPrompt: 'You are an expert code coach. Explain the error clearly, identify the likely cause, and suggest a fix. Be concise and educational.',
    costPer1kTokens: 0.001,
  },
  {
    operation: 'debugging_coach.next_action',
    preferredProvider: 'anthropic',
    fallbackProviders: ['groq', 'gemini'],
    maxTokens: 600,
    temperature: 0.2,
    systemPrompt: 'You are a debugging coach. Given the current state, recommend the single best next action. Focus on systematic debugging: reproduce, hypothesize, test, fix, verify.',
    costPer1kTokens: 0.003,
  },
  {
    operation: 'understanding.probe',
    preferredProvider: 'groq',
    fallbackProviders: ['gemini', 'anthropic'],
    maxTokens: 400,
    temperature: 0.4,
    systemPrompt: 'Generate a probing question to assess student understanding. Questions should test conceptual understanding, not just recall. Target a specific dimension.',
    costPer1kTokens: 0.001,
  },
  {
    operation: 'quality.interpret',
    preferredProvider: 'anthropic',
    fallbackProviders: ['gemini', 'groq'],
    maxTokens: 1000,
    temperature: 0.3,
    systemPrompt: 'Interpret code quality findings in context. Provide actionable insights, prioritize by impact, and relate to role expectations. Be specific.',
    costPer1kTokens: 0.003,
  },
  {
    operation: 'review.findings',
    preferredProvider: 'groq',
    fallbackProviders: ['gemini', 'anthropic'],
    maxTokens: 800,
    temperature: 0.2,
    systemPrompt: 'Summarize code review findings for the student. Highlight critical issues, group related findings, and provide clear fix guidance.',
    costPer1kTokens: 0.001,
  },
  {
    operation: 'growth.insight',
    preferredProvider: 'gemini',
    fallbackProviders: ['groq', 'anthropic'],
    maxTokens: 600,
    temperature: 0.3,
    systemPrompt: 'Generate a growth insight from trajectory data. Identify patterns, celebrate progress, flag risks, and suggest next focus areas.',
    costPer1kTokens: 0.001,
  },
  {
    operation: 'gap.explain',
    preferredProvider: 'anthropic',
    fallbackProviders: ['gemini', 'groq'],
    maxTokens: 800,
    temperature: 0.2,
    systemPrompt: 'Explain a skill gap to the student. Be specific about what\'s missing, why it matters for their target role, and give a concrete learning path.',
    costPer1kTokens: 0.003,
  },
  {
    operation: 'readiness.explain',
    preferredProvider: 'gemini',
    fallbackProviders: ['anthropic', 'groq'],
    maxTokens: 600,
    temperature: 0.3,
    systemPrompt: 'Explain role readiness assessment. Be encouraging but honest about gaps. Provide clear next steps prioritized by impact.',
    costPer1kTokens: 0.001,
  },
];

/**
 * Circuit breaker state per provider
 */
export interface CircuitBreakerState {
  provider: GatewayProvider;
  state: ResilienceState;
  failureCount: number;
  successCount: number;
  lastFailure: number;
  nextAttempt: number;
}

const circuitBreakers = new Map<GatewayProvider, CircuitBreakerState>();

export function getCircuitBreaker(provider: GatewayProvider): CircuitBreakerState {
  if (!circuitBreakers.has(provider)) {
    circuitBreakers.set(provider, {
      provider,
      state: 'HEALTHY',
      failureCount: 0,
      successCount: 0,
      lastFailure: 0,
      nextAttempt: 0,
    });
  }
  return circuitBreakers.get(provider)!;
}

export function recordSuccess(provider: GatewayProvider): void {
  const cb = getCircuitBreaker(provider);
  cb.successCount++;
  cb.failureCount = 0;
  if (cb.state === 'RECOVERY_CHECK') {
    cb.state = 'HEALTHY';
  }
}

export function recordFailure(provider: GatewayProvider): void {
  const cb = getCircuitBreaker(provider);
  cb.failureCount++;
  cb.lastFailure = Date.now();
  cb.successCount = 0;

  if (cb.failureCount >= 5 && cb.state === 'HEALTHY') {
    cb.state = 'DEGRADED';
  }
  if (cb.failureCount >= 10 && cb.state === 'DEGRADED') {
    cb.state = 'OPEN';
    cb.nextAttempt = Date.now() + 60000; // 1 minute cooldown
  }
}

export function canUseProvider(provider: GatewayProvider): boolean {
  const cb = getCircuitBreaker(provider);
  if (cb.state === 'OPEN') {
    if (Date.now() >= cb.nextAttempt) {
      cb.state = 'RECOVERY_CHECK';
      return true;
    }
    return false;
  }
  return true;
}

/**
 * Select best available provider for operation
 */
export function selectProvider(operation: GatewayOperation, preferred?: GatewayProvider): GatewayProvider {
  const config = MODEL_CONFIGS.find((c) => c.operation === operation);
  if (!config) return preferred ?? 'mock';

  const candidates = preferred ? [preferred, ...config.fallbackProviders] : [config.preferredProvider, ...config.fallbackProviders];

  for (const provider of candidates) {
    if (canUseProvider(provider)) {
      return provider;
    }
  }

  // All providers unhealthy — use mock as last resort
  return 'mock';
}

/**
 * Get model config for operation
 */
export function getModelConfig(operation: GatewayOperation, provider: GatewayProvider): ModelConfig | null {
  const config = MODEL_CONFIGS.find((c) => c.operation === operation);
  if (!config) return null;

  return {
    ...config,
    preferredProvider: provider,
    costPer1kTokens: getProviderCost(provider, config.costPer1kTokens),
  };
}

function getProviderCost(provider: GatewayProvider, baseCost: number): number {
  const multipliers: Record<GatewayProvider, number> = {
    groq: 0.1,
    gemini: 0.5,
    anthropic: 1.0,
    mock: 0,
  };
  return baseCost * (multipliers[provider] ?? 1);
}

/**
 * Build gateway request
 */
export function buildGatewayRequest(
  operation: GatewayOperation,
  prompt: string,
  options: {
    systemPrompt?: string;
    maxTokens?: number;
    correlationId: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH';
    preferredProvider?: GatewayProvider;
  }
): GatewayRequest {
  const config = getModelConfig(operation, options.preferredProvider ?? 'mock');
  const provider = config?.preferredProvider ?? options.preferredProvider ?? 'mock';

  return {
    operation,
    provider,
    prompt,
    systemPrompt: options.systemPrompt ?? config?.systemPrompt ?? '',
    maxTokens: options.maxTokens ?? config?.maxTokens ?? 500,
    correlationId: options.correlationId,
    priority: options.priority ?? 'NORMAL',
  };
}

/**
 * Estimate cost for request
 */
export function estimateCost(request: GatewayRequest): number {
  const config = MODEL_CONFIGS.find((c) => c.operation === request.operation);
  if (!config) return 0;
  const tokens = request.maxTokens ?? 500;
  const cost = getProviderCost(request.provider ?? 'mock', config.costPer1kTokens);
  return (tokens / 1000) * cost;
}

/**
 * Check budget
 */
export function checkBudget(
  studentId: string,
  estimatedCost: number,
  dailyBudget: number = 1.0,
  currentSpend: number = 0
): { allowed: boolean; remaining: number } {
  const remaining = dailyBudget - currentSpend;
  return {
    allowed: estimatedCost <= remaining,
    remaining: Math.max(0, remaining),
  };
}

/**
 * Log gateway request
 */
export function logRequest(
  request: GatewayRequest,
  response: GatewayResponse
): void {
  // In production, this would write to database
  console.log(`[GATEWAY] ${request.operation} | ${request.provider} | ${response.latencyMs}ms | $${response.cost.toFixed(6)} | cache=${response.cacheHit}`);
}
