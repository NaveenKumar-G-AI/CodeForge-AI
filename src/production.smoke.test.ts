import express from 'express';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { createAPIRoutes } from './api/routes/index.js';
import { createEngineRegistry } from './engine/index.js';
import { computeMastery, filterAlgorithmicEvidence } from './engine/mastery.js';
import { createRepositoryRegistry } from './repositories/index.js';
import { iso8601, uuid, type Evidence } from './domain/types.js';

interface SmokeCohortResponse {
  id: string;
}

interface SmokeInterviewSessionResponse {
  id: string;
}

interface SmokeInterviewQuestionResponse {
  id: string;
  sessionId: string;
}

async function withApiServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express();
  app.use(express.json());

  const db = { healthCheck: async () => true } as any;
  const repos = createRepositoryRegistry(db);
  const engines = createEngineRegistry(db, repos);

  app.use('/api', createAPIRoutes({
    db,
    repos,
    engines,
  }));

  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));

  try {
    const { port } = server.address() as AddressInfo;
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

describe('production smoke checks', () => {
  it('serves liveness checks from the deployment health endpoint', async () => {
    await withApiServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/health/live`);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ status: 'alive' });
    });
  });

  it('serves initialized cohort and interview flows', async () => {
    await withApiServer(async (baseUrl) => {
      const orgId = randomUUID();
      const studentId = randomUUID();
      const candidateId = randomUUID();
      const headers = {
        'content-type': 'application/json',
        'x-org-id': orgId,
      };

      const cohortResponse = await fetch(`${baseUrl}/api/v1/cohort-intelligence/cohorts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          organizationId: orgId,
          name: 'Smoke Cohort',
          kind: 'ACADEMIC',
          dimension: 'BATCH',
        }),
      });
      expect(cohortResponse.status).toBe(201);
      const cohort = await cohortResponse.json() as SmokeCohortResponse;

      const memberResponse = await fetch(`${baseUrl}/api/v1/cohort-intelligence/cohorts/${cohort.id}/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ studentId }),
      });
      expect(memberResponse.status).toBe(201);

      const cohortsResponse = await fetch(`${baseUrl}/api/v1/cohort-intelligence/cohorts`, { headers });
      expect(cohortsResponse.status).toBe(200);
      await expect(cohortsResponse.json()).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: cohort.id })])
      );

      const interviewResponse = await fetch(`${baseUrl}/api/v1/interview`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          candidateId,
          targetRole: 'Backend Engineer',
          mode: 'TECHNICAL_SCREENING',
        }),
      });
      expect(interviewResponse.status).toBe(201);
      const session = await interviewResponse.json() as SmokeInterviewSessionResponse;

      const startResponse = await fetch(`${baseUrl}/api/v1/interview/${session.id}/start`, {
        method: 'POST',
        headers,
      });
      expect(startResponse.status).toBe(200);
      const question = await startResponse.json() as SmokeInterviewQuestionResponse;
      expect(question.sessionId).toBe(session.id);

      const answerResponse = await fetch(`${baseUrl}/api/v1/interview/${session.id}/responses`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          questionId: question.id,
          responseText: 'I would explain the tradeoffs, test edge cases, and keep the solution simple.',
          idempotencyKey: randomUUID(),
        }),
      });
      expect(answerResponse.status).toBe(200);
      await expect(answerResponse.json()).resolves.toEqual(expect.objectContaining({ type: expect.any(String) }));
    });
  });

  it('computes mastery from algorithmic evidence only', () => {
    const now = iso8601(new Date().toISOString());
    const baseEvidence = {
      studentId: uuid('student-1'),
      skillId: uuid('skill-1'),
      attemptId: uuid('attempt-1'),
      challengeId: uuid('challenge-1'),
      isPrimary: true,
      rawScore: 0.9,
      difficultyScore: 5,
      independent: true,
      assistanceUsed: 'NONE' as const,
      mistakeCategory: null,
      contextType: 'STANDARD' as const,
      createdAt: now,
    };
    const evidence: Evidence[] = [
      { ...baseEvidence, id: uuid('evidence-1'), languageIssue: false },
      { ...baseEvidence, id: uuid('evidence-2'), languageIssue: true, rawScore: 0 },
    ];

    expect(filterAlgorithmicEvidence(evidence)).toHaveLength(1);
    expect(computeMastery(evidence).evidenceUsed).toBe(1);
  });
});
