/**
 * Event Delivery Engine - Handles webhook delivery to PrepVista
 */

import {
  IntegrationEvent,
  EventStatus,
  WebhookDelivery,
  EventDeliveryResult,
  Integration,
  IntegrationCredential,
  CredentialType,
  UUID,
  ISO8601,
} from '../../domain/types.js';

export interface EventRepository {
  getIntegrationEvent(id: string): Promise<IntegrationEvent | null>;
  updateEventStatus(id: string, status: EventStatus, error?: string): Promise<IntegrationEvent>;
  getIntegration(integrationId: string): Promise<Integration | null>;
  getCredentials(integrationId: string): Promise<IntegrationCredential[]>;
  recordWebhookDelivery(delivery: Omit<WebhookDelivery, 'id' | 'createdAt'>): Promise<WebhookDelivery>;
}

export interface HttpClient {
  post(url: string, data: any, headers: Record<string, string>, timeoutMs: number): Promise<{ status: number; body: string; headers: Record<string, string> }>;
}

export class EventDeliveryEngine {
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY_MS = 1000;
  private readonly MAX_DELAY_MS = 60000;
  private readonly BACKOFF_MULTIPLIER = 2;

  constructor(
    private readonly repo: EventRepository,
    private readonly httpClient: HttpClient
  ) {}

  async deliverEvent(event: IntegrationEvent): Promise<EventDeliveryResult> {
    const integration = await this.repo.getIntegration(event.integrationId);
    if (!integration) {
      return { success: false, statusCode: null, responseBody: null, error: 'Integration not found', errorCategory: 'CONFIGURATION', durationMs: 0 };
    }

    const webhookCredential = (await this.repo.getCredentials(event.integrationId))
      .find(c => c.type === 'WEBHOOK_SECRET');

    const webhookUrl = integration.config.webhookUrl;
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Event-Type': event.eventType,
        'X-Event-ID': event.id,
        'X-Idempotency-Key': event.idempotencyKey,
      };

      // Add signature if webhook secret exists
      if (webhookCredential) {
        const signature = await this.generateSignature(event.payload, webhookCredential.valueEncrypted);
        headers['X-Signature'] = signature;
      }

      const response = await this.httpClient.post(
        webhookUrl,
        event.payload,
        headers,
        integration.config.timeoutMs || 30000
      );

      const durationMs = Date.now() - startTime;

      // Record delivery
      await this.repo.recordWebhookDelivery({
        integrationId: event.integrationId,
        eventId: event.id,
        url: webhookUrl,
        requestPayload: event.payload,
        requestHeaders: headers,
        responseStatus: response.status,
        responseBody: response.body,
        responseHeaders: response.headers,
        durationMs,
        success: response.status >= 200 && response.status < 300,
        error: response.status >= 200 && response.status < 300 ? null : `HTTP ${response.status}`,
        attemptNumber: event.attempts + 1,
      });

      // Update event status
      if (response.status >= 200 && response.status < 300) {
        await this.repo.updateEventStatus(event.id, 'DELIVERED');
        return { success: true, statusCode: response.status, responseBody: response.body, error: null, errorCategory: null, durationMs };
      } else {
        const errorCategory = this.categorizeError(response.status);
        await this.repo.updateEventStatus(event.id, 'FAILED', `HTTP ${response.status}`);
        return { success: false, statusCode: response.status, responseBody: response.body, error: `HTTP ${response.status}`, errorCategory, durationMs };
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCategory = this.categorizeError(null, errorMessage);

      await this.repo.recordWebhookDelivery({
        integrationId: event.integrationId,
        eventId: event.id,
        url: webhookUrl,
        requestPayload: event.payload,
        requestHeaders: {},
        responseStatus: null,
        responseBody: null,
        responseHeaders: {},
        durationMs,
        success: false,
        error: errorMessage,
        attemptNumber: event.attempts + 1,
      });

      await this.repo.updateEventStatus(event.id, 'FAILED', errorMessage);

      return { success: false, statusCode: null, responseBody: null, error: errorMessage, errorCategory, durationMs };
    }
  }

  async retryDeadLetter(eventId: string): Promise<EventDeliveryResult> {
    const event = await this.repo.getIntegrationEvent(eventId);
    if (!event) {
      return { success: false, statusCode: null, responseBody: null, error: 'Event not found', errorCategory: 'CONFIGURATION', durationMs: 0 };
    }

    if (event.status !== 'DEAD_LETTER') {
      return { success: false, statusCode: null, responseBody: null, error: 'Event is not in dead letter state', errorCategory: 'CONFIGURATION', durationMs: 0 };
    }

    // Reset status to QUEUED for retry
    await this.repo.updateEventStatus(eventId, 'QUEUED');
    return this.deliverEvent({ ...event, status: 'QUEUED', attempts: 0 });
  }

  async processPendingEvents(integrationId: string): Promise<void> {
    // This would be called by the worker to process queued events
    // Implementation would fetch events with status QUEUED or RETRYING
    // and attempt delivery with exponential backoff
  }

  private async generateSignature(payload: Record<string, unknown>, secret: string): Promise<string> {
    // HMAC-SHA256 signature
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  private categorizeError(status: number | null, errorMessage?: string): 'AUTHENTICATION' | 'AUTHORIZATION' | 'VALIDATION' | 'NETWORK' | 'RATE_LIMIT' | 'TIMEOUT' | 'SERVER_ERROR' | 'DATA_MISMATCH' | 'CONFIGURATION' | 'UNKNOWN' {
    if (errorMessage?.includes('timeout') || errorMessage?.includes('ETIMEDOUT')) return 'TIMEOUT';
    if (errorMessage?.includes('ENOTFOUND') || errorMessage?.includes('ECONNREFUSED') || errorMessage?.includes('network')) return 'NETWORK';

    if (status === 401) return 'AUTHENTICATION';
    if (status === 403) return 'AUTHORIZATION';
    if (status === 400) return 'VALIDATION';
    if (status === 422) return 'DATA_MISMATCH';
    if (status === 429) return 'RATE_LIMIT';
    if (status && status >= 500) return 'SERVER_ERROR';

    return 'UNKNOWN';
  }

  calculateNextRetry(attempt: number): number {
    const delay = Math.min(
      this.BASE_DELAY_MS * Math.pow(this.BACKOFF_MULTIPLIER, attempt),
      this.MAX_DELAY_MS
    );
    // Add jitter
    return delay + Math.random() * delay * 0.1;
  }
}
