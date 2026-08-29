/**
 * CodeForge AI — Unified Database Client
 *
 * PostgreSQL/Supabase client with connection pooling, migrations, and RLS support.
 * Supports both production (pg) and development (better-sqlite3 for local testing).
 */

import { Pool, QueryResult, PoolClient, QueryResultRow } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  poolSize?: number;
  connectionTimeoutMs?: number;
  queryTimeoutMs?: number;
}

export class DatabaseClient {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      max: config.poolSize || 20,
      connectionTimeoutMillis: config.connectionTimeoutMs || 5000,
      idleTimeoutMillis: 30000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }

  /**
   * Execute a query with optional parameters
   */
  async query<T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
      }
      return result;
    } catch (error) {
      console.error('Query error:', error);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Execute a query and return single row
   */
  async queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return all rows
   */
  async queryAll<T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a client for manual transaction control
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Set RLS context for the current session
   */
  async setRlsContext(studentId: string, role: string = 'student'): Promise<void> {
    await this.query(
      `SET LOCAL request.jwt.claims.student_id = $1; SET LOCAL request.jwt.claims.role = $2;`,
      [studentId, role]
    );
  }

  /**
   * Clear RLS context
   */
  async clearRlsContext(): Promise<void> {
    await this.query(`RESET request.jwt.claims.student_id; RESET request.jwt.claims.role;`);
  }

  /**
   * Run migrations from the migrations directory
   */
  async runMigrations(migrationsPath: string = join(__dirname, '..', '..', 'db', 'migrations')): Promise<number> {
    const files = readdirSync(migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let applied = 0;
    for (const file of files) {
      const sql = readFileSync(join(migrationsPath, file), 'utf-8');
      try {
        await this.query(sql);
        applied++;
        console.log(`Applied migration: ${file}`);
      } catch (error) {
        console.error(`Failed to apply migration ${file}:`, error);
        throw error;
      }
    }
    return applied;
  }

  /**
   * Check if database is connected
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close the pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get the underlying pool (for advanced use cases)
   */
  getPool(): Pool {
    return this.pool;
  }
}

/**
 * Create database client from environment variables
 */
export function createDatabaseClient(): DatabaseClient {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'codeforge',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    poolSize: Number(process.env.DB_POOL_SIZE) || 20,
    connectionTimeoutMs: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 5000,
    queryTimeoutMs: Number(process.env.DB_QUERY_TIMEOUT_MS) || 30000,
  };

  return new DatabaseClient(config);
}

/**
 * Development-only SQLite client (for local testing without Postgres)
 * This is a simplified interface matching the main client
 */
export interface SqliteClient {
  query<T>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  queryOne<T>(sql: string, params?: any[]): Promise<T | null>;
  queryAll<T>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(callback: (client: SqliteClient) => Promise<T>): Promise<T>;
  runMigrations(migrationsPath: string): Promise<number>;
  close(): Promise<void>;
}

/**
 * Create SQLite client for development
 */
export async function createSqliteClient(dbPath: string = './data/codeforge.db'): Promise<SqliteClient> {
  const { default: Database } = await import('better-sqlite3');
  const { mkdirSync } = await import('fs');
  const { dirname } = await import('path');

  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  const client: SqliteClient = {
    async query<T>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
      const stmt = db.prepare(sql);
      const rows = params ? stmt.all(...params) : stmt.all();
      return { rows: rows as T[], rowCount: rows.length };
    },

    async queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
      const stmt = db.prepare(sql);
      const row = params ? stmt.get(...params) : stmt.get();
      return (row as T) || null;
    },

    async queryAll<T>(sql: string, params?: any[]): Promise<T[]> {
      const stmt = db.prepare(sql);
      const rows = params ? stmt.all(...params) : stmt.all();
      return rows as T[];
    },

    async transaction<T>(callback: (client: SqliteClient) => Promise<T>): Promise<T> {
      db.prepare('BEGIN').run();
      try {
        const result = await callback(client);
        db.prepare('COMMIT').run();
        return result;
      } catch (error) {
        db.prepare('ROLLBACK').run();
        throw error;
      }
    },

    async runMigrations(migrationsPath: string): Promise<number> {
      // For SQLite, we'd need to convert Postgres SQL to SQLite
      // This is a placeholder - in practice use the Postgres client for migrations
      console.warn('SQLite migrations not implemented - use Postgres for migrations');
      return 0;
    },

    async close(): Promise<void> {
      db.close();
    },
  };

  return client;
}

// Global client instance (for convenience)
let globalClient: DatabaseClient | null = null;

export function getGlobalClient(): DatabaseClient {
  if (!globalClient) {
    globalClient = createDatabaseClient();
  }
  return globalClient;
}

export function setGlobalClient(client: DatabaseClient): void {
  globalClient = client;
}

export async function closeGlobalClient(): Promise<void> {
  if (globalClient) {
    await globalClient.close();
    globalClient = null;
  }
}

export default DatabaseClient;
