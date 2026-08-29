/**
 * CodeForge AI — Health Check Routes
 */

import { Router, Request, Response } from 'express';
import { DatabaseClient } from '../../db/client.js';

export function createHealthRoutes(db: DatabaseClient): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    const dbHealthy = await db.healthCheck();

    res.json({
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy ? 'ok' : 'failed',
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  router.get('/live', (req: Request, res: Response) => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
  });

  router.get('/ready', async (req: Request, res: Response) => {
    const dbHealthy = await db.healthCheck();

    if (dbHealthy) {
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
    }
  });

  return router;
}

export default createHealthRoutes;
