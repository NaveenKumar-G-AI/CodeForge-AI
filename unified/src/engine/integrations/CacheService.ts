/**
 * Cache Service - Redis-backed caching for integrations
 */

export interface CacheOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

export class CacheService {
  private client: any = null;
  private readonly options: CacheOptions;
  private readonly keyPrefix: string;

  constructor(options: CacheOptions) {
    this.options = options;
    this.keyPrefix = options.keyPrefix || 'cf:integrations:';
  }

  async connect(): Promise<void> {
    try {
      // Keep Redis optional so deployments without cache infrastructure still boot.
      const redisPackage = 'ioredis';
      const Redis = (await import(redisPackage)).default;
      this.client = new Redis({
        host: this.options.host,
        port: this.options.port,
        password: this.options.password,
        db: this.options.db || 0,
        lazyConnect: true,
      });

      await this.client.connect();
    } catch (error) {
      console.warn('Redis cache unavailable; integration cache disabled:', error);
      this.client = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;

    const value = await this.client.get(this.getKey(key));
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;

    const serialized = JSON.stringify(value);
    const fullKey = this.getKey(key);

    if (ttlSeconds) {
      await this.client.setex(fullKey, ttlSeconds, serialized);
    } else {
      await this.client.set(fullKey, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(this.getKey(key));
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.client) return;

    const fullPattern = this.getKey(pattern);
    const keys = await this.client.keys(fullPattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    return (await this.client.exists(this.getKey(key))) === 1;
  }

  async ttl(key: string): Promise<number> {
    if (!this.client) return -2;
    return this.client.ttl(this.getKey(key));
  }

  // Health check
  async healthCheck(): Promise<{ status: 'OK' | 'FAIL'; latencyMs: number }> {
    if (!this.client) {
      return { status: 'FAIL', latencyMs: -1 };
    }

    const start = Date.now();
    try {
      await this.client.ping();
      return { status: 'OK', latencyMs: Date.now() - start };
    } catch {
      return { status: 'FAIL', latencyMs: Date.now() - start };
    }
  }
}

// In-memory fallback for development/testing
export class InMemoryCacheService {
  private store = new Map<string, { value: unknown; expiresAt: number | null }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  async healthCheck(): Promise<{ status: 'OK'; latencyMs: number }> {
    return { status: 'OK', latencyMs: 0 };
  }
}
