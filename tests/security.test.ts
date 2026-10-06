import request from 'supertest';
import express, { type Request, type Response } from 'express';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/db/prisma.js';
import { createRateLimiter } from '../src/server/middleware/rate-limiter.js';
import { validateConfig, TEST_JWT_SECRET } from '../src/config/env.js';
import { createCorsMiddleware } from '../src/server/middleware/cors.js';
import { errorHandler } from '../src/server/middleware/errorHandler.js';

function createValidExperimentPayload(publicSlug: string, trialId = '11111111-2222-4333-8444-555555555555') {
  return {
    title: 'Security Hardening Study',
    description: 'Verifies Phase 9 security hardening',
    publicSlug,
    trials: [
      {
        id: trialId,
        orderIndex: 1,
        label: 'Trial 1',
        instructions: null,
        fixation: null,
        stimulus: {
          id: '22222222-3333-4444-8555-666666666666',
          type: 'text',
          content: 'TARGET',
        },
        timingConfig: {
          preStimulusDelayMs: 0,
          stimulusDurationMs: 500,
          responseTimeoutMs: 1000,
          allowEarlyResponse: false,
          waitForResponse: false,
        },
        expectedResponse: {
          type: 'keypress',
          allowedKeys: ['Space'],
          correctResponse: 'Space',
          evaluationMode: 'exact_match',
        },
        nextTrialId: null,
        branching: null,
      },
    ],
  };
}

