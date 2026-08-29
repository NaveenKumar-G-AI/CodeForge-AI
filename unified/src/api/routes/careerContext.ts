/**
 * CodeForge AI — Career Context API Routes (Part 1)
 */

import { Router, Response } from 'express';
import { RepositoryRegistry } from '../../repositories/index.js';
import { AuthenticatedRequest, requireStudentOrAbove } from '../middleware/auth.js';
import type { UUID, StudentCareerContext } from '../../domain/types.js';
import { iso8601 } from '../../domain/types.js';

export function createCareerContextRoutes(repos: RepositoryRegistry): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireStudentOrAbove());

  // GET /api/v1/career-context
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const context = await repos.studentCareerContext.findByStudent(studentId);

    if (!context) {
      return res.json({
        data: { hasSelection: false, context: null },
      });
    }

    // Enrich with role slugs
    const primaryRole = await repos.role.findById(context.primaryRoleId);
    const secondaryRole = context.secondaryRoleId
      ? await repos.role.findById(context.secondaryRoleId)
      : null;

    res.json({
      data: {
        hasSelection: true,
        context: {
          ...context,
          primaryRoleSlug: primaryRole?.slug || '',
          secondaryRoleSlug: secondaryRole?.slug || null,
        },
      },
    });
  });

  // POST /api/v1/career-context (select role)
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const { primaryRoleSlug, secondaryRoleSlug } = req.body;

    if (!primaryRoleSlug) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'primaryRoleSlug is required' },
      });
    }

    const primaryRole = await repos.role.findBySlug(primaryRoleSlug);
    if (!primaryRole) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Primary role not found' },
      });
    }

    let secondaryRoleId: UUID | null = null;
    let secondaryRoleVersion: number | null = null;

    if (secondaryRoleSlug) {
      const secondaryRole = await repos.role.findBySlug(secondaryRoleSlug);
      if (!secondaryRole) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Secondary role not found' },
        });
      }
      secondaryRoleId = secondaryRole.id;
      const secVersion = await repos.roleVersion.findCurrent(secondaryRole.id);
      secondaryRoleVersion = secVersion?.version || 1;
    }

    const primaryVersion = await repos.roleVersion.findCurrent(primaryRole.id);

    const context: StudentCareerContext = {
      studentId,
      primaryRoleId: primaryRole.id,
      primaryRoleVersion: primaryVersion?.version || 1,
      secondaryRoleId,
      secondaryRoleVersion,
      source: 'SELF_SELECTED',
      selectedAt: iso8601(new Date().toISOString()),
      updatedAt: iso8601(new Date().toISOString()),
    };

    // Record in history
    await repos.studentRoleHistory.create({
      id: crypto.randomUUID() as UUID,
      studentId,
      roleId: primaryRole.id,
      roleVersion: primaryVersion?.version || 1,
      slot: 'PRIMARY',
      source: 'SELF_SELECTED',
      startedAt: iso8601(new Date().toISOString()),
      endedAt: null,
    });

    if (secondaryRoleId) {
      await repos.studentRoleHistory.create({
        id: crypto.randomUUID() as UUID,
        studentId,
        roleId: secondaryRoleId,
        roleVersion: secondaryRoleVersion!,
        slot: 'SECONDARY',
        source: 'SELF_SELECTED',
        startedAt: iso8601(new Date().toISOString()),
        endedAt: null,
      });
    }

    const saved = await repos.studentCareerContext.upsert(context);

    res.status(201).json({
      data: {
        hasSelection: true,
        context: {
          ...saved,
          primaryRoleSlug: primaryRole.slug,
          secondaryRoleSlug: secondaryRoleSlug || null,
        },
      },
    });
  });

  // GET /api/v1/career-context/history
  router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const history = await repos.studentRoleHistory.findByStudent(studentId);

    // Enrich with role details
    const enriched = await Promise.all(history.map(async (entry) => {
      const role = await repos.role.findById(entry.roleId);
      return {
        ...entry,
        roleSlug: role?.slug,
        roleName: role?.slug, // Role interface only has slug, not name
      };
    }));

    res.json({ data: enriched });
  });

  // POST /api/v1/career-context/change-target
  router.post('/change-target', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const { primaryRoleSlug, secondaryRoleSlug, reason } = req.body;

    // End current roles in history
    const currentContext = await repos.studentCareerContext.findByStudent(studentId);
    if (currentContext) {
      const history = await repos.studentRoleHistory.findByStudent(studentId);
      const activePrimary = history.find(h => h.roleId === currentContext.primaryRoleId && h.slot === 'PRIMARY' && !h.endedAt);
      if (activePrimary) {
        await repos.studentRoleHistory.endRole(studentId, currentContext.primaryRoleId, 'PRIMARY');
      }
      if (currentContext.secondaryRoleId) {
        const activeSecondary = history.find(h => h.roleId === currentContext.secondaryRoleId && h.slot === 'SECONDARY' && !h.endedAt);
        if (activeSecondary) {
          await repos.studentRoleHistory.endRole(studentId, currentContext.secondaryRoleId, 'SECONDARY');
        }
      }
    }

    // Create new context (reuse the POST / logic)
    if (!primaryRoleSlug) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'primaryRoleSlug is required' },
      });
    }

    const primaryRole = await repos.role.findBySlug(primaryRoleSlug);
    if (!primaryRole) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Primary role not found' },
      });
    }

    let secondaryRoleId: UUID | null = null;
    let secondaryRoleVersion: number | null = null;

    if (secondaryRoleSlug) {
      const secondaryRole = await repos.role.findBySlug(secondaryRoleSlug);
      if (!secondaryRole) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Secondary role not found' },
        });
      }
      secondaryRoleId = secondaryRole.id;
      const secVersion = await repos.roleVersion.findCurrent(secondaryRole.id);
      secondaryRoleVersion = secVersion?.version || 1;
    }

    const primaryVersion = await repos.roleVersion.findCurrent(primaryRole.id);

    const context: StudentCareerContext = {
      studentId,
      primaryRoleId: primaryRole.id,
      primaryRoleVersion: primaryVersion?.version || 1,
      secondaryRoleId,
      secondaryRoleVersion,
      source: 'SELF_SELECTED',
      selectedAt: iso8601(new Date().toISOString()),
      updatedAt: iso8601(new Date().toISOString()),
    };

    const saved = await repos.studentCareerContext.upsert(context);

    res.json({
      data: {
        hasSelection: true,
        context: {
          ...saved,
          primaryRoleSlug: primaryRole.slug,
          secondaryRoleSlug: secondaryRoleSlug || null,
        },
      },
    });
  });

  return router;
}

export default createCareerContextRoutes;