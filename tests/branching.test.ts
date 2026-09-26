import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/db/prisma.js';
import { createTestResearcher } from './helpers/auth.js';
import { ExecutionEngine } from '../src/engine/execution-engine.js';
import type { Experiment, Trial } from '../src/types/experiment.d.ts';

const app = createApp();

describe('Phase 7 — Dynamic Conditional Branching Engine', () => {
  let authHeader: { Authorization: string };

  beforeEach(async () => {
    await prisma.sessionResponse.deleteMany();
    await prisma.session.deleteMany();
    await prisma.experimentVersion.deleteMany();
    await prisma.expectedResponse.deleteMany();
    await prisma.stimulus.deleteMany();
    await prisma.trial.deleteMany();
    await prisma.experiment.deleteMany();
    await prisma.researcher.deleteMany();

    const researcher = await createTestResearcher(app, 'branching-suite@test.com');
    authHeader = researcher.authHeader;
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

  // ==========================================
  // 1. Branching Unit Tests (Pure Execution Engine)
  // ==========================================
  describe('Execution Engine Branching Unit Tests', () => {
    const engine = new ExecutionEngine();

    const trialA: Trial = {
      id: '11111111-1111-4111-8111-111111111111',
      orderIndex: 1,
      stimulus: { id: 's1111111-1111-4111-8111-111111111111', type: 'text', content: 'Trial A' },
      timingConfig: { preStimulusDelayMs: 0, stimulusDurationMs: 1000, responseTimeoutMs: 2000, allowEarlyResponse: false, waitForResponse: false },
      expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
      nextTrialId: '22222222-2222-4222-8222-222222222222',
      branching: {
        ifCorrect: '33333333-3333-4333-8333-333333333333',
        ifIncorrect: '22222222-2222-4222-8222-222222222222',
      },
    };

    const trialB: Trial = {
      id: '22222222-2222-4222-8222-222222222222',
      orderIndex: 2,
      stimulus: { id: 's2222222-2222-4222-8222-222222222222', type: 'text', content: 'Trial B (Remediation)' },
      timingConfig: { preStimulusDelayMs: 0, stimulusDurationMs: 1000, responseTimeoutMs: 2000, allowEarlyResponse: false, waitForResponse: false },
      expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
      nextTrialId: '33333333-3333-4333-8333-333333333333',
      branching: null,
    };

    const trialC: Trial = {
      id: '33333333-3333-4333-8333-333333333333',
      orderIndex: 3,
      stimulus: { id: 's3333333-3333-4333-8333-333333333333', type: 'text', content: 'Trial C (Advanced/Terminal)' },
      timingConfig: { preStimulusDelayMs: 0, stimulusDurationMs: 1000, responseTimeoutMs: 2000, allowEarlyResponse: false, waitForResponse: false },
      expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
      nextTrialId: null,
      branching: null,
    };

    const mockSnapshot: Experiment = {
      id: 'exp-test-01',
      title: 'Branching Mock Study',
      description: 'Mock snapshot',
      status: 'PUBLISHED',
      version: 1,
      ownerResearcherId: '00000000-0000-0000-0000-000000000000',
      publicSlug: 'branching-mock',
      config: { displayMode: 'fullscreen', backgroundColor: '#000', allowPause: false, showFeedback: true },
      trials: [trialA, trialB, trialC],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('1. Correct response selects ifCorrect target', () => {
      const result = engine.advanceLinearSequence(
        {
          id: 'sess-1',
          experimentId: mockSnapshot.id,
          status: 'IN_PROGRESS',
          executionState: 'AWAITING_RESPONSE',
          currentTrialId: trialA.id,
          currentTrialIndex: 0,
          totalTrials: 3,
        },
        mockSnapshot,
        trialA.id,
        true // isCorrect = true
      );

      expect(result.nextTrialId).toBe(trialC.id);
      expect(result.nextTrial?.id).toBe(trialC.id);
      expect(result.isCompleted).toBe(false);
    });

    it('2. Incorrect response selects ifIncorrect target', () => {
      const result = engine.advanceLinearSequence(
        {
          id: 'sess-1',
          experimentId: mockSnapshot.id,
          status: 'IN_PROGRESS',
          executionState: 'AWAITING_RESPONSE',
          currentTrialId: trialA.id,
          currentTrialIndex: 0,
          totalTrials: 3,
        },
        mockSnapshot,
        trialA.id,
        false // isCorrect = false
      );

      expect(result.nextTrialId).toBe(trialB.id);
      expect(result.nextTrial?.id).toBe(trialB.id);
      expect(result.isCompleted).toBe(false);
    });

    it('3. Trial without branching follows existing nextTrialId progression', () => {
      const result = engine.advanceLinearSequence(
        {
          id: 'sess-1',
          experimentId: mockSnapshot.id,
          status: 'IN_PROGRESS',
          executionState: 'AWAITING_RESPONSE',
          currentTrialId: trialB.id,
          currentTrialIndex: 1,
          totalTrials: 3,
        },
        mockSnapshot,
        trialB.id,
        true
      );

      expect(result.nextTrialId).toBe(trialC.id);
      expect(result.nextTrial?.id).toBe(trialC.id);
    });

    it('4. Terminal trial without branching completes experiment', () => {
      const result = engine.advanceLinearSequence(
        {
          id: 'sess-1',
          experimentId: mockSnapshot.id,
          status: 'IN_PROGRESS',
          executionState: 'AWAITING_RESPONSE',
          currentTrialId: trialC.id,
          currentTrialIndex: 2,
          totalTrials: 3,
        },
        mockSnapshot,
        trialC.id,
        true
      );

      expect(result.isCompleted).toBe(true);
      expect(result.sessionStatus).toBe('COMPLETED');
      expect(result.nextTrialId).toBeNull();
      expect(result.nextTrial).toBeNull();
    });

    it('5. Invalid branch target is rejected with error when missing from snapshot', () => {
      const corruptedTrial: Trial = {
        ...trialA,
        branching: {
          ifCorrect: '99999999-9999-4999-8999-999999999999',
          ifIncorrect: trialB.id,
        },
      };

      const badSnapshot: Experiment = {
        ...mockSnapshot,
        trials: [corruptedTrial, trialB, trialC],
      };

      expect(() => {
        engine.advanceLinearSequence(
          {
            id: 'sess-1',
            experimentId: badSnapshot.id,
            status: 'IN_PROGRESS',
            executionState: 'AWAITING_RESPONSE',
            currentTrialId: corruptedTrial.id,
            currentTrialIndex: 0,
            totalTrials: 3,
          },
          badSnapshot,
          corruptedTrial.id,
          true
        );
      }).toThrow('Corrupted branching pointer');
    });
  });

  // Helper for generating standard branching experiment payload
  function createBranchingExperimentPayload(slug: string, customBranching?: any) {
    const t1 = '11111111-1111-4111-8111-111111111111';
    const t2 = '22222222-2222-4222-8222-222222222222';
    const t3 = '33333333-3333-4333-8333-333333333333';

    return {
      title: 'Branching Cognitive Study',
      description: 'Tests conditional accuracy branching',
      publicSlug: slug,
      config: {
        displayMode: 'fullscreen',
        backgroundColor: '#1E293B',
        allowPause: false,
        showFeedback: true,
      },
      trials: [
        {
          id: t1,
          orderIndex: 1,
          label: 'Decision Trial',
          stimulus: {
            id: 'aaaa1111-1111-4111-8111-111111111111',
            type: 'text',
            content: 'Press Space for Correct',
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
            allowedKeys: ['Space', 'KeyF'],
            correctResponse: 'Space',
            evaluationMode: 'exact_match',
          },
          nextTrialId: t2,
          branching:
            customBranching !== undefined
              ? customBranching
              : {
                  ifCorrect: t3,
                  ifIncorrect: t2,
                },
        },
        {
          id: t2,
          orderIndex: 2,
          label: 'Remediation Trial',
          stimulus: {
            id: 'bbbb2222-2222-4222-8222-222222222222',
            type: 'text',
            content: 'Remediation: Review instructions',
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
          nextTrialId: t3,
          branching: null,
        },
        {
          id: t3,
          orderIndex: 3,
          label: 'Terminal Trial',
          stimulus: {
            id: 'cccc3333-3333-4333-8333-333333333333',
            type: 'text',
            content: 'Final Evaluation',
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
          branching: null,
        },
      ],
    };
  }

  // ==========================================
  // 2. Publish-Time Validation Tests
  // ==========================================
  describe('Publish-Time Validation for Branching', () => {
    it('6. Valid branch targets publish successfully', async () => {
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set(authHeader)
        .send(createBranchingExperimentPayload('valid-branch-study'));
      expect(expRes.status).toBe(201);

      const pubRes = await request(app)
        .post(`/api/v1/experiments/${expRes.body.id}/publish`)
        .set(authHeader)
        .send();
      expect(pubRes.status).toBe(200);
      expect(pubRes.body.status).toBe('PUBLISHED');
    });

    it('7. Nonexistent ifCorrect target fails validation', async () => {
      const badPayload = createBranchingExperimentPayload('bad-if-correct', {
        ifCorrect: '99999999-9999-4999-8999-999999999999',
        ifIncorrect: '22222222-2222-4222-8222-222222222222',
      });

      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set(authHeader)
        .send(badPayload);

      expect(expRes.status).toBe(400);
      expect(expRes.body.error.code).toBe('INVALID_EXPERIMENT');
      expect(expRes.body.error.details[0].message).toContain('Branching ifCorrect target');
    });

    it('8. Nonexistent ifIncorrect target fails validation', async () => {
      const badPayload = createBranchingExperimentPayload('bad-if-incorrect', {
        ifCorrect: '33333333-3333-4333-8333-333333333333',
        ifIncorrect: '88888888-8888-4888-8888-888888888888',
      });

      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set(authHeader)
        .send(badPayload);

      expect(expRes.status).toBe(400);
      expect(expRes.body.error.code).toBe('INVALID_EXPERIMENT');
      expect(expRes.body.error.details[0].message).toContain('Branching ifIncorrect target');
    });

    it('9. Self-referential branching is rejected (loop safeguard)', async () => {
      const selfRefPayload = createBranchingExperimentPayload('self-ref-study', {
        ifCorrect: '11111111-1111-4111-8111-111111111111', // Points to itself!
        ifIncorrect: '22222222-2222-4222-8222-222222222222',
      });

      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set(authHeader)
        .send(selfRefPayload);

      expect(expRes.status).toBe(400);
      expect(expRes.body.error.details[0].message).toContain('Self-referential branching detected');
    });
  });

  // ==========================================
  // 3. Session Execution Tests
  // ==========================================
  describe('Session Execution with Dynamic Branching', () => {
    it('10 & 12. Correct response branches to ifCorrect target and returns it in current-step', async () => {
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set(authHeader)
        .send(createBranchingExperimentPayload('correct-branch-run'));
      await request(app)
        .post(`/api/v1/experiments/${expRes.body.id}/publish`)
        .set(authHeader)
        .send();

      const sessionRes = await request(app)
        .post('/api/v1/participant/experiments/correct-branch-run/sessions')
        .send();
      const sessionId = sessionRes.body.sessionId;

      // First trial is Trial 1
      expect(sessionRes.body.firstTrial.id).toBe('11111111-1111-4111-8111-111111111111');

      // Submit CORRECT response ('Space')
      const resp = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/11111111-1111-4111-8111-111111111111/response`)
        .send({ submittedResponse: 'Space', reactionTimeMs: 320 });

      expect(resp.status).toBe(200);
      expect(resp.body.isCorrect).toBe(true);
      // Must branch to Trial 3 (ifCorrect), skipping Trial 2!
      expect(resp.body.nextTrial.id).toBe('33333333-3333-4333-8333-333333333333');

      // Check current-step endpoint
      const stepRes = await request(app).get(`/api/v1/participant/sessions/${sessionId}/current-step`);
      expect(stepRes.status).toBe(200);
      expect(stepRes.body.currentTrial.id).toBe('33333333-3333-4333-8333-333333333333');
    });

    it('11. Incorrect response branches to ifIncorrect target', async () => {
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set(authHeader)
        .send(createBranchingExperimentPayload('incorrect-branch-run'));
      await request(app)
        .post(`/api/v1/experiments/${expRes.body.id}/publish`)
        .set(authHeader)
        .send();

      const sessionRes = await request(app)
        .post('/api/v1/participant/experiments/incorrect-branch-run/sessions')
        .send();
      const sessionId = sessionRes.body.sessionId;

      // Submit INCORRECT response ('KeyF')
      const resp = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/11111111-1111-4111-8111-111111111111/response`)
        .send({ submittedResponse: 'KeyF', reactionTimeMs: 410 });

      expect(resp.status).toBe(200);
      expect(resp.body.isCorrect).toBe(false);
      // Must branch to Trial 2 (ifIncorrect)
      expect(resp.body.nextTrial.id).toBe('22222222-2222-4222-8222-222222222222');
    });

    it('13 & 14. Branched session can continue through subsequent trials to completion', async () => {
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set(authHeader)
        .send(createBranchingExperimentPayload('branch-to-complete-run'));
      await request(app)
        .post(`/api/v1/experiments/${expRes.body.id}/publish`)
        .set(authHeader)
        .send();

      const sessionRes = await request(app)
        .post('/api/v1/participant/experiments/branch-to-complete-run/sessions')
        .send();
      const sessionId = sessionRes.body.sessionId;

      // 1. Correct on Trial 1 -> jumps to Trial 3
      await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/11111111-1111-4111-8111-111111111111/response`)
        .send({ submittedResponse: 'Space', reactionTimeMs: 300 });

      // 2. Respond on Trial 3 (terminal trial)
      const finishResp = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/33333333-3333-4333-8333-333333333333/response`)
        .send({ submittedResponse: 'Space', reactionTimeMs: 350 });

      expect(finishResp.status).toBe(200);
      expect(finishResp.body.isCompleted).toBe(true);
      expect(finishResp.body.sessionStatus).toBe('COMPLETED');
      expect(finishResp.body.nextTrial).toBeNull();

      // Check DB session state
      const dbSession = await prisma.session.findUnique({ where: { id: sessionId } });
      expect(dbSession!.status).toBe('COMPLETED');
      expect(dbSession!.completedAt).not.toBeNull();
    });
  });

  // ==========================================
  // 4. Snapshot Isolation Tests
  // ==========================================
  describe('Snapshot Isolation with Branching', () => {
    it('16 & 17. v1 branch definitions remain active for v1 sessions when v2 is created/published', async () => {
      // 1. Create and publish Version 1
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set(authHeader)
        .send(createBranchingExperimentPayload('isolation-branch-study'));
      const expId = expRes.body.id;
      await request(app)
        .post(`/api/v1/experiments/${expId}/publish`)
        .set(authHeader)
        .send();

      // 2. Start Session 1 on Version 1
      const s1Res = await request(app)
        .post('/api/v1/participant/experiments/isolation-branch-study/sessions')
        .send();
      const s1Id = s1Res.body.sessionId;

      // 3. Edit experiment to Version 2 with inverted branching: ifCorrect -> Trial 2, ifIncorrect -> Trial 3
      await request(app)
        .put(`/api/v1/experiments/${expId}`)
        .set(authHeader)
        .send({
          title: 'Version 2 with Inverted Branching',
          trials: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              orderIndex: 1,
              stimulus: { id: 'aaaa1111-1111-4111-8111-111111111111', type: 'text', content: 'V2 Decision' },
              timingConfig: { preStimulusDelayMs: 200, stimulusDurationMs: 1000, responseTimeoutMs: 2000, allowEarlyResponse: false, waitForResponse: false },
              expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
              nextTrialId: '22222222-2222-4222-8222-222222222222',
              branching: {
                ifCorrect: '22222222-2222-4222-8222-222222222222', // Inverted!
                ifIncorrect: '33333333-3333-4333-8333-333333333333',
              },
            },
            {
              id: '22222222-2222-4222-8222-222222222222',
              orderIndex: 2,
              stimulus: { id: 'bbbb2222-2222-4222-8222-222222222222', type: 'text', content: 'V2 Trial 2' },
              timingConfig: { preStimulusDelayMs: 200, stimulusDurationMs: 1000, responseTimeoutMs: 2000, allowEarlyResponse: false, waitForResponse: false },
              expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
              nextTrialId: '33333333-3333-4333-8333-333333333333',
              branching: null,
            },
            {
              id: '33333333-3333-4333-8333-333333333333',
              orderIndex: 3,
              stimulus: { id: 'cccc3333-3333-4333-8333-333333333333', type: 'text', content: 'V2 Terminal' },
              timingConfig: { preStimulusDelayMs: 200, stimulusDurationMs: 1000, responseTimeoutMs: 2000, allowEarlyResponse: false, waitForResponse: false },
              expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
              nextTrialId: null,
              branching: null,
            },
          ],
        });

      await request(app)
        .post(`/api/v1/experiments/${expId}/publish`)
        .set(authHeader)
        .send();

      // 4. Session 1 (on v1) submits correct response: v1 rules must route to Trial 3 (not v2's Trial 2!)
      const s1Resp = await request(app)
        .post(`/api/v1/participant/sessions/${s1Id}/trials/11111111-1111-4111-8111-111111111111/response`)
        .send({ submittedResponse: 'Space', reactionTimeMs: 290 });

      expect(s1Resp.status).toBe(200);
      expect(s1Resp.body.nextTrial.id).toBe('33333333-3333-4333-8333-333333333333'); // v1 target!

      // 5. New Session 2 on Version 2: submits correct response -> routes to Trial 2 (v2 target)
      const s2Res = await request(app)
        .post('/api/v1/participant/experiments/isolation-branch-study/sessions')
        .send();
      const s2Id = s2Res.body.sessionId;

      const s2Resp = await request(app)
        .post(`/api/v1/participant/sessions/${s2Id}/trials/11111111-1111-4111-8111-111111111111/response`)
        .send({ submittedResponse: 'Space', reactionTimeMs: 310 });

      expect(s2Resp.status).toBe(200);
      expect(s2Resp.body.nextTrial.id).toBe('22222222-2222-4222-8222-222222222222'); // v2 target!
    });
  });

  // ==========================================
  // 5. Randomization + Branching Compatibility
  // ==========================================
  describe('Randomization & Branching Precedence Compatibility', () => {
    it('18, 19, 20. Branching overrides trial-order progression on branched trials while preserving seed and trialOrder', async () => {
      // Create experiment with BOTH randomization AND branching enabled
      const randBranchPayload = {
        ...createBranchingExperimentPayload('rand-and-branch-study'),
        config: {
          displayMode: 'fullscreen',
          backgroundColor: '#000',
          allowPause: false,
          showFeedback: true,
          randomization: { enabled: true },
        },
      };

      const expRes = await request(app)
        .post('/api/v1/experiments')
        .set(authHeader)
        .send(randBranchPayload);
      await request(app)
        .post(`/api/v1/experiments/${expRes.body.id}/publish`)
        .set(authHeader)
        .send();

      const sessionRes = await request(app)
        .post('/api/v1/participant/experiments/rand-and-branch-study/sessions')
        .send();
      const sessionId = sessionRes.body.sessionId;

      const sessionBefore = await prisma.session.findUnique({ where: { id: sessionId } });
      expect(sessionBefore!.randomizationEnabled).toBe(true);
      expect(sessionBefore!.randomizationSeed).not.toBeNull();
      const originalSeed = sessionBefore!.randomizationSeed;
      const originalOrder = sessionBefore!.trialOrder;

      // Find the first trial presented
      const activeTrialId = sessionRes.body.firstTrial.id;

      // If active trial is Trial 1 (has branching): submit correct response
      if (activeTrialId === '11111111-1111-4111-8111-111111111111') {
        const resp = await request(app)
          .post(`/api/v1/participant/sessions/${sessionId}/trials/${activeTrialId}/response`)
          .send({ submittedResponse: 'Space', reactionTimeMs: 330 });

        expect(resp.status).toBe(200);
        // Branching overrides normal next index and routes to Trial 3!
        expect(resp.body.nextTrial.id).toBe('33333333-3333-4333-8333-333333333333');
      }

      // Verify that randomization seed and trialOrder remained unchanged in DB
      const sessionAfter = await prisma.session.findUnique({ where: { id: sessionId } });
      expect(sessionAfter!.randomizationSeed).toBe(originalSeed);
      expect(sessionAfter!.trialOrder).toEqual(originalOrder);
    });
  });
});
