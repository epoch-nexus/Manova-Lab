import request from 'supertest';
import type { Application } from 'express';
import { prisma } from '../../src/db/prisma.js';

export interface TestResearcherContext {
  researcherId: string;
  email: string;
  token: string;
  authHeader: { Authorization: string };
}

/**
 * Creates or registers a test researcher and returns valid JWT credentials.
 */
export async function createTestResearcher(
  app: Application,
  customEmail?: string
): Promise<TestResearcherContext> {
  const email =
    customEmail ??
    `test-researcher-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`;
  const password = 'TestPassword123!';

  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email,
      password,
      name: 'Test Researcher',
    });

  if (res.status === 201) {
    return {
      researcherId: res.body.researcher.id,
      email: res.body.researcher.email,
      token: res.body.token,
      authHeader: { Authorization: `Bearer ${res.body.token}` },
    };
  }

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });

  return {
    researcherId: loginRes.body.researcher.id,
    email: loginRes.body.researcher.email,
    token: loginRes.body.token,
    authHeader: { Authorization: `Bearer ${loginRes.body.token}` },
  };
}

/**
 * Cleans up researchers and associated experiments.
 */
export async function cleanupResearchers(): Promise<void> {
  await prisma.experiment.deleteMany();
  await prisma.researcher.deleteMany();
}