describe('Phase 9 — Integration Hardening & Security Test Suite', () => {
  const app = createApp();

  beforeEach(async () => {
    await prisma.sessionResponse.deleteMany();
    await prisma.session.deleteMany();
    await prisma.experimentVersion.deleteMany();
    await prisma.experiment.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.researcher.deleteMany();
  });

  afterAll(async () => {
    await prisma.sessionResponse.deleteMany();
    await prisma.session.deleteMany();
    await prisma.experimentVersion.deleteMany();
    await prisma.experiment.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.researcher.deleteMany();
    await prisma.$disconnect();
  });

  describe('1. Security Headers', () => {
    it('should set essential security headers (nosniff, frame-options, referrer-policy, csp)', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
    });

    it('should not break participant execution endpoints with security headers', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'sec.headers@manova.labs', password: 'Password123!' });
      const token = regRes.body.token;

      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set('Authorization', `Bearer ${token}`)
        .send(createValidExperimentPayload('headers-study'));
      expect(expRes.status).toBe(201);

      const pubRes = await request(app)
        .post(`/api/v1/experiments/${expRes.body.id}/publish`)
        .set('Authorization', `Bearer ${token}`);
      expect(pubRes.status).toBe(200);

      const sessionRes = await request(app)
        .post('/api/v1/participant/experiments/headers-study/sessions')
        .send({});

      expect(sessionRes.status).toBe(201);
      expect(sessionRes.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('2. Rate Limiting', () => {
    it('should enforce rate limits and return 429 RATE_LIMIT_EXCEEDED when threshold is exceeded', async () => {
      const testApp = express();
      testApp.use(express.json());

      const testLimiter = createRateLimiter({
        windowMs: 10000,
        max: 2,
        skip: () => false,
      });

      testApp.post('/test-rate-limit', testLimiter, (_req: Request, res: Response) => {
        res.status(200).json({ status: 'ok' });
      });

      const res1 = await request(testApp).post('/test-rate-limit').send({});
      expect(res1.status).toBe(200);

      const res2 = await request(testApp).post('/test-rate-limit').send({});
      expect(res2.status).toBe(200);

      const res3 = await request(testApp).post('/test-rate-limit').send({});
      expect(res3.status).toBe(429);
      expect(res3.body.error).toBeDefined();
      expect(res3.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res3.body.error.message).toContain('Too many requests');
    });
  });

  describe('3. CORS Behavior', () => {
    it('should allow permitted origin in production configuration', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalCors = process.env.CORS_ORIGIN;
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGIN = 'https://app.manovalabs.com,https://study.manovalabs.com';

      const prodCorsApp = express();
      prodCorsApp.use(createCorsMiddleware());
      prodCorsApp.get('/test-cors', (_req: Request, res: Response) => {
        res.status(200).json({ ok: true });
      });
      prodCorsApp.use(errorHandler);

      const resAllowed = await request(prodCorsApp)
        .get('/test-cors')
        .set('Origin', 'https://app.manovalabs.com');

      expect(resAllowed.status).toBe(200);
      expect(resAllowed.headers['access-control-allow-origin']).toBe('https://app.manovalabs.com');

      process.env.NODE_ENV = originalEnv;
      process.env.CORS_ORIGIN = originalCors;
    });

    it('should block disallowed origin in production configuration', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalCors = process.env.CORS_ORIGIN;
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGIN = 'https://app.manovalabs.com';

      const prodCorsApp = express();
      prodCorsApp.use(createCorsMiddleware());
      prodCorsApp.get('/test-cors', (_req: Request, res: Response) => {
        res.status(200).json({ ok: true });
      });
      prodCorsApp.use(errorHandler);

      const resBlocked = await request(prodCorsApp)
        .get('/test-cors')
        .set('Origin', 'https://malicious-site.com');

      expect(resBlocked.status).toBe(403);
      expect(resBlocked.body.error.code).toBe('FORBIDDEN');

      process.env.NODE_ENV = originalEnv;
      process.env.CORS_ORIGIN = originalCors;
    });
  });

  describe('4. Environment & Configuration Validation', () => {
    it('should reject missing JWT_SECRET in production mode', () => {
      expect(() => {
        validateConfig({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://localhost:5432/manova_labs',
        });
      }).toThrow(/SECURITY ERROR: JWT_SECRET is required in production/);
    });

    it('should reject short JWT secret (< 32 chars) in production mode', () => {
      expect(() => {
        validateConfig({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://localhost:5432/manova_labs',
          JWT_SECRET: 'short-secret-under-32-chars',
        });
      }).toThrow(/must be at least 32 characters long/);
    });

    it('should accept valid configuration in production mode', () => {
      const cfg = validateConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/prod_db',
        JWT_SECRET: 'a-very-long-production-grade-cryptographic-secret-256bits',
        CORS_ORIGIN: 'https://app.manova.labs',
      });
      expect(cfg.NODE_ENV).toBe('production');
      expect(cfg.JWT_SECRET).toBe('a-very-long-production-grade-cryptographic-secret-256bits');
    });

    it('should generate a random ephemeral secret (>= 32 chars) in development mode when none provided', () => {
      const cfg = validateConfig({
        NODE_ENV: 'development',
      });
      expect(cfg.NODE_ENV).toBe('development');
      expect(typeof cfg.JWT_SECRET).toBe('string');
      expect(cfg.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    });

    it('should use fixed test secret in test mode', () => {
      const cfg = validateConfig({
        NODE_ENV: 'test',
      });
      expect(cfg.NODE_ENV).toBe('test');
      expect(cfg.JWT_SECRET).toBe(TEST_JWT_SECRET);
    });
  });

  describe('5. Audit Logging for Important Researcher Actions', () => {
    it('should create audit logs for registration, successful login, and failed login', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'audit.test@manova.labs', password: 'Password123!', name: 'Audit User' });
      expect(regRes.status).toBe(201);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'audit.test@manova.labs', password: 'Password123!' });
      expect(loginRes.status).toBe(200);

      const failRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'audit.test@manova.labs', password: 'WrongPassword!' });
      expect(failRes.status).toBe(401);

      const logs = await prisma.auditLog.findMany({
        where: { metadata: { path: ['email'], equals: 'audit.test@manova.labs' } },
        orderBy: { createdAt: 'asc' },
      });

      expect(logs.length).toBe(3);
      expect(logs[0]!.eventType).toBe('RESEARCHER_REGISTERED');
      expect(logs[1]!.eventType).toBe('LOGIN_SUCCESS');
      expect(logs[2]!.eventType).toBe('LOGIN_FAILED');

      for (const log of logs) {
        const meta = log.metadata as any;
        expect(meta?.password).toBeUndefined();
        expect(meta?.passwordHash).toBeUndefined();
        expect(meta?.token).toBeUndefined();
      }
    });

    it('should create audit logs for experiment creation, update, publish, and delete', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'audit.exp@manova.labs', password: 'Password123!' });
      const token = regRes.body.token;
      const researcherId = regRes.body.researcher.id;

      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set('Authorization', `Bearer ${token}`)
        .send(createValidExperimentPayload('audit-exp-slug'));
      expect(expRes.status).toBe(201);
      const expId = expRes.body.id;

      const updateRes = await request(app)
        .put(`/api/v1/experiments/${expId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Audit Experiment Renamed' });
      expect(updateRes.status).toBe(200);

      const pubRes = await request(app)
        .post(`/api/v1/experiments/${expId}/publish`)
        .set('Authorization', `Bearer ${token}`);
      expect(pubRes.status).toBe(200);

      const delRes = await request(app)
        .delete(`/api/v1/experiments/${expId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(delRes.status).toBe(204);

      const expLogs = await prisma.auditLog.findMany({
        where: { researcherId, resourceId: expId },
        orderBy: { createdAt: 'asc' },
      });

      expect(expLogs.length).toBe(4);
      expect(expLogs[0]!.eventType).toBe('EXPERIMENT_CREATED');
      expect(expLogs[1]!.eventType).toBe('EXPERIMENT_UPDATED');
      expect(expLogs[2]!.eventType).toBe('EXPERIMENT_PUBLISHED');
      expect(expLogs[3]!.eventType).toBe('EXPERIMENT_DELETED');
    });
  });

  describe('6. Error Handling & Stack Trace Hiding', () => {
    it('should never expose stack traces or internal secrets in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const errorApp = express();
      errorApp.get('/throw-error', (_req: Request, _res: Response) => {
        throw new Error('Database password failed: super_secret_pw_123 in /var/db/secret');
      });
      errorApp.use(errorHandler);

      const res = await request(errorApp).get('/throw-error');
      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(res.body.error.message).toBe('An unexpected internal server error occurred.');
      expect(res.body.error.message).not.toContain('super_secret_pw_123');
      expect(res.body.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('7. Security Regression: 401 & 403 Enforcement', () => {
    it('should strictly return 401 for unauthenticated requests and 403 for cross-researcher operations', async () => {
      const unauthRes = await request(app).get('/api/v1/experiments');
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe('UNAUTHORIZED');

      const r1 = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'r1.sec@manova.labs', password: 'Password123!' });
      const exp = await request(app)
        .post('/api/v1/experiments')
        .set('Authorization', `Bearer ${r1.body.token}`)
        .send(createValidExperimentPayload('r1-secret-slug'));
      expect(exp.status).toBe(201);

      const r2 = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'r2.sec@manova.labs', password: 'Password123!' });

      const crossGet = await request(app)
        .get(`/api/v1/experiments/${exp.body.id}`)
        .set('Authorization', `Bearer ${r2.body.token}`);
      expect(crossGet.status).toBe(404);
      expect(crossGet.body.error.code).toBe('EXPERIMENT_NOT_FOUND');

      const crossResults = await request(app)
        .get(`/api/v1/experiments/${exp.body.id}/results`)
        .set('Authorization', `Bearer ${r2.body.token}`);
      expect(crossResults.status).toBe(403);
      expect(crossResults.body.error.code).toBe('FORBIDDEN');
    });

    it('should preserve participant anonymity with zero authentication tokens', async () => {
      const r = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'participant.anon@manova.labs', password: 'Password123!' });
      const trialId = '88881111-2222-4333-8444-555555555555';
      const exp = await request(app)
        .post('/api/v1/experiments')
        .set('Authorization', `Bearer ${r.body.token}`)
        .send(createValidExperimentPayload('anon-study', trialId));
      expect(exp.status).toBe(201);

      const pubRes = await request(app)
        .post(`/api/v1/experiments/${exp.body.id}/publish`)
        .set('Authorization', `Bearer ${r.body.token}`);
      expect(pubRes.status).toBe(200);

      const sessionRes = await request(app)
        .post('/api/v1/participant/experiments/anon-study/sessions')
        .send({});
      expect(sessionRes.status).toBe(201);
      expect(sessionRes.body.sessionId).toBeDefined();
      expect(sessionRes.body.ownerResearcherId).toBeUndefined();
      expect(sessionRes.body.researcher).toBeUndefined();

      const respRes = await request(app)
        .post(`/api/v1/participant/sessions/${sessionRes.body.sessionId}/trials/${trialId}/response`)
        .send({ submittedResponse: 'Space', reactionTimeMs: 250 });
      expect(respRes.status).toBe(200);
      expect(respRes.body.isCompleted).toBe(true);
    });
  });
});
