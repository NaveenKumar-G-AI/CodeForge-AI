/**
 * CodeForge AI — AI Module Exports
 */

export * from './types.js';
export * from './providers.js';

// ============================================================================
// AI SERVICE FACTORY
// ============================================================================

import { UnifiedConfig, getEffectiveConfig } from '../config/index.js';
import { AIProviderConfig } from './types.js';
import { createProviderChain, createFallbackProvider, MockProvider } from './providers.js';
import type { AIProvider } from './types.js';

let aiProviderInstance: AIProvider | null = null;
let aiConfig: AIProviderConfig[] | null = null;

/**
 * Initialize AI provider from unified config
 */
export function initializeAIProvider(config?: UnifiedConfig): AIProvider {
  const effectiveConfig = config || getEffectiveConfig();
  const supportedProviders = new Set<AIProviderConfig['provider']>(['groq', 'gemini', 'anthropic', 'mock']);
  const configuredProviders: AIProviderConfig[] = effectiveConfig.ai.providers.flatMap((p) => {
    const provider = p.provider as AIProviderConfig['provider'];
    return supportedProviders.has(provider)
      ? [{
          provider,
          model: p.model,
          apiKey: 'apiKey' in p && typeof p.apiKey === 'string' ? p.apiKey : undefined,
          timeoutMs: p.timeoutMs,
        }]
      : [];
  });
  aiConfig = configuredProviders.length > 0 ? configuredProviders : [{ provider: 'mock', model: 'mock' }];

  // Create provider chain with fallback to mock
  const providers = aiConfig.map(p => ({
    provider: p.provider,
    model: p.model,
    apiKey: p.apiKey || process.env[`${p.provider.toUpperCase()}_API_KEY`],
    timeoutMs: p.timeoutMs,
  }));

  aiProviderInstance = createProviderChain(providers);
  return aiProviderInstance;
}

/**
 * Get current AI provider instance
 */
export function getAIProvider(): AIProvider {
  if (!aiProviderInstance) {
    return initializeAIProvider();
  }
  return aiProviderInstance;
}

/**
 * Get AI provider for a specific responsibility
 * Some responsibilities may use different providers
 */
export function getAIProviderForResponsibility(responsibility: string): AIProvider {
  const provider = getAIProvider();
  // In the future, we could route different responsibilities to different providers
  return provider;
}

/**
 * Check if AI is available for a responsibility
 */
export function isAIAvailableFor(responsibility: string): boolean {
  const config = getEffectiveConfig();
  if (!config.features[`ai${responsibility.charAt(0).toUpperCase() + responsibility.slice(1)}` as keyof typeof config.features]) {
    return false;
  }
  const provider = getAIProvider();
  return provider.isAvailable();
}

/**
 * Execute AI call with fallback to deterministic behavior
 */
export async function executeWithAIFallback<T>(
  responsibility: string,
  aiCall: (provider: AIProvider) => Promise<T>,
  deterministicFallback: () => T
): Promise<{ result: T; aiUsed: boolean; aiStatus: 'AI_GENERATED' | 'AI_EVALUATION_PENDING' | 'AI_RESPONSE_INVALID' }> {
  if (!isAIAvailableFor(responsibility)) {
    return {
      result: deterministicFallback(),
      aiUsed: false,
      aiStatus: 'AI_EVALUATION_PENDING',
    };
  }

  try {
    const provider = getAIProviderForResponsibility(responsibility);
    const result = await aiCall(provider);
    return {
      result,
      aiUsed: true,
      aiStatus: 'AI_GENERATED',
    };
  } catch (error) {
    console.warn(`AI call failed for ${responsibility}, using deterministic fallback:`, error);
    return {
      result: deterministicFallback(),
      aiUsed: false,
      aiStatus: 'AI_RESPONSE_INVALID',
    };
  }
}

/**
 * Create a mock provider for testing
 */
export function createMockProvider(responses?: Record<string, Record<string, unknown>>): MockProvider {
  const mock = new MockProvider();
  if (responses) {
    for (const [key, response] of Object.entries(responses)) {
      mock.setResponse(key, response);
    }
  }
  return mock;
}

export default {
  initializeAIProvider,
  getAIProvider,
  getAIProviderForResponsibility,
  isAIAvailableFor,
  executeWithAIFallback,
  createMockProvider,
};
