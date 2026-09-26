import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/db/prisma.js';

const app = createApp();

describe('Participant Execution API (Phase 3)', () => {
  beforeEach(async () => {
    await prisma.sessionResponse.deleteMany();
    await prisma.session.deleteMany();
    await prisma.experimentVersion.deleteMany();
    await prisma.experiment.deleteMany();
  });

  afterAll(async () => {
    await prisma.sessionResponse.deleteMany();
    await prisma.session.deleteMany();
    await prisma.experimentVersion.deleteMany();
    await prisma.experiment.deleteMany();
    await prisma.$disconnect();
  });

  describe('Session Initialization (POST /participant/experiments/:publicSlug/sessions)', () => {
    it('should initialize an anonymous session for a published experiment and return first trial', async () => {
      // 1. Create and publish experiment
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .send({
          title: 'Color Discrimination Task',
          description: 'Discriminate colored focal stimuli',
          publicSlug: 'color-task-01',
          generalInstructions: 'Press G for Green, R for Red.',
          completionMessage: 'Well done! Session complete.',
          trials: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              orderIndex: 1,
              stimulus: {
                id: '22222222-2222-4222-8222-222222222222',
                type: 'text',
                content: 'GREEN',
              },
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1500,
                responseTimeoutMs: 2500,
                allowEarlyResponse: false,
                waitForResponse: false,
              },
              expectedResponse: {
                type: 'keypress',
                allowedKeys: ['KeyG', 'KeyR'],
                correctResponse: 'KeyG',
                evaluationMode: 'exact_match',
              },
              nextTrialId: null,
            },
          ],
        });

      expect(expRes.status).toBe(201);
      const pubRes = await request(app).post(`/api/v1/experiments/${expRes.body.id}/publish`);
      expect(pubRes.status).toBe(200);

      // 2. Start participant session
      const startRes = await request(app)
        .post('/api/v1/participant/experiments/color-task-01/sessions')
        .send({
          clientEnvironment: {
            browser: 'Chrome',
            os: 'macOS',
          },
        });

      expect(startRes.status).toBe(201);
      expect(startRes.body).toHaveProperty('sessionId');
      expect(startRes.body.sessionId).toMatch(/^sess_/);
      expect(startRes.body.experimentTitle).toBe('Color Discrimination Task');
      expect(startRes.body.generalInstructions).toBe('Press G for Green, R for Red.');
      expect(startRes.body.totalTrials).toBe(1);
      expect(startRes.body.firstTrial).not.toBeNull();
      expect(startRes.body.firstTrial.id).toBe('11111111-1111-4111-8111-111111111111');
      expect((startRes.body.firstTrial.expectedResponse as any).correctResponse).toBeUndefined();
    });

    it('should reject session initialization if experiment is still in DRAFT status', async () => {
      await request(app)
        .post('/api/v1/experiments')
        .send({
          title: 'Draft Unpublishable Experiment',
          description: 'Draft only',
          publicSlug: 'draft-study',
        });

      const res = await request(app)
        .post('/api/v1/participant/experiments/draft-study/sessions')
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EXPERIMENT_NOT_PUBLISHED');
    });

    it('should reject session initialization if experiment does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/participant/experiments/nonexistent-study/sessions')
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('EXPERIMENT_NOT_FOUND');
    });
  });

  describe('Snapshot Immutability (Section 31 Mandatory Test)', () => {
    it('should keep session tied to original published version even after researcher publishes version 2', async () => {
      // 1. Create and publish Version 1 (Stimulus: "V1_TARGET")
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .send({
          title: 'Immutability Verification Task',
          description: 'Verify version freezing',
          publicSlug: 'immutability-task',
          trials: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              orderIndex: 1,
              stimulus: {
                id: '44444444-4444-4444-8444-444444444444',
                type: 'text',
                content: 'V1_TARGET',
              },
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1500,
                responseTimeoutMs: 2500,
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

      expect(expRes.status).toBe(201);
      const pub1 = await request(app).post(`/api/v1/experiments/${expRes.body.id}/publish`);
      expect(pub1.status).toBe(200);

      // 2. Start Session S1 bound to Version 1
      const s1Res = await request(app)
        .post('/api/v1/participant/experiments/immutability-task/sessions')
        .send({});
      expect(s1Res.status).toBe(201);
      const s1Id = s1Res.body.sessionId;

      expect(s1Res.body.firstTrial.stimulus.content).toBe('V1_TARGET');

      // 3. Researcher updates experiment to Version 2 (Stimulus: "V2_ALTERED")
      const updateRes = await request(app)
        .put(`/api/v1/experiments/${expRes.body.id}`)
        .send({
          title: 'Immutability Verification Task - V2',
          trials: [
            {
              id: '55555555-5555-4555-8555-555555555555',
              orderIndex: 1,
              stimulus: {
                id: '66666666-6666-4666-8666-666666666666',
                type: 'text',
                content: 'V2_ALTERED',
              },
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1500,
                responseTimeoutMs: 2500,
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
      expect(updateRes.status).toBe(200);

      // Increment version counter in DB to simulate publication of version 2
      await prisma.experiment.update({
        where: { id: expRes.body.id },
        data: { version: 2 },
      });
      const pub2 = await request(app).post(`/api/v1/experiments/${expRes.body.id}/publish`);
      expect(pub2.status).toBe(200);
      expect(pub2.body.version).toBe(2);

      // 4. Verify Session S1 still receives Version 1 content ("V1_TARGET"), NOT Version 2!
      const stepRes = await request(app).get(`/api/v1/participant/sessions/${s1Id}`);
      expect(stepRes.status).toBe(200);
      expect(stepRes.body.currentTrial.stimulus.content).toBe('V1_TARGET');
      expect(stepRes.body.currentTrial.id).toBe('33333333-3333-4333-8333-333333333333');

      // 5. A NEW Session S2 starts on Version 2 and receives "V2_ALTERED"
      const s2Res = await request(app)
        .post('/api/v1/participant/experiments/immutability-task/sessions')
        .send({});
      expect(s2Res.status).toBe(201);
      expect(s2Res.body.firstTrial.stimulus.content).toBe('V2_ALTERED');
      expect(s2Res.body.firstTrial.id).toBe('55555555-5555-4555-8555-555555555555');
    });
  });

  describe('MVP End-to-End Execution (Section 30)', () => {
    it('should execute a 3-trial linear experiment from start to complete', async () => {
      // 1. Create and publish 3-trial linear experiment
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .send({
          title: 'MVP Linear 3-Trial RT Task',
          description: 'Instruction -> T1 -> T2 -> T3 -> Complete',
          publicSlug: 'mvp-3-trials',
          generalInstructions: 'Focus on cross, then press key.',
          completionMessage: 'Great job! Experiment complete.',
          trials: [
            {
              id: 'aaaaaaaa-1111-4111-8111-111111111111',
              orderIndex: 1,
              stimulus: {
                id: 'aaaaaaaa-2222-4222-8222-222222222222',
                type: 'text',
                content: 'GREEN',
              },
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1500,
                responseTimeoutMs: 2500,
                allowEarlyResponse: false,
                waitForResponse: false,
              },
              expectedResponse: {
                type: 'keypress',
                allowedKeys: ['KeyG', 'KeyR', 'KeyB'],
                correctResponse: 'KeyG',
                evaluationMode: 'exact_match',
              },
              nextTrialId: 'bbbbbbbb-1111-4111-8111-111111111111',
            },
            {
              id: 'bbbbbbbb-1111-4111-8111-111111111111',
              orderIndex: 2,
              stimulus: {
                id: 'bbbbbbbb-2222-4222-8222-222222222222',
                type: 'text',
                content: 'RED',
              },
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1500,
                responseTimeoutMs: 2500,
                allowEarlyResponse: false,
                waitForResponse: false,
              },
              expectedResponse: {
                type: 'keypress',
                allowedKeys: ['KeyG', 'KeyR', 'KeyB'],
                correctResponse: 'KeyR',
                evaluationMode: 'exact_match',
              },
              nextTrialId: 'cccccccc-1111-4111-8111-111111111111',
            },
            {
              id: 'cccccccc-1111-4111-8111-111111111111',
              orderIndex: 3,
              stimulus: {
                id: 'cccccccc-2222-4222-8222-222222222222',
                type: 'text',
                content: 'BLUE',
              },
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1500,
                responseTimeoutMs: 2500,
                allowEarlyResponse: false,
                waitForResponse: false,
              },
              expectedResponse: {
                type: 'keypress',
                allowedKeys: ['KeyG', 'KeyR', 'KeyB'],
                correctResponse: 'KeyB',
                evaluationMode: 'exact_match',
              },
              nextTrialId: null, // Terminal trial
            },
          ],
        });

      expect(expRes.status).toBe(201);
      const pubRes = await request(app).post(`/api/v1/experiments/${expRes.body.id}/publish`);
      expect(pubRes.status).toBe(200);

      // 2. Start session
      const startRes = await request(app)
        .post('/api/v1/participant/experiments/mvp-3-trials/sessions')
        .send({});
      expect(startRes.status).toBe(201);
      const sessionId = startRes.body.sessionId;
      expect(startRes.body.firstTrial.id).toBe('aaaaaaaa-1111-4111-8111-111111111111');

      // 3. Inspect initial current step
      const step1 = await request(app).get(`/api/v1/participant/sessions/${sessionId}`);
      expect(step1.status).toBe(200);
      expect(step1.body.status).toBe('IN_PROGRESS');
      expect(step1.body.currentTrialIndex).toBe(0);
      expect(step1.body.currentTrial.id).toBe('aaaaaaaa-1111-4111-8111-111111111111');

      // 4. Submit response for Trial 1 -> Advances to Trial 2
      const resp1 = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/aaaaaaaa-1111-4111-8111-111111111111/response`)
        .send({ submittedResponse: 'KeyG' });

      expect(resp1.status).toBe(200);
      expect(resp1.body.sessionStatus).toBe('IN_PROGRESS');
      expect(resp1.body.isCompleted).toBe(false);
      expect(resp1.body.nextTrial.id).toBe('bbbbbbbb-1111-4111-8111-111111111111');

      // 5. Submit response for Trial 2 -> Advances to Trial 3
      const resp2 = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/bbbbbbbb-1111-4111-8111-111111111111/response`)
        .send({ submittedResponse: 'KeyR' });

      expect(resp2.status).toBe(200);
      expect(resp2.body.sessionStatus).toBe('IN_PROGRESS');
      expect(resp2.body.isCompleted).toBe(false);
      expect(resp2.body.nextTrial.id).toBe('cccccccc-1111-4111-8111-111111111111');

      // 6. Submit response for Trial 3 (Terminal) -> Transitions to COMPLETED
      const resp3 = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/cccccccc-1111-4111-8111-111111111111/response`)
        .send({ submittedResponse: 'KeyB' });

      expect(resp3.status).toBe(200);
      expect(resp3.body.sessionStatus).toBe('COMPLETED');
      expect(resp3.body.isCompleted).toBe(true);
      expect(resp3.body.nextTrial).toBeNull();
      expect(resp3.body.completionMessage).toBe('Great job! Experiment complete.');

      // 7. Verify GET current step now returns completed state
      const finalStep = await request(app).get(`/api/v1/participant/sessions/${sessionId}`);
      expect(finalStep.status).toBe(200);
      expect(finalStep.body.status).toBe('COMPLETED');
      expect(finalStep.body.isCompleted).toBe(true);
      expect(finalStep.body.currentTrial).toBeNull();

      // 8. Verify subsequent submission is rejected with 409 SESSION_ALREADY_COMPLETED
      const afterComplete = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/cccccccc-1111-4111-8111-111111111111/response`)
        .send({ submittedResponse: 'KeyB' });

      expect(afterComplete.status).toBe(409);
      expect(afterComplete.body.error.code).toBe('SESSION_ALREADY_COMPLETED');
    });
  });

  describe('Response Error Handling & Guardrails', () => {
    let activeSessionId: string;

    beforeEach(async () => {
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .send({
          title: 'Guardrail Test Study',
          description: 'Guardrail checks',
          publicSlug: 'guardrail-study',
          trials: [
            {
              id: 'dddddddd-1111-4111-8111-111111111111',
              orderIndex: 1,
              stimulus: {
                id: 'dddddddd-2222-4222-8222-222222222222',
                type: 'text',
                content: 'WORD',
              },
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1500,
                responseTimeoutMs: 2500,
                allowEarlyResponse: false,
                waitForResponse: false,
              },
              expectedResponse: {
                type: 'keypress',
                allowedKeys: ['Space'],
                correctResponse: 'Space',
                evaluationMode: 'exact_match',
              },
              nextTrialId: 'eeeeeeee-1111-4111-8111-111111111111',
            },
            {
              id: 'eeeeeeee-1111-4111-8111-111111111111',
              orderIndex: 2,
              stimulus: {
                id: 'eeeeeeee-2222-4222-8222-222222222222',
                type: 'text',
                content: 'WORD 2',
              },
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1500,
                responseTimeoutMs: 2500,
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

      await request(app).post(`/api/v1/experiments/${expRes.body.id}/publish`);
      const s = await request(app)
        .post('/api/v1/participant/experiments/guardrail-study/sessions')
        .send({});
      activeSessionId = s.body.sessionId;
    });

    it('should reject response for wrong/stale trial ID with 400 INVALID_RESPONSE', async () => {
      // Session is on trial 1, try submitting trial 2
      const res = await request(app)
        .post(`/api/v1/participant/sessions/${activeSessionId}/trials/eeeeeeee-1111-4111-8111-111111111111/response`)
        .send({ submittedResponse: 'Space' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_RESPONSE');
      expect(res.body.error.message).toContain('out of sequence');
    });

    it('should reject disallowed response key with 400 INVALID_RESPONSE', async () => {
      const res = await request(app)
        .post(`/api/v1/participant/sessions/${activeSessionId}/trials/dddddddd-1111-4111-8111-111111111111/response`)
        .send({ submittedResponse: 'KeyZ' }); // Space is only allowed key

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_RESPONSE');
      expect(res.body.error.message).toContain('Invalid response');
    });

    it('should return 404 SESSION_NOT_FOUND when accessing non-existent session', async () => {
      const res = await request(app).get('/api/v1/participant/sessions/sess_nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
    });

    it('should allow participant to abandon session', async () => {
      const res = await request(app)
        .post(`/api/v1/participant/sessions/${activeSessionId}/abandon`)
        .send({ reason: 'withdrew_consent' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ABANDONED');

      // Subsequent submissions should be rejected
      const submitAfterAbandon = await request(app)
        .post(`/api/v1/participant/sessions/${activeSessionId}/trials/dddddddd-1111-4111-8111-111111111111/response`)
        .send({ submittedResponse: 'Space' });

      expect(submitAfterAbandon.status).toBe(409);
    });
  });

  describe('Concurrency & Atomicity (Section 22)', () => {
    it('should not allow session to advance twice from concurrent responses to same trial', async () => {
      // 1. Setup 2-trial experiment
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .send({
          title: 'Concurrency Test Study',
          description: 'Concurrency check',
          publicSlug: 'concurrency-study',
          trials: [
            {
              id: 'ffffffff-1111-4111-8111-111111111111',
              orderIndex: 1,
              stimulus: {
                id: 'ffffffff-2222-4222-8222-222222222222',
                type: 'text',
                content: 'CONCURRENCY',
              },
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1500,
                responseTimeoutMs: 2500,
                allowEarlyResponse: false,
                waitForResponse: false,
              },
              expectedResponse: {
                type: 'keypress',
                allowedKeys: ['Space'],
                correctResponse: 'Space',
                evaluationMode: 'exact_match',
              },
              nextTrialId: 'ffffffff-3333-4333-8333-333333333333',
            },
            {
              id: 'ffffffff-3333-4333-8333-333333333333',
              orderIndex: 2,
              stimulus: {
                id: 'ffffffff-4444-4444-8444-444444444444',
                type: 'text',
                content: 'CONCURRENCY 2',
              },
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1500,
                responseTimeoutMs: 2500,
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

      expect(expRes.status).toBe(201);
      const pubRes = await request(app).post(`/api/v1/experiments/${expRes.body.id}/publish`);
      expect(pubRes.status).toBe(200);

      const s = await request(app)
        .post('/api/v1/participant/experiments/concurrency-study/sessions')
        .send({});
      const sessionId = s.body.sessionId;

      // 2. Fire 2 parallel responses to trial 1 simultaneously
      const [resA, resB] = await Promise.all([
        request(app)
          .post(`/api/v1/participant/sessions/${sessionId}/trials/ffffffff-1111-4111-8111-111111111111/response`)
          .send({ submittedResponse: 'Space' }),
        request(app)
          .post(`/api/v1/participant/sessions/${sessionId}/trials/ffffffff-1111-4111-8111-111111111111/response`)
          .send({ submittedResponse: 'Space' }),
      ]);

      // Exactly one request must succeed (200), and the other must be rejected (400 or 409)
      const statuses = [resA.status, resB.status];
      expect(statuses).toContain(200);
      expect(statuses.some((st) => st === 400 || st === 409)).toBe(true);

      // Verify session is now on Trial 2 and did not advance to null or corrupted state
      const check = await request(app).get(`/api/v1/participant/sessions/${sessionId}`);
      expect(check.body.status).toBe('IN_PROGRESS');
      expect(check.body.currentTrial.id).toBe('ffffffff-3333-4333-8333-333333333333');
      expect(check.body.currentTrialIndex).toBe(1);
    });
  });
});
