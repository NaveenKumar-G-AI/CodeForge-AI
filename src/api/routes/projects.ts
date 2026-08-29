/**
 * CodeForge AI — Engineering Simulator API Routes (Part 10)
 */

import { Router, Response } from 'express';
import { RepositoryRegistry } from '../../repositories/index.js';
import { AuthenticatedRequest, requireStudentOrAbove, rateLimiters } from '../middleware/auth.js';
import { iso8601, uuid } from '../../domain/types.js';
import type { UUID, Project, ProjectSubmission, ProjectEvaluation } from '../../domain/types.js';

export function createProjectRoutes(repos: RepositoryRegistry): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireStudentOrAbove());

  // GET /api/v1/projects
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const { type, difficulty, limit = '20', offset = '0' } = req.query;

    let projects = await repos.project.findAll({ limit: Number(limit), offset: Number(offset) });

    if (type) {
      projects = projects.filter(p => p.type === type);
    }

    if (difficulty) {
      projects = projects.filter(p => p.difficulty === difficulty);
    }

    res.json({ data: projects });
  });

  // GET /api/v1/projects/:id
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const project = await repos.project.findById(req.params.id as UUID);

    if (!project) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    // Get public test cases
    const testCases = await repos.projectTestCase.findPublicByProject(project.id);

    res.json({
      data: {
        ...project,
        publicTests: testCases.map(t => ({ ...t, expectedOutput: undefined })),
      },
    });
  });

  // POST /api/v1/projects/:id/submit
  router.post('/:id/submit', rateLimiters.projects, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const projectId = req.params.id as UUID;
      const { files, testResultsClaimed = [] } = req.body;

      if (!files || typeof files !== 'object') {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'files object is required' },
        });
      }

      const project = await repos.project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }

      const submission: ProjectSubmission = {
        id: uuid(crypto.randomUUID()),
        projectId,
        studentId,
        files,
        testResultsClaimed,
        submittedAt: iso8601(new Date().toISOString()),
      };

      await repos.projectSubmission.create(submission);

      res.status(201).json({ data: submission });
    } catch (error) {
      console.error('Error submitting project:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to submit project' } });
    }
  });

  // GET /api/v1/projects/:id/submissions
  router.get('/:id/submissions', async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.studentId!;
    const projectId = req.params.id as UUID;

    const submissions = await repos.projectSubmission.findByStudent(studentId);
    const projectSubmissions = submissions.filter(s => s.projectId === projectId);

    res.json({ data: projectSubmissions });
  });

  // POST /api/v1/projects/:id/revision
  router.post('/:id/revision', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const studentId = req.studentId!;
      const { submissionId, newFiles, changesSummary } = req.body;

      if (!submissionId || !newFiles || !changesSummary) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'submissionId, newFiles, and changesSummary are required' },
        });
      }

      const submission = await repos.projectSubmission.findById(submissionId as UUID);
      if (!submission || submission.studentId !== studentId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Submission not found' } });
      }

      const revision = {
        id: uuid(crypto.randomUUID()),
        submissionId: uuid(submissionId),
        studentId,
        previousFiles: submission.files,
        newFiles,
        changesSummary,
        createdAt: iso8601(new Date().toISOString()),
      };

      await repos.projectRevision.create(revision);

      res.status(201).json({ data: revision });
    } catch (error) {
      console.error('Error creating revision:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create revision' } });
    }
  });

  // GET /api/v1/projects/:id/evidence
  router.get('/:id/evidence', async (req: AuthenticatedRequest, res: Response) => {
    // Would return evidence from project evaluations
    res.json({ data: [] });
  });

  return router;
}

export default createProjectRoutes;
