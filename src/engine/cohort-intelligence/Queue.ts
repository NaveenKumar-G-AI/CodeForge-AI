/**
 * Queue - Feature 36
 * Background job queue for aggregation tasks
 * Supports in-memory (dev) and BullMQ/Redis (production)
 */

export interface Queue {
  enqueue(cohortId: string): Promise<void>;
  process(handler: (cohortId: string) => Promise<void>): Promise<void>;
}

/**
 * In-memory queue for development/testing
 */
export class InMemoryQueue implements Queue {
  private queue: string[] = [];
  private processing = false;

  async enqueue(cohortId: string): Promise<void> {
    this.queue.push(cohortId);
    this.drain();
  }

  async process(handler: (cohortId: string) => Promise<void>): Promise<void> {
    this.drain(handler);
  }

  private async drain(handler?: (cohortId: string) => Promise<void>): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const cohortId = this.queue.shift()!;
      if (handler) {
        try {
          await handler(cohortId);
        } catch (error) {
          console.error(`Queue processing failed for ${cohortId}:`, error);
        }
      }
    }

    this.processing = false;
  }
}

/**
 * BullMQ queue for production
 * Requires: npm install bullmq ioredis
 */
export class BullMQQueue implements Queue {
  private queue: any = null;
  private readonly redisUrl: string;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
  }

  async enqueue(cohortId: string): Promise<void> {
    const queue = await this.getQueue();
    await queue.add('aggregate', { cohortId }, { removeOnComplete: true });
  }

  async process(handler: (cohortId: string) => Promise<void>): Promise<void> {
    const bullmqPackage = 'bullmq';
    const { Worker } = await import(bullmqPackage);
    new Worker('cohort-aggregation', async (job: any) => {
      await handler(job.data.cohortId);
    }, { connection: { url: this.redisUrl } });
  }

  private async getQueue(): Promise<any> {
    if (!this.queue) {
      const bullmqPackage = 'bullmq';
      const { Queue: BullQueue } = await import(bullmqPackage);
      this.queue = new BullQueue('cohort-aggregation', { connection: { url: this.redisUrl } });
    }
    return this.queue;
  }
}

/**
 * Create queue based on environment
 */
export function createQueue(): Queue {
  const provider = process.env.QUEUE_PROVIDER || 'memory';

  if (provider === 'bullmq' && process.env.REDIS_URL) {
    return new BullMQQueue(process.env.REDIS_URL);
  }

  return new InMemoryQueue();
}
