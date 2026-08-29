/**
 * CodeForge AI — Main Server Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pathToFileURL } from 'url';
import { DatabaseClient, createDatabaseClient } from './db/client.js';
import { RepositoryRegistry, createRepositoryRegistry } from './repositories/index.js';
import { EngineRegistry, createEngineRegistry } from './engine/index.js';
import { createAPIRoutes } from './api/routes/index.js';
import { initializeAIProvider } from './ai/index.js';
import { initializeExecutionProvider } from './execution/index.js';
import { getEffectiveConfig } from './config/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for development
}));

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ============================================================================
// INITIALIZATION
// ============================================================================

let db: DatabaseClient | undefined;
let repos: RepositoryRegistry;
let engines: EngineRegistry;
let initialized = false;

async function initialize(): Promise<void> {
  if (initialized) return;

  console.log('Initializing CodeForge AI...');

  // Load configuration
  const config = getEffectiveConfig();
  console.log('Configuration loaded');

  // Initialize database
  db = createDatabaseClient();
  console.log('Database client created');

  // Check database connection
  const dbHealthy = await db.healthCheck();
  if (!dbHealthy) {
    console.warn('Database not available - running in degraded mode');
  } else {
    console.log('Database connected');
  }

  // Initialize repositories
  repos = createRepositoryRegistry(db);
  console.log('Repositories initialized');

  // Initialize engines
  engines = createEngineRegistry(db, repos);
  console.log('Engines initialized');

  // Initialize AI provider
  initializeAIProvider(config);
  console.log('AI provider initialized');

  // Initialize execution provider
  await initializeExecutionProvider();
  console.log('Execution provider initialized');

  // Setup routes
  const apiRoutes = createAPIRoutes({ db, repos, engines });
  app.use('/api', apiRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
    });
  });

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  initialized = true;
  console.log('CodeForge AI initialized successfully');
}

// ============================================================================
// START SERVER
// ============================================================================

async function start(): Promise<void> {
  await initialize();

  const server = app.listen(PORT, () => {
    console.log(`CodeForge AI server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await db?.close();
      console.log('Server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start if not imported
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().catch(async (error) => {
    console.error('Failed to start CodeForge AI:', error);
    await db?.close().catch(closeError => {
      console.error('Failed to close database client after startup error:', closeError);
    });
    process.exit(1);
  });
}

export { app, initialize, start };
export default app;
