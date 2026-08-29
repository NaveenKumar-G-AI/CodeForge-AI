// AI Gateway API Routes
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  buildGatewayRequest,
  estimateCost,
  checkBudget,
  selectProvider,
  getModelConfig,
  recordSuccess,
  recordFailure,
  canUseProvider,
} from '../../engine/gateway/index.js';
import {
  GatewayOperation,
  GatewayProvider,
  GatewayRequest,
  GatewayResponse,
  ResilienceState,
} from '../../domain/types.js';

const router = Router();

/**
 * POST /api/gateway/request
 * Build and execute a gateway request
 */
const requestSchema = z.object({
  operation: z.enum([
    'hint_ladder.next_hint',
    'code_coach.explain_error',
    'debugging_coach.next_action',
    'understanding.probe',
    'quality.interpret',
    'review.findings',
    'growth.insight',
    'gap.explain',
    'readiness.explain',
  ]),
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  correlationId: z.string().uuid(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).optional(),
  preferredProvider: z.enum(['groq', 'gemini', 'anthropic', 'mock']).optional(),
});

router.post('/request', async (req: Request, res: Response) => {
  try {
    const options = requestSchema.parse(req.body);
    const request = buildGatewayRequest(options.operation, options.prompt, options);

    // In a real implementation, this would call the actual provider
    // For now, return a mock response
    const mockResponse: GatewayResponse = {
      requestId: `resp-${Date.now()}`,
      provider: request.provider || 'mock',
      model: `${request.provider || 'mock'}-mock`,
      content: `[MOCK] Response for ${options.operation}: ${options.prompt.substring(0, 100)}...`,
      latencyMs: 100,
      cost: estimateCost(request),
      cacheHit: false,
      resilienceState: 'HEALTHY',
      degraded: false,
    };

    if (mockResponse.latencyMs < 5000) {
      recordSuccess(request.provider || 'mock');
    } else {
      recordFailure(request.provider || 'mock');
    }

    res.json({ request, response: mockResponse });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/gateway/estimate-cost
 * Estimate cost for a request
 */
const costSchema = z.object({
  operation: z.enum([
    'hint_ladder.next_hint',
    'code_coach.explain_error',
    'debugging_coach.next_action',
    'understanding.probe',
    'quality.interpret',
    'review.findings',
    'growth.insight',
    'gap.explain',
    'readiness.explain',
  ]),
  provider: z.enum(['groq', 'gemini', 'anthropic', 'mock']),
  maxTokens: z.number().int().positive().optional(),
});

router.post('/estimate-cost', async (req: Request, res: Response) => {
  try {
    const { operation, provider, maxTokens } = costSchema.parse(req.body);
    const request: GatewayRequest = {
      operation,
      provider,
      prompt: '',
      maxTokens,
      correlationId: 'estimate',
      priority: 'NORMAL',
    };
    const cost = estimateCost(request);
    res.json({ cost });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * POST /api/gateway/check-budget
 * Check if request fits within budget
 */
const budgetSchema = z.object({
  studentId: z.string().uuid(),
  estimatedCost: z.number(),
  dailyBudget: z.number().default(1.0),
  currentSpend: z.number().default(0),
});

router.post('/check-budget', async (req: Request, res: Response) => {
  try {
    const { studentId, estimatedCost, dailyBudget, currentSpend } = budgetSchema.parse(req.body);
    const result = checkBudget(studentId, estimatedCost, dailyBudget, currentSpend);
    res.json({ result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

/**
 * GET /api/gateway/config/:operation
 * Get model configuration for operation
 */
router.get('/config/:operation', async (req: Request, res: Response) => {
  try {
    const operation = req.params.operation as GatewayOperation;
    const provider = req.query.provider as GatewayProvider | undefined;
    const config = getModelConfig(operation, provider || 'mock');
    if (!config) {
      return res.status(404).json({ error: 'Operation not found' });
    }
    res.json({ config });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid operation' });
  }
});

/**
 * GET /api/gateway/providers
 * List available providers and their status
 */
router.get('/providers', async (req: Request, res: Response) => {
  const providers: GatewayProvider[] = ['groq', 'gemini', 'anthropic', 'mock'];
  const status = providers.map((p) => ({
    provider: p,
    available: canUseProvider(p),
    state: getCircuitBreaker(p).state,
  }));
  res.json({ providers: status });
});

/**
 * POST /api/gateway/select-provider
 * Select best provider for operation
 */
const selectSchema = z.object({
  operation: z.enum([
    'hint_ladder.next_hint',
    'code_coach.explain_error',
    'debugging_coach.next_action',
    'understanding.probe',
    'quality.interpret',
    'review.findings',
    'growth.insight',
    'gap.explain',
    'readiness.explain',
  ]),
  preferredProvider: z.enum(['groq', 'gemini', 'anthropic', 'mock']).optional(),
});

router.post('/select-provider', async (req: Request, res: Response) => {
  try {
    const { operation, preferredProvider } = selectSchema.parse(req.body);
    const provider = selectProvider(operation, preferredProvider);
    res.json({ provider });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    throw error;
  }
});

// Import circuit breaker
function getCircuitBreaker(provider: GatewayProvider): { state: ResilienceState } {
  return { state: 'HEALTHY' };
}

export default router;