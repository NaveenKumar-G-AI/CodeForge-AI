/**
 * CodeForge AI — Main API Router
 *
 * Combines all route modules into a single router.
 */

import { Router } from 'express';
import { DatabaseClient } from '../../db/client.js';
import { RepositoryRegistry } from '../../repositories/index.js';
import { EngineRegistry } from '../../engine/index.js';

// Import all route creators
import createHealthRoutes from './health.js';
import createRoleRoutes from './roles.js';
import createCareerContextRoutes from './careerContext.js';
import createPracticeRoutes from './practice.js';
import createRoadmapRoutes from './roadmap.js';
import createIncidentRoutes from './incidents.js';
import createProjectRoutes from './projects.js';
import createSubmissionRoutes from './submissions.js';
import createCoachRoutes from './coach.js';
import createHintRoutes from './hints.js';

// Parts 16-32 routes
import correctnessRoutes from './correctness.js';
import analysisRoutes from './analysis.js';
import understandingRoutes from './understanding.js';
import debuggingRoutes from './debugging.js';
import adaptiveRoutes from './adaptive.js';
import signalRoutes from './signal.js';
import growthRoutes from './growth.js';
import gapRoutes from './gap.js';
import readinessRoutes from './readiness.js';
import gatewayRoutes from './gateway.js';
import reviewRoutes from './review.js';

// Parts 33-40 routes
import integrationsRoutes from './integrations/index.js';
import interviewRoutes from './interview/index.js';
import cohortIntelligenceRoutes from './cohort-intelligence/index.js';

export interface APIRouteConfig {
  db: DatabaseClient;
  repos: RepositoryRegistry;
  engines: EngineRegistry;
}

export function createAPIRoutes(config: APIRouteConfig): Router {
  const router = Router();
  const { repos, engines } = config;

  // Health routes (no auth required)
  router.use('/health', createHealthRoutes(config.db));

  // API v1 routes
  const v1 = Router();

  // Part 1: Role Context & Career Identity
  v1.use('/roles', createRoleRoutes(repos));
  v1.use('/career-context', createCareerContextRoutes(repos));

  // Part 2: Diagnostic (would be added here)
  // v1.use('/diagnostic', createDiagnosticRoutes(repos, engines));

  // Part 3, 5, 9: Practice & Mastery
  v1.use('/practice', createPracticeRoutes(repos, engines.recommendation));

  // Part 6: Roadmap
  v1.use('/roadmap', createRoadmapRoutes(repos));

  // Part 10: Engineering Simulator
  v1.use('/projects', createProjectRoutes(repos));

  // Part 11: Incident Engine
  v1.use('/incidents', createIncidentRoutes(repos));

  // Part 12, 13: Submission System
  v1.use('/submissions', createSubmissionRoutes(repos));

  // Part 14: AI Code Coach
  v1.use('/coach', createCoachRoutes(repos));

  // Part 15: Hint Ladder
  v1.use('/hints', createHintRoutes(repos));

  // Parts 16-32: Advanced Analysis Engines
  v1.use('/correctness', correctnessRoutes);
  v1.use('/analysis', analysisRoutes);
  v1.use('/understanding', understandingRoutes);
  v1.use('/debugging', debuggingRoutes);
  v1.use('/adaptive', adaptiveRoutes);
  v1.use('/signal', signalRoutes);
  v1.use('/growth', growthRoutes);
  v1.use('/gap', gapRoutes);
  v1.use('/readiness', readinessRoutes);
  v1.use('/gateway', gatewayRoutes);
  v1.use('/review', reviewRoutes);

  // Parts 33-40
  v1.use('/integrations', integrationsRoutes);
  v1.use('/interview', interviewRoutes);
  v1.use('/cohort-intelligence', cohortIntelligenceRoutes);

  router.use('/v1', v1);

  // Root API info
  router.get('/', (req, res) => {
    const apiBasePath = '/api';
    const v1BasePath = `${apiBasePath}/v1`;

    res.json({
      name: 'CodeForge AI API',
      version: '1.0.0',
      description: 'Unified API for CodeForge AI platform',
      endpoints: {
        health: `${apiBasePath}/health`,
        v1: v1BasePath,
        roles: `${v1BasePath}/roles`,
        careerContext: `${v1BasePath}/career-context`,
        practice: `${v1BasePath}/practice`,
        roadmap: `${v1BasePath}/roadmap`,
        interview: `${v1BasePath}/interview`,
        projects: `${v1BasePath}/projects`,
        incidents: `${v1BasePath}/incidents`,
        submissions: `${v1BasePath}/submissions`,
        coach: `${v1BasePath}/coach`,
        hints: `${v1BasePath}/hints`,
        // Parts 16-32
        correctness: `${v1BasePath}/correctness`,
        analysis: `${v1BasePath}/analysis`,
        understanding: `${v1BasePath}/understanding`,
        debugging: `${v1BasePath}/debugging`,
        adaptive: `${v1BasePath}/adaptive`,
        signal: `${v1BasePath}/signal`,
        growth: `${v1BasePath}/growth`,
        gap: `${v1BasePath}/gap`,
        readiness: `${v1BasePath}/readiness`,
        gateway: `${v1BasePath}/gateway`,
        review: `${v1BasePath}/review`,
        // Parts 33-40
        integrations: `${v1BasePath}/integrations`,
        cohortIntelligence: `${v1BasePath}/cohort-intelligence`,
      },
    });
  });

  return router;
}

export default createAPIRoutes;
