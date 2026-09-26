import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/db/prisma.js';
import {
  seededFisherYatesShuffle,
  createSeededPrng,
  generateRandomizationSeed,
  hashSeed,
} from '../src/randomization/index.js';

const app = createApp();

describe('Phase 6 — Stimulus & Trial Randomization Engine', () => {
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

  // ==========================================
  // 1. Randomization Unit Tests
  // ==========================================
  describe('Randomization Module Unit Tests (Fisher-Yates + Seeded PRNG)', () => {
    const trialIds = [
      'trial-A-1111-1111',
      'trial-B-2222-2222',
      'trial-C-3333-3333',
      'trial-D-4444-4444',
      'trial-E-5555-5555',
      'trial-F-6666-6666',
    ];

    it('1. Fisher-Yates returns all original trial IDs exactly once', () => {
      const seed = 'test-seed-alpha';
      const shuffled = seededFisherYatesShuffle(trialIds, seed);

      expect(shuffled).toHaveLength(trialIds.length);
      expect(shuffled.sort()).toEqual([...trialIds].sort());
    });

    it('2. Fisher-Yates produces no duplicate trial IDs', () => {
      const seed = 'test-seed-beta';
      const shuffled = seededFisherYatesShuffle(trialIds, seed);
      const unique = new Set(shuffled);

      expect(unique.size).toBe(trialIds.length);
    });

    it('3. Same seed produces identical order (deterministic & reproducible)', () => {
      const seed = 'deterministic-seed-42';
      const run1 = seededFisherYatesShuffle(trialIds, seed);
      const run2 = seededFisherYatesShuffle(trialIds, seed);
      const run3 = seededFisherYatesShuffle(trialIds, seed);

      expect(run1).toEqual(run2);
      expect(run2).toEqual(run3);
    });

    it('4. Different seeds can produce different orders', () => {
      const seed1 = 'seed-variation-001';
      const seed2 = 'seed-variation-999';

      const order1 = seededFisherYatesShuffle(trialIds, seed1);
      const order2 = seededFisherYatesShuffle(trialIds, seed2);

      // With 6 elements (720 permutations), different seeds should produce different orderings
      expect(order1).not.toEqual(order2);
    });

    it('5. Input array is not mutated', () => {
      const originalCopy = [...trialIds];
      const seed = 'mutation-check-seed';

      seededFisherYatesShuffle(trialIds, seed);

      expect(trialIds).toEqual(originalCopy);
    });

    it('6. Empty array works and returns empty array', () => {
      const empty: string[] = [];
      const shuffled = seededFisherYatesShuffle(empty, 'seed-empty');

      expect(shuffled).toEqual([]);
      expect(shuffled).not.toBe(empty); // new array instance
    });

    it('7. Single-trial array works and returns single element copy', () => {
      const single = ['only-trial'];
      const shuffled = seededFisherYatesShuffle(single, 'seed-single');

      expect(shuffled).toEqual(['only-trial']);
      expect(shuffled).not.toBe(single); // new array instance
    });

    it('8. generateRandomizationSeed produces 32-char hex string using CSPRNG', () => {
      const seed1 = generateRandomizationSeed();
      const seed2 = generateRandomizationSeed();

      expect(typeof seed1).toBe('string');
      expect(seed1).toMatch(/^[0-9a-f]{32}$/);
      expect(seed2).toMatch(/^[0-9a-f]{32}$/);
      expect(seed1).not.toBe(seed2);
    });

    it('9. Mulberry32 PRNG produces deterministic uniform distribution over [0, 1)', () => {
      const prng1 = createSeededPrng('test-prng-seed');
      const prng2 = createSeededPrng('test-prng-seed');

      const values1 = [prng1(), prng1(), prng1(), prng1()];
      const values2 = [prng2(), prng2(), prng2(), prng2()];

      expect(values1).toEqual(values2);
      for (const val of values1) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  // Helper to construct a 4-trial experiment payload
  function createMultiTrialExperiment(publicSlug: string, randomizationEnabled: boolean) {
    return {
      title: 'Four-Trial Stroop Task',
      description: 'Stroop color-word conflict study',
      publicSlug,
      generalInstructions: 'Press R for Red, G for Green, B for Blue, Y for Yellow.',
      completionMessage: 'Session completed successfully.',
      config: {
        displayMode: 'fullscreen',
        backgroundColor: '#000000',
        allowPause: false,
        showFeedback: true,
        randomization: {
          enabled: randomizationEnabled,
        },
      },
      trials: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          orderIndex: 1,
          label: 'RED_CONGRUENT',
          stimulus: {
            id: 'aaaa1111-1111-4111-8111-111111111111',
            type: 'text',
            content: 'RED',
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
            allowedKeys: ['KeyR', 'KeyG', 'KeyB', 'KeyY'],
            correctResponse: 'KeyR',
            evaluationMode: 'exact_match',
          },
          nextTrialId: '22222222-2222-4222-8222-222222222222',
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          orderIndex: 2,
          label: 'GREEN_INCONGRUENT',
          stimulus: {
            id: 'bbbb2222-2222-4222-8222-222222222222',
            type: 'text',
            content: 'GREEN',
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
            allowedKeys: ['KeyR', 'KeyG', 'KeyB', 'KeyY'],
            correctResponse: 'KeyG',
            evaluationMode: 'exact_match',
          },
          nextTrialId: '33333333-3333-4333-8333-333333333333',
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          orderIndex: 3,
          label: 'BLUE_CONGRUENT',
          stimulus: {
            id: 'cccc3333-3333-4333-8333-333333333333',
            type: 'text',
            content: 'BLUE',
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
            allowedKeys: ['KeyR', 'KeyG', 'KeyB', 'KeyY'],
            correctResponse: 'KeyB',
            evaluationMode: 'exact_match',
          },
          nextTrialId: '44444444-4444-4444-8444-444444444444',
        },
        {
          id: '44444444-4444-4444-8444-444444444444',
          orderIndex: 4,
          label: 'YELLOW_INCONGRUENT',
          stimulus: {
            id: 'dddd4444-4444-4444-8444-444444444444',
            type: 'text',
            content: 'YELLOW',
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
            allowedKeys: ['KeyR', 'KeyG', 'KeyB', 'KeyY'],
            correctResponse: 'KeyY',
            evaluationMode: 'exact_match',
          },
          nextTrialId: null,
        },
      ],
    };
  }

  // ==========================================
  // 2. Session Integration Tests
  // ==========================================
  describe('Session Creation and Trial Randomization Integration', () => {
    it('10. Randomization disabled executes trials in fixed linear order', async () => {
      // Create and publish experiment with randomization disabled
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .send(createMultiTrialExperiment('linear-study', false));
      expect(expRes.status).toBe(201);

      await request(app)
        .post(`/api/v1/experiments/${expRes.body.id}/publish`)
        .send();

      // Start participant session
      const sessionRes = await request(app)
        .post('/api/v1/participant/experiments/linear-study/sessions')
        .send();
      expect(sessionRes.status).toBe(201);

      // Verify Session in DB
      const sessionRecord = await prisma.session.findUnique({
        where: { id: sessionRes.body.sessionId },
      });
      expect(sessionRecord).not.null;
      expect(sessionRecord!.randomizationEnabled).toBe(false);
      expect(sessionRecord!.randomizationSeed).toBeNull();
      expect(sessionRecord!.trialOrder).toEqual([
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
        '44444444-4444-4444-8444-444444444444',
      ]);

      // First trial must be trial 1
      expect(sessionRes.body.firstTrial.id).toBe('11111111-1111-4111-8111-111111111111');
      expect(sessionRes.body.firstTrial.nextTrialId).toBe('22222222-2222-4222-8222-222222222222');
    });

    it('11. Randomization enabled stores seed and persisted randomized trial order', async () => {
      // Create and publish randomized experiment
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .send(createMultiTrialExperiment('randomized-study', true));
      expect(expRes.status).toBe(201);

      await request(app)
        .post(`/api/v1/experiments/${expRes.body.id}/publish`)
        .send();

      // Start session
      const sessionRes = await request(app)
        .post('/api/v1/participant/experiments/randomized-study/sessions')
        .send();
      expect(sessionRes.status).toBe(201);

      const sessionRecord = await prisma.session.findUnique({
        where: { id: sessionRes.body.sessionId },
      });
      expect(sessionRecord).not.null;
      expect(sessionRecord!.randomizationEnabled).toBe(true);
      expect(typeof sessionRecord!.randomizationSeed).toBe('string');
      expect(sessionRecord!.randomizationSeed).toHaveLength(32);

      const storedOrder = sessionRecord!.trialOrder as string[];
      expect(Array.isArray(storedOrder)).toBe(true);
      expect(storedOrder).toHaveLength(4);

      // Contains all 4 trial IDs
      expect([...storedOrder].sort()).toEqual([
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
        '44444444-4444-4444-8444-444444444444',
      ]);

      // Seed reproduces the exact trial order
      const originalIds = [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
        '44444444-4444-4444-8444-444444444444',
      ];
      const reproducedOrder = seededFisherYatesShuffle(originalIds, sessionRecord!.randomizationSeed!);
      expect(reproducedOrder).toEqual(storedOrder);

      // Returned first trial matches storedOrder[0]
      expect(sessionRes.body.firstTrial.id).toBe(storedOrder[0]);
      expect(sessionRes.body.firstTrial.nextTrialId).toBe(storedOrder[1]);
    });

    it('12. Execution engine traverses trials according to session-specific trialOrder', async () => {
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .send(createMultiTrialExperiment('exec-random-study', true));
      await request(app)
        .post(`/api/v1/experiments/${expRes.body.id}/publish`)
        .send();

      const sessionRes = await request(app)
        .post('/api/v1/participant/experiments/exec-random-study/sessions')
        .send();

      const sessionId = sessionRes.body.sessionId;
      const sessionRecord = await prisma.session.findUnique({ where: { id: sessionId } });
      const trialOrder = sessionRecord!.trialOrder as string[];

      // Step 1: GET /current-step
      const step1Res = await request(app)
        .get(`/api/v1/participant/sessions/${sessionId}/current-step`);
      expect(step1Res.status).toBe(200);
      expect(step1Res.body.currentTrial.id).toBe(trialOrder[0]);
      expect(step1Res.body.currentTrialIndex).toBe(0);

      // Step 1: Submit response
      const submit1 = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/${trialOrder[0]}/response`)
        .send({ submittedResponse: 'KeyR', reactionTimeMs: 450 });
      expect(submit1.status).toBe(200);
      expect(submit1.body.isCompleted).toBe(false);
      expect(submit1.body.nextTrial.id).toBe(trialOrder[1]);

      // Step 2: GET /current-step
      const step2Res = await request(app)
        .get(`/api/v1/participant/sessions/${sessionId}/current-step`);
      expect(step2Res.status).toBe(200);
      expect(step2Res.body.currentTrial.id).toBe(trialOrder[1]);
      expect(step2Res.body.currentTrialIndex).toBe(1);

      // Step 2: Submit response
      const submit2 = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/${trialOrder[1]}/response`)
        .send({ submittedResponse: 'KeyG', reactionTimeMs: 510 });
      expect(submit2.status).toBe(200);
      expect(submit2.body.nextTrial.id).toBe(trialOrder[2]);

      // Step 3: Submit response
      const submit3 = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/${trialOrder[2]}/response`)
        .send({ submittedResponse: 'KeyB', reactionTimeMs: 480 });
      expect(submit3.status).toBe(200);
      expect(submit3.body.nextTrial.id).toBe(trialOrder[3]);

      // Step 4 (Final): Submit response
      const submit4 = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/${trialOrder[3]}/response`)
        .send({ submittedResponse: 'KeyY', reactionTimeMs: 530 });
      expect(submit4.status).toBe(200);
      expect(submit4.body.isCompleted).toBe(true);
      expect(submit4.body.sessionStatus).toBe('COMPLETED');
      expect(submit4.body.nextTrial).toBeNull();

      // Verify session is marked completed in DB
      const finalSession = await prisma.session.findUnique({ where: { id: sessionId } });
      expect(finalSession!.status).toBe('COMPLETED');
      expect(finalSession!.completedAt).not.null;

      // Verify all responses were recorded with correct trial IDs in execution order
      const responses = await prisma.sessionResponse.findMany({
        where: { sessionId },
        orderBy: { submittedAt: 'asc' },
      });
      expect(responses).toHaveLength(4);
      expect(responses.map((r) => r.trialId)).toEqual(trialOrder);
    });

    it('13. Out-of-order submission fails with 400 when trial does not match active trial in trialOrder', async () => {
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .send(createMultiTrialExperiment('order-safety-study', true));
      await request(app)
        .post(`/api/v1/experiments/${expRes.body.id}/publish`)
        .send();

      const sessionRes = await request(app)
        .post('/api/v1/participant/experiments/order-safety-study/sessions')
        .send();

      const sessionId = sessionRes.body.sessionId;
      const sessionRecord = await prisma.session.findUnique({ where: { id: sessionId } });
      const trialOrder = sessionRecord!.trialOrder as string[];

      // Try to submit for trialOrder[1] when trialOrder[0] is active
      const invalidRes = await request(app)
        .post(`/api/v1/participant/sessions/${sessionId}/trials/${trialOrder[1]}/response`)
        .send({ submittedResponse: 'KeyG', reactionTimeMs: 400 });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error.code).toBe('INVALID_RESPONSE');
    });

    it('14. Two independently created sessions receive independently generated seeds', async () => {
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .send(createMultiTrialExperiment('two-sessions-study', true));
      await request(app)
        .post(`/api/v1/experiments/${expRes.body.id}/publish`)
        .send();

      const s1 = await request(app)
        .post('/api/v1/participant/experiments/two-sessions-study/sessions')
        .send();
      const s2 = await request(app)
        .post('/api/v1/participant/experiments/two-sessions-study/sessions')
        .send();

      const rec1 = await prisma.session.findUnique({ where: { id: s1.body.sessionId } });
      const rec2 = await prisma.session.findUnique({ where: { id: s2.body.sessionId } });

      expect(rec1!.randomizationSeed).not.toBeNull();
      expect(rec2!.randomizationSeed).not.toBeNull();
      expect(rec1!.randomizationSeed).not.toBe(rec2!.randomizationSeed);
    });
  });

  // ==========================================
  // 3. Snapshot Isolation Tests
  // ==========================================
  describe('Experiment Snapshot Isolation with Randomization', () => {
    it('15. Snapshot isolation is preserved across republications for randomized sessions', async () => {
      // 1. Create and publish Version 1
      const expRes = await request(app)
        .post('/api/v1/experiments')
        .send(createMultiTrialExperiment('isolation-study', true));
      const expId = expRes.body.id;

      await request(app)
        .post(`/api/v1/experiments/${expId}/publish`)
        .send();

      // 2. Start Session 1 on Version 1
      const s1Res = await request(app)
        .post('/api/v1/participant/experiments/isolation-study/sessions')
        .send();
      const s1Id = s1Res.body.sessionId;
      const s1Record = await prisma.session.findUnique({ where: { id: s1Id } });
      const s1TrialOrder = s1Record!.trialOrder as string[];
      const s1Seed = s1Record!.randomizationSeed;

      // 3. Republish experiment as Version 2 (draft modification)
      await request(app)
        .put(`/api/v1/experiments/${expId}`)
        .send({
          title: 'Modified Version 2 Study',
          description: 'Updated description for v2',
        });

      await request(app)
        .post(`/api/v1/experiments/${expId}/publish`)
        .send();

      // 4. Verify Session 1 is still locked to v1 snapshot and retains its original randomized order and seed
      const s1Step = await request(app)
        .get(`/api/v1/participant/sessions/${s1Id}/current-step`);
      expect(s1Step.status).toBe(200);
      expect(s1Step.body.experimentTitle).toBe('Four-Trial Stroop Task'); // v1 title, not v2!
      expect(s1Step.body.currentTrial.id).toBe(s1TrialOrder[0]);

      const s1RecordAfter = await prisma.session.findUnique({ where: { id: s1Id } });
      expect(s1RecordAfter!.experimentVersion).toBe(1);
      expect(s1RecordAfter!.randomizationSeed).toBe(s1Seed);
      expect(s1RecordAfter!.trialOrder).toEqual(s1TrialOrder);

      // Session 1 can still execute smoothly to completion
      const sub1 = await request(app)
        .post(`/api/v1/participant/sessions/${s1Id}/trials/${s1TrialOrder[0]}/response`)
        .send({ submittedResponse: 'KeyR', reactionTimeMs: 400 });
      expect(sub1.status).toBe(200);
      expect(sub1.body.nextTrial.id).toBe(s1TrialOrder[1]);
    });
  });
});
