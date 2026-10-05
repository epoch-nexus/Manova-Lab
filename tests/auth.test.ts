import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/db/prisma.js';
import { createTestResearcher } from './helpers/auth.js';

const app = createApp();

describe('Phase 8 — Researcher Authentication & Authorization', () => {
  beforeEach(async () => {
    await prisma.sessionResponse.deleteMany();
    await prisma.session.deleteMany();
    await prisma.experimentVersion.deleteMany();
    await prisma.expectedResponse.deleteMany();
    await prisma.stimulus.deleteMany();
    await prisma.trial.deleteMany();
    await prisma.experiment.deleteMany();
    await prisma.researcher.deleteMany();
  });

  afterAll(async () => {
    await prisma.sessionResponse.deleteMany();
    await prisma.session.deleteMany();
    await prisma.experimentVersion.deleteMany();
    await prisma.expectedResponse.deleteMany();
    await prisma.stimulus.deleteMany();
    await prisma.trial.deleteMany();
    await prisma.experiment.deleteMany();
    await prisma.researcher.deleteMany();
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. AUTHENTICATION: Registration
  // =========================================================================
  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a researcher with email, password, and name', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'dr.smith@university.edu',
          password: 'SecurePassword123!',
          name: 'Dr. Jane Smith',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
      expect(res.body).toHaveProperty('researcher');
      expect(res.body.researcher.email).toBe('dr.smith@university.edu');
      expect(res.body.researcher.name).toBe('Dr. Jane Smith');
      expect(res.body.researcher).toHaveProperty('id');
      expect(res.body.researcher).toHaveProperty('createdAt');
      expect(res.body.researcher).toHaveProperty('updatedAt');

      // Security: never return password or passwordHash
      expect(res.body.researcher).not.toHaveProperty('password');
      expect(res.body.researcher).not.toHaveProperty('passwordHash');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('should securely hash password with bcrypt in the database', async () => {
      const rawPassword = 'SuperSecretPassword!';
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'hash-check@test.com',
          password: rawPassword,
        });

      expect(res.status).toBe(201);
      const dbResearcher = await prisma.researcher.findUnique({
        where: { id: res.body.researcher.id },
      });

      expect(dbResearcher).not.toBeNull();
      expect(dbResearcher!.passwordHash).not.toBe(rawPassword);
      // bcrypt hashes begin with $2a$ or $2b$
      expect(dbResearcher!.passwordHash).toMatch(/^\$2[ab]\$/);
    });

    it('should reject registration if email is already registered (409 Conflict)', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'Password123!',
        });

      const duplicateRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'Password456!',
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error).toBeDefined();
      expect(duplicateRes.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
      expect(duplicateRes.body.error.message).toContain('already exists');
    });

    it('should reject registration if password is shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'shortpass@test.com',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain('8 characters');
    });

    it('should reject registration if email is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'ValidPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // =========================================================================
  // 2. AUTHENTICATION: Login
  // =========================================================================
  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'active-researcher@test.com',
          password: 'CorrectPassword123!',
          name: 'Active Researcher',
        });
    });

    it('should successfully authenticate with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'active-researcher@test.com',
          password: 'CorrectPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.researcher.email).toBe('active-researcher@test.com');
      expect(res.body.researcher.name).toBe('Active Researcher');

      // Security checks
      expect(res.body.researcher).not.toHaveProperty('password');
      expect(res.body.researcher).not.toHaveProperty('passwordHash');
    });

    it('should fail with 401 when password is incorrect', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'active-researcher@test.com',
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Invalid email or password');
    });

    it('should fail with 401 when email is not registered', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Invalid email or password');
    });

    it('should issue a JWT containing only minimal identity and no sensitive data', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'active-researcher@test.com',
          password: 'CorrectPassword123!',
        });

      const token = res.body.token;
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded).toBeDefined();
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('email');
      expect(decoded.email).toBe('active-researcher@test.com');

      // Crucial: token must NOT have password or passwordHash
      expect(decoded).not.toHaveProperty('password');
      expect(decoded).not.toHaveProperty('passwordHash');
    });
  });

  // =========================================================================
  // 3. AUTHENTICATION: /me Profile Endpoint
  // =========================================================================
  describe('GET /api/v1/auth/me', () => {
    it('should return authenticated researcher profile when valid JWT is supplied', async () => {
      const r = await createTestResearcher(app, 'dr.profile@test.com');

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(r.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(r.researcherId);
      expect(res.body.email).toBe('dr.profile@test.com');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('should reject request with 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Authentication token missing');
    });

    it('should reject request with 401 when token is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-garbage-token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with 401 when Authorization scheme is not Bearer', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic dXNlcjpwYXNz');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // =========================================================================
  // 4. AUTHORIZATION & OWNERSHIP: Experiments
  // =========================================================================
  describe('Researcher Experiment Authorization & Ownership', () => {
    let researcherA: { researcherId: string; token: string; authHeader: { Authorization: string } };
    let researcherB: { researcherId: string; token: string; authHeader: { Authorization: string } };
    let experimentAId: string;

    beforeEach(async () => {
      researcherA = await createTestResearcher(app, 'researcher-a@test.com');
      researcherB = await createTestResearcher(app, 'researcher-b@test.com');

      // Create experiment owned by Researcher A
      const createRes = await request(app)
        .post('/api/v1/experiments')
        .set(researcherA.authHeader)
        .send({
          title: "Researcher A's Study",
          description: 'A study owned by researcher A.',
          publicSlug: 'study-owned-by-a',
          trials: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              orderIndex: 1,
              label: 'Trial 1',
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1000,
                responseTimeoutMs: 2000,
                allowEarlyResponse: false,
                waitForResponse: false,
              },
              stimulus: {
                id: '22222222-2222-4222-8222-222222222222',
                type: 'text',
                content: 'Stimulus A',
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
        });

      expect(createRes.status).toBe(201);
      experimentAId = createRes.body.id;
    });

    it('A. Researcher A (owner) can retrieve own experiment (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/experiments/${experimentAId}`)
        .set(researcherA.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(experimentAId);
      expect(res.body.ownerResearcherId).toBe(researcherA.researcherId);
    });

    it("B. Researcher B (non-owner) CANNOT retrieve Researcher A's experiment (403 Forbidden)", async () => {
      const res = await request(app)
        .get(`/api/v1/experiments/${experimentAId}`)
        .set(researcherB.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('You do not own this experiment');
    });

    it('C. Unauthenticated request to get experiment is rejected (401 Unauthorized)', async () => {
      const res = await request(app).get(`/api/v1/experiments/${experimentAId}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('A. Researcher A (owner) can update own experiment (200 OK)', async () => {
      const res = await request(app)
        .put(`/api/v1/experiments/${experimentAId}`)
        .set(researcherA.authHeader)
        .send({
          title: 'Updated Title by Owner A',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title by Owner A');
    });

    it("B. Researcher B (non-owner) CANNOT update Researcher A's experiment (403 Forbidden)", async () => {
      const res = await request(app)
        .put(`/api/v1/experiments/${experimentAId}`)
        .set(researcherB.authHeader)
        .send({
          title: 'Malicious Update by Non-Owner',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it("B. Researcher B (non-owner) CANNOT publish Researcher A's experiment (403 Forbidden)", async () => {
      const res = await request(app)
        .post(`/api/v1/experiments/${experimentAId}/publish`)
        .set(researcherB.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('A. Researcher A (owner) can publish own experiment (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/experiments/${experimentAId}/publish`)
        .set(researcherA.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PUBLISHED');
    });

    it("B. Researcher B (non-owner) CANNOT delete Researcher A's experiment (403 Forbidden)", async () => {
      const res = await request(app)
        .delete(`/api/v1/experiments/${experimentAId}`)
        .set(researcherB.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('A. Researcher A (owner) can delete own experiment (204 No Content)', async () => {
      const res = await request(app)
        .delete(`/api/v1/experiments/${experimentAId}`)
        .set(researcherA.authHeader);

      expect(res.status).toBe(204);

      // Verify deletion in DB
      const check = await prisma.experiment.findUnique({ where: { id: experimentAId } });
      expect(check).toBeNull();
    });

    it('Listing experiments scopes strictly to the authenticated researcher', async () => {
      // Create an experiment owned by Researcher B
      await request(app)
        .post('/api/v1/experiments')
        .set(researcherB.authHeader)
        .send({
          title: "Researcher B's Experiment",
          description: 'Owner B only.',
          publicSlug: 'study-owned-by-b',
        });

      // Researcher A listing
      const resA = await request(app)
        .get('/api/v1/experiments')
        .set(researcherA.authHeader);

      expect(resA.status).toBe(200);
      expect(resA.body.total).toBe(1);
      expect(resA.body.experiments[0].title).toBe("Researcher A's Study");

      // Researcher B listing
      const resB = await request(app)
        .get('/api/v1/experiments')
        .set(researcherB.authHeader);

      expect(resB.status).toBe(200);
      expect(resB.body.total).toBe(1);
      expect(resB.body.experiments[0].title).toBe("Researcher B's Experiment");
    });
  });

  // =========================================================================
  // 5. AUTHORIZATION & OWNERSHIP: Results & Analytics
  // =========================================================================
  describe('Researcher Results Authorization & Ownership', () => {
    let researcherA: { researcherId: string; token: string; authHeader: { Authorization: string } };
    let researcherB: { researcherId: string; token: string; authHeader: { Authorization: string } };
    let experimentAId: string;

    beforeEach(async () => {
      researcherA = await createTestResearcher(app, 'results-owner@test.com');
      researcherB = await createTestResearcher(app, 'results-intruder@test.com');

      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set(researcherA.authHeader)
        .send({
          title: 'Results Test Study',
          description: 'Testing results protection.',
          publicSlug: 'results-test-slug',
          trials: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              orderIndex: 1,
              label: 'Trial 1',
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1000,
                responseTimeoutMs: 2000,
                allowEarlyResponse: false,
                waitForResponse: false,
              },
              stimulus: {
                id: '44444444-4444-4444-8444-444444444444',
                type: 'text',
                content: 'Test Stim',
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
        });

      experimentAId = expRes.body.id;
      // Publish experiment
      await request(app)
        .post(`/api/v1/experiments/${experimentAId}/publish`)
        .set(researcherA.authHeader);

      // Participant session and response
      const sessionRes = await request(app)
        .post('/api/v1/participant/experiments/results-test-slug/sessions')
        .send({});

      const sessionId = sessionRes.body.sessionId;
      await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/33333333-3333-4333-8333-333333333333/response`)
        .send({
          submittedResponse: 'Space',
          reactionTimeMs: 250,
          timedOut: false,
        });
    });

    it('A. Researcher A (owner) can access raw results (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/experiments/${experimentAId}/results`)
        .set(researcherA.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
    });

    it('B. Researcher B (non-owner) CANNOT access raw results (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/experiments/${experimentAId}/results`)
        .set(researcherB.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('A. Researcher A (owner) can access results summary (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/experiments/${experimentAId}/results/summary`)
        .set(researcherA.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.totalResponses).toBe(1);
    });

    it('B. Researcher B (non-owner) CANNOT access results summary (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/experiments/${experimentAId}/results/summary`)
        .set(researcherB.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('A. Researcher A (owner) can export JSON results (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/experiments/${experimentAId}/results/export.json`)
        .set(researcherA.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.totalResults).toBe(1);
    });

    it('B. Researcher B (non-owner) CANNOT export JSON results (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/experiments/${experimentAId}/results/export.json`)
        .set(researcherB.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('A. Researcher A (owner) can export CSV results (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/experiments/${experimentAId}/results/export.csv`)
        .set(researcherA.authHeader);

      expect(res.status).toBe(200);
      expect(res.text).toContain('sessionId,experimentId');
    });

    it('B. Researcher B (non-owner) CANNOT export CSV results (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/experiments/${experimentAId}/results/export.csv`)
        .set(researcherB.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // =========================================================================
  // 6. PARTICIPANT REGRESSION: Stays Completely Anonymous & No Auth Required
  // =========================================================================
  describe('Participant Regression & Public Anonymity', () => {
    let publicSlug: string;
    let trialId: string;

    beforeEach(async () => {
      const researcher = await createTestResearcher(app, 'participant-study-owner@test.com');
      trialId = '55555555-5555-4555-8555-555555555555';
      publicSlug = 'anonymous-participant-test';

      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set(researcher.authHeader)
        .send({
          title: 'Anonymous Participant Test Experiment',
          description: 'Ensures participants require zero credentials.',
          publicSlug,
          trials: [
            {
              id: trialId,
              orderIndex: 1,
              label: 'Anonymous Trial 1',
              timingConfig: {
                preStimulusDelayMs: 250,
                stimulusDurationMs: 1500,
                responseTimeoutMs: 3000,
                allowEarlyResponse: false,
                waitForResponse: false,
              },
              stimulus: {
                id: '66666666-6666-4666-8666-666666666666',
                type: 'text',
                content: 'Anon Stimulus',
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
        });

      await request(app)
        .post(`/api/v1/experiments/${expRes.body.id}/publish`)
        .set(researcher.authHeader);
    });

    it('D. Anonymous participant can start a session with NO JWT or account', async () => {
      const res = await request(app)
        .post(`/api/v1/participant/experiments/${publicSlug}/sessions`)
        .send({
          clientEnvironment: {
            browser: 'Chrome 128',
            os: 'macOS',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('sessionId');
      expect(res.body).toHaveProperty('firstTrial');
      // Participant response must not leak researcher identity
      expect(res.body).not.toHaveProperty('ownerResearcherId');
      expect(res.body).not.toHaveProperty('researcher');
    });

    it('E. Anonymous participant can retrieve current execution step with NO JWT', async () => {
      const startRes = await request(app)
        .post(`/api/v1/participant/experiments/${publicSlug}/sessions`)
        .send({});

      const sessionId = startRes.body.sessionId;
      const stepRes = await request(app).get(`/api/v1/participant/sessions/${sessionId}/current-step`);

      expect(stepRes.status).toBe(200);
      expect(stepRes.body.sessionId).toBe(sessionId);
    });

    it('E. Anonymous participant can submit response with NO JWT', async () => {
      const startRes = await request(app)
        .post(`/api/v1/participant/experiments/${publicSlug}/sessions`)
        .send({});

      const sessionId = startRes.body.sessionId;
      const respRes = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/${trialId}/response`)
        .send({
          submittedResponse: 'Space',
          reactionTimeMs: 320,
          timedOut: false,
        });

      expect(respRes.status).toBe(200);
      expect(respRes.body.isCompleted).toBe(true);
    });

    it('F. Anonymous participant accessing researcher endpoint is rejected (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/v1/experiments');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
