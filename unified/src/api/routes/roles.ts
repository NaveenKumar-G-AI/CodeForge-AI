/**
 * CodeForge AI — Role Context API Routes (Part 1)
 */

import { Router, Response } from 'express';
import { RepositoryRegistry } from '../../repositories/index.js';
import { AuthenticatedRequest, requireStudentOrAbove } from '../middleware/auth.js';
import type { UUID } from '../../domain/types.js';

export function createRoleRoutes(repos: RepositoryRegistry): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireStudentOrAbove());

  // GET /api/v1/roles/domains
  router.get('/domains', async (req: AuthenticatedRequest, res: Response) => {
    const domains = await repos.careerDomain.findActive();
    res.json({ data: domains });
  });

  // GET /api/v1/roles/families
  router.get('/families', async (req: AuthenticatedRequest, res: Response) => {
    const families = await repos.roleFamily.findActive();
    res.json({ data: families });
  });

  // GET /api/v1/roles/families/:domainSlug
  router.get('/families/:domainSlug', async (req: AuthenticatedRequest, res: Response) => {
    const domain = await repos.careerDomain.findBySlug(req.params.domainSlug);
    if (!domain) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Domain not found' } });
    }
    const families = await repos.roleFamily.findByCareerDomain(domain.id);
    res.json({ data: families });
  });

  // GET /api/v1/roles
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const { domain, family, status, q, limit, offset } = req.query;

    let roles = await repos.role.findActive();

    if (domain) {
      const d = await repos.careerDomain.findBySlug(domain as string);
      if (d) {
        const families = await repos.roleFamily.findByCareerDomain(d.id);
        const familyIds = new Set(families.map(f => f.id));
        roles = roles.filter(r => familyIds.has(r.roleFamilyId));
      }
    }

    if (family) {
      const f = await repos.roleFamily.findBySlug(family as string);
      if (f) {
        roles = roles.filter(r => r.roleFamilyId === f.id);
      }
    }

    if (status) {
      roles = roles.filter(r => r.status === status);
    }

    if (q) {
      const query = (q as string).toLowerCase();
      roles = roles.filter(r =>
        (r.name ?? '').toLowerCase().includes(query) ||
        r.slug.toLowerCase().includes(query)
      );
    }

    const start = Number(offset) || 0;
    const lim = Number(limit) || 50;
    const paginated = roles.slice(start, start + lim);

    // Enrich with family and domain info
    const enriched = await Promise.all(paginated.map(async (role) => {
      const family = await repos.roleFamily.findById(role.roleFamilyId);
      const domain = family ? await repos.careerDomain.findById(family.careerDomainId) : null;
      return {
        ...role,
        family: family ? { slug: family.slug, name: family.name } : null,
        domain: domain ? { slug: domain.slug, name: domain.name } : null,
      };
    }));

    res.json({
      data: enriched,
      total: roles.length,
      page: Math.floor(start / lim) + 1,
      pageSize: lim,
      hasMore: start + lim < roles.length,
    });
  });

  // GET /api/v1/roles/search
  router.get('/search', async (req: AuthenticatedRequest, res: Response) => {
    const { q, limit = '10' } = req.query;
    if (!q) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Query parameter q is required' } });
    }

    const roles = await repos.role.findActive();
    const query = (q as string).toLowerCase();
    const filtered = roles.filter(r =>
      (r.name ?? '').toLowerCase().includes(query) ||
      r.slug.toLowerCase().includes(query) ||
      r.shortDescription?.toLowerCase().includes(query)
    ).slice(0, Number(limit));

    res.json({ data: filtered });
  });

  // GET /api/v1/roles/compare
  router.get('/compare', async (req: AuthenticatedRequest, res: Response) => {
    const { slugs } = req.query;
    if (!slugs) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'slugs parameter required (comma-separated)' } });
    }

    const slugList = (slugs as string).split(',').map(s => s.trim());
    const roles = await Promise.all(slugList.map(slug => repos.role.findWithDetails(slug)));
    const validRoles = roles.filter((r): r is NonNullable<typeof r> => r !== null);

    res.json({ data: validRoles });
  });

  // GET /api/v1/roles/:slug
  router.get('/:slug', async (req: AuthenticatedRequest, res: Response) => {
    const role = await repos.role.findWithDetails(req.params.slug);
    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }
    res.json({ data: role });
  });

  // GET /api/v1/roles/:slug/requirements
  router.get('/:slug/requirements', async (req: AuthenticatedRequest, res: Response) => {
    const role = await repos.role.findBySlug(req.params.slug);
    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    const version = await repos.roleVersion.findCurrent(role.id);
    if (!version) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role version not found' } });
    }

    // Get competencies, skills, technologies for this role version
    // This would query the link tables
    res.json({
      data: {
        role: { slug: role.slug, name: version.name },
        competencies: [],
        skills: [],
        technologies: [],
      },
    });
  });

  return router;
}

export default createRoleRoutes;
