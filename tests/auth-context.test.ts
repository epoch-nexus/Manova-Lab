import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/db/prisma.js';
import { createTestResearcher } from './helpers/auth.js';
import { clearResearcherCache } from '../src/server/middleware/auth.js';

const app = createApp();

describe('Batch 9 — User Auth Context & Dynamic Experiment Creation', () => {
  beforeEach(async () => {
    clearResearcherCache();
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
    clearResearcherCache();
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

  // (a) register user A, GET /api/v1/auth/me returns the flat profile with A's id and email and no passwordHash
  it('(a) GET /api/v1/auth/me returns flat profile with user A id and email and no passwordHash', async () => {
    const userA = await createTestResearcher(app, 'user-a@example.com');

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set(userA.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userA.researcherId);
    expect(res.body.email).toBe('user-a@example.com');
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).toHaveProperty('updatedAt');
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  // (b) a token whose researcher was deleted gets 401 on GET /api/v1/auth/me and on POST /api/v1/experiments
  it('(b) a token whose researcher was deleted gets 401 on GET /api/v1/auth/me and on POST /api/v1/experiments', async () => {
    const userA = await createTestResearcher(app, 'deleted-user@example.com');

    // Delete the researcher from the database
    await prisma.researcher.delete({
      where: { id: userA.researcherId },
    });
    clearResearcherCache();

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set(userA.authHeader);
    expect(meRes.status).toBe(401);
    expect(meRes.body.error.code).toBe('UNAUTHORIZED');

    const expRes = await request(app)
      .post('/api/v1/experiments')
      .set(userA.authHeader)
      .send({
        title: 'Experiment Should Fail',
        description: 'Testing deleted researcher',
        publicSlug: 'deleted-user-exp',
      });
    expect(expRes.status).toBe(401);
    expect(expRes.body.error.code).toBe('UNAUTHORIZED');
  });

  // (c) new user B lists experiments => { experiments: [], total: 0 } even after A created some
  it('(c) new user B lists experiments => { experiments: [], total: 0 } even after A created some', async () => {
    const userA = await createTestResearcher(app, 'user-a-c@example.com');
    const userB = await createTestResearcher(app, 'user-b-c@example.com');

    // A creates an experiment
    await request(app)
      .post('/api/v1/experiments')
      .set(userA.authHeader)
      .send({
        title: 'User A Experiment',
        description: 'Experiment owned by User A',
        publicSlug: 'user-a-exp',
      });

    // B lists experiments
    const bListRes = await request(app)
      .get('/api/v1/experiments')
      .set(userB.authHeader);

    expect(bListRes.status).toBe(200);
    expect(bListRes.body).toEqual({
      experiments: [],
      total: 0,
    });
  });

  // (d) B cannot read A's experiment by id (404)
  it('(d) B cannot read A experiment by id (404)', async () => {
    const userA = await createTestResearcher(app, 'user-a-d@example.com');
    const userB = await createTestResearcher(app, 'user-b-d@example.com');

    const aExpRes = await request(app)
      .post('/api/v1/experiments')
      .set(userA.authHeader)
      .send({
        title: 'User A Private Experiment',
        description: 'Private experiment',
        publicSlug: 'user-a-private-exp',
      });

    const expId = aExpRes.body.id;

    // B tries to read A's experiment
    const bReadRes = await request(app)
      .get(`/api/v1/experiments/${expId}`)
      .set(userB.authHeader);

    expect(bReadRes.status).toBe(404);
    expect(bReadRes.body.error.code).toBe('EXPERIMENT_NOT_FOUND');
  });

  // (e) POST /api/v1/experiments with a body containing another researcher's ownerResearcherId stores the token user as owner
  it('(e) POST /api/v1/experiments with a body containing another researcher ownerResearcherId stores token user as owner', async () => {
    const userA = await createTestResearcher(app, 'user-a-e@example.com');
    const userB = await createTestResearcher(app, 'user-b-e@example.com');

    // B creates an experiment attempting to set ownerResearcherId to A's id
    const res = await request(app)
      .post('/api/v1/experiments')
      .set(userB.authHeader)
      .send({
        title: 'User B Experiment with Spoofed Owner',
        description: 'Spoof attempt',
        publicSlug: 'spoofed-owner-exp',
        ownerResearcherId: userA.researcherId,
      });

    expect(res.status).toBe(201);
    expect(res.body.ownerResearcherId).toBe(userB.researcherId);

    // Verify in database that owner is actually B
    const dbExp = await prisma.experiment.findUnique({
      where: { id: res.body.id },
    });
    expect(dbExp!.ownerResearcherId).toBe(userB.researcherId);
  });

  // (f) POST returns 201, the body contains trialCount and has the same keys as a list item, and a following GET list contains that same id first
  it('(f) POST returns 201, contains trialCount, matches list item shape, and following GET list contains that id first', async () => {
    const user = await createTestResearcher(app, 'user-f@example.com');

    const trialId = '11111111-1111-4111-8111-111111111111';
    const createRes = await request(app)
      .post('/api/v1/experiments')
      .set(user.authHeader)
      .send({
        title: 'Experiment with Trial',
        description: 'Testing create response shape',
        publicSlug: 'shape-test-exp',
        trials: [
          {
            id: trialId,
            orderIndex: 1,
            stimulus: {
              id: '22222222-2222-4222-8222-222222222222',
              type: 'text',
              content: 'Stimulus 1',
            },
            timingConfig: {
              preStimulusDelayMs: 200,
              stimulusDurationMs: 1000,
              responseTimeoutMs: 2000,
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
          },
        ],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.headers.location).toBe(`/api/v1/experiments/${createRes.body.id}`);
    expect(createRes.body.trialCount).toBe(1);
    expect(createRes.body.description).toBe('Testing create response shape');

    const listRes = await request(app)
      .get('/api/v1/experiments')
      .set(user.authHeader);

    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(1);
    const listItem = listRes.body.experiments[0];
    expect(listItem.id).toBe(createRes.body.id);

    // List item keys must all be present on create response
    const requiredListItemKeys = [
      'id',
      'title',
      'description',
      'status',
      'version',
      'publicSlug',
      'trialCount',
      'createdAt',
      'updatedAt',
    ];
    for (const key of requiredListItemKeys) {
      expect(createRes.body).toHaveProperty(key);
      expect(listItem).toHaveProperty(key);
    }
  });

  // (g) POST with an invalid body returns 400 with error.fieldErrors containing the exact failing path (e.g. 'title' and 'trials.0.stimulus.content') and details[].code
  it('(g) POST with invalid body returns 400 with exact error.fieldErrors paths and details[].code', async () => {
    const user = await createTestResearcher(app, 'user-g@example.com');

    const res = await request(app)
      .post('/api/v1/experiments')
      .set(user.authHeader)
      .send({
        title: 'ab', // < 3 chars
        description: 'Invalid trial inside',
        publicSlug: 'invalid-trial-exp',
        trials: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            orderIndex: 1,
            stimulus: {
              id: '22222222-2222-4222-8222-222222222222',
              type: 'text',
              content: '', // empty content violates stimulusSchema min(1)
            },
            timingConfig: {
              preStimulusDelayMs: 200,
              stimulusDurationMs: 1000,
              responseTimeoutMs: 2000,
              allowEarlyResponse: false,
              waitForResponse: false,
            },
            expectedResponse: {
              type: 'keypress',
              allowedKeys: ['Space'],
              evaluationMode: 'exact_match',
            },
            nextTrialId: null,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_EXPERIMENT');
    expect(res.body.error.fieldErrors).toBeDefined();
    expect(res.body.error.fieldErrors['title']).toBeDefined();
    expect(Array.isArray(res.body.error.fieldErrors['title'])).toBe(true);
    expect(res.body.error.fieldErrors['trials.0.stimulus.content']).toBeDefined();
    expect(Array.isArray(res.body.error.fieldErrors['trials.0.stimulus.content'])).toBe(true);

    expect(Array.isArray(res.body.error.details)).toBe(true);
    const titleDetail = res.body.error.details.find((d: any) => d.field === 'title');
    expect(titleDetail).toBeDefined();
    expect(titleDetail.code).toBeDefined();

    const stimulusDetail = res.body.error.details.find(
      (d: any) => d.field === 'trials.0.stimulus.content'
    );
    expect(stimulusDetail).toBeDefined();
    expect(stimulusDetail.code).toBeDefined();
  });
});
