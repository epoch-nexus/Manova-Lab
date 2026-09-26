import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/db/prisma.js';

const app = createApp();

describe('Researcher Experiments API (Phase 2)', () => {
  beforeEach(async () => {
    await prisma.experiment.deleteMany();
  });

  afterAll(async () => {
    await prisma.experiment.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /health', () => {
    it('should return operational health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'manova-labs-backend' });
    });
  });

  describe('POST /experiments (Create Experiment)', () => {
    it('should successfully create a new draft experiment with trials and stimuli', async () => {
      const payload = {
        title: 'Simple Visual Reaction Time Study',
        description: 'Measures human baseline motor response latency.',
        publicSlug: 'visual-rt-baseline',
        generalInstructions: 'Press the spacebar as fast as you can.',
        completionMessage: 'Thank you for participating!',
        config: {
          displayMode: 'fullscreen',
          backgroundColor: '#0F172A',
          allowPause: false,
          showFeedback: true,
        },
        trials: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            orderIndex: 1,
            label: 'Trial 1 - Target X',
            instructions: null,
            fixation: {
              enabled: true,
              durationMs: 750,
              symbol: '+',
              color: '#64748B',
              fontSize: '32px',
            },
            stimulus: {
              id: '22222222-2222-4222-8222-222222222222',
              type: 'text',
              content: 'X',
              styling: {
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#1E293B',
              },
            },
            timingConfig: {
              preStimulusDelayMs: 750,
              stimulusDurationMs: 2000,
              responseTimeoutMs: 3000,
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

      const res = await request(app)
        .post('/api/v1/experiments')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe(payload.title);
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.version).toBe(1);
      expect(res.body.publicSlug).toBe(payload.publicSlug);
    });

    it('should reject creation with malformed input (missing title and invalid slug)', async () => {
      const res = await request(app)
        .post('/api/v1/experiments')
        .send({
          title: '', // Too short
          description: '',
          publicSlug: 'INVALID SLUG WITH SPACES',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('INVALID_EXPERIMENT');
      expect(Array.isArray(res.body.error.details)).toBe(true);
    });

    it('should reject creation when duplicate publicSlug is provided', async () => {
      const payload = {
        title: 'Initial Experiment',
        description: 'First study',
        publicSlug: 'unique-study-slug',
      };

      const first = await request(app).post('/api/v1/experiments').send(payload);
      expect(first.status).toBe(201);

      const duplicate = await request(app).post('/api/v1/experiments').send(payload);
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.error.code).toBe('INVALID_EXPERIMENT');
    });
  });

  describe('GET /experiments (List Experiments)', () => {
    it('should retrieve list of all experiments with trial counts', async () => {
      await request(app).post('/api/v1/experiments').send({
        title: 'Study 1',
        description: 'Description 1',
        publicSlug: 'study-1',
      });

      await request(app).post('/api/v1/experiments').send({
        title: 'Study 2',
        description: 'Description 2',
        publicSlug: 'study-2',
      });

      const res = await request(app).get('/api/v1/experiments');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.experiments).toHaveLength(2);
      expect(res.body.experiments[0]).toHaveProperty('trialCount');
    });
  });

  describe('GET /experiments/:id (Get Single Experiment)', () => {
    it('should return full experiment with trials and stimuli', async () => {
      const created = await request(app)
        .post('/api/v1/experiments')
        .send({
          title: 'Single Retrieve Study',
          description: 'Desc',
          publicSlug: 'single-study',
          trials: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              orderIndex: 1,
              stimulus: {
                id: '44444444-4444-4444-8444-444444444444',
                type: 'text',
                content: 'Target Text',
              },
              timingConfig: {
                preStimulusDelayMs: 500,
                stimulusDurationMs: 1000,
                responseTimeoutMs: 2000,
                allowEarlyResponse: false,
                waitForResponse: false,
              },
              expectedResponse: {
                type: 'keypress',
                allowedKeys: ['KeyJ'],
                correctResponse: 'KeyJ',
                evaluationMode: 'exact_match',
              },
              nextTrialId: null,
            },
          ],
        });

      const res = await request(app).get(`/api/v1/experiments/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
      expect(res.body.trials).toHaveLength(1);
      expect(res.body.trials[0].stimulus.content).toBe('Target Text');
      expect(res.body.trials[0].expectedResponse.allowedKeys).toContain('KeyJ');
    });

    it('should return 404 EXPERIMENT_NOT_FOUND when requesting nonexistent ID', async () => {
      const res = await request(app).get('/api/v1/experiments/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('EXPERIMENT_NOT_FOUND');
    });
  });

  describe('PUT /experiments/:id (Update Experiment)', () => {
    it('should update experiment metadata and configuration', async () => {
      const created = await request(app).post('/api/v1/experiments').send({
        title: 'Original Title',
        description: 'Original Desc',
        publicSlug: 'original-slug',
      });

      const updated = await request(app)
        .put(`/api/v1/experiments/${created.body.id}`)
        .send({
          title: 'Revised Title',
          description: 'Updated Description',
        });

      expect(updated.status).toBe(200);
      expect(updated.body.title).toBe('Revised Title');

      const fetched = await request(app).get(`/api/v1/experiments/${created.body.id}`);
      expect(fetched.body.title).toBe('Revised Title');
      expect(fetched.body.description).toBe('Updated Description');
    });

    it('should return 404 when updating nonexistent experiment', async () => {
      const res = await request(app)
        .put('/api/v1/experiments/00000000-0000-0000-0000-000000000000')
        .send({ title: 'New Title' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('EXPERIMENT_NOT_FOUND');
    });
  });

  describe('DELETE /experiments/:id (Delete Experiment)', () => {
    it('should delete an experiment and cascade delete its trials', async () => {
      const created = await request(app).post('/api/v1/experiments').send({
        title: 'To Be Deleted',
        description: 'Desc',
        publicSlug: 'to-delete',
      });

      const del = await request(app).delete(`/api/v1/experiments/${created.body.id}`);
      expect(del.status).toBe(204);

      const check = await request(app).get(`/api/v1/experiments/${created.body.id}`);
      expect(check.status).toBe(404);
    });

    it('should return 404 when deleting nonexistent experiment', async () => {
      const res = await request(app).delete('/api/v1/experiments/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('EXPERIMENT_NOT_FOUND');
    });
  });

  describe('POST /experiments/:id/publish (Publish Experiment & Version Snapshot)', () => {
    it('should successfully publish a valid, complete experiment and create a version snapshot', async () => {
      // 1. Create complete 2-trial experiment
      const created = await request(app)
        .post('/api/v1/experiments')
        .send({
          title: 'Publishable Visual RT Experiment',
          description: 'Valid study ready to publish.',
          publicSlug: 'publishable-study',
          trials: [
            {
              id: '55555555-5555-4555-8555-555555555555',
              orderIndex: 1,
              stimulus: {
                id: '66666666-6666-4666-8666-666666666666',
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
              nextTrialId: '77777777-7777-4777-8777-777777777777',
            },
            {
              id: '77777777-7777-4777-8777-777777777777',
              orderIndex: 2,
              stimulus: {
                id: '88888888-8888-4888-8888-888888888888',
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
                allowedKeys: ['KeyG', 'KeyR'],
                correctResponse: 'KeyR',
                evaluationMode: 'exact_match',
              },
              nextTrialId: null, // Terminal trial
            },
          ],
        });

      // 2. Publish
      const pubRes = await request(app).post(`/api/v1/experiments/${created.body.id}/publish`);
      expect(pubRes.status).toBe(200);
      expect(pubRes.body.status).toBe('PUBLISHED');
      expect(pubRes.body.version).toBe(1);
      expect(pubRes.body.publicSlug).toBe('publishable-study');
      expect(pubRes.body).toHaveProperty('publishedAt');

      // 3. Verify snapshot persisted in database
      const versionRecord = await prisma.experimentVersion.findUnique({
        where: { snapshotId: `snap_${created.body.id}_v1` },
      });
      expect(versionRecord).not.toBeNull();
      expect(versionRecord?.version).toBe(1);
      expect((versionRecord?.snapshotData as any).trials).toHaveLength(2);

      // 4. Verify experiment status is updated in db
      const expInDb = await prisma.experiment.findUnique({ where: { id: created.body.id } });
      expect(expInDb?.status).toBe('PUBLISHED');
      expect(expInDb?.publishedAt).not.toBeNull();
    });

    it('should reject publish with 422 VALIDATION_ERROR when experiment has zero trials', async () => {
      const emptyExp = await request(app).post('/api/v1/experiments').send({
        title: 'Empty Experiment Without Trials',
        description: 'Has no trials',
        publicSlug: 'empty-no-trials',
      });

      const res = await request(app).post(`/api/v1/experiments/${emptyExp.body.id}/publish`);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('at least one trial');
    });

    it('should reject publish when trial references a nonexistent nextTrialId', async () => {
      const brokenPointerExp = await request(app)
        .post('/api/v1/experiments')
        .send({
          title: 'Broken Pointer Experiment',
          description: 'Has dangling pointer',
          publicSlug: 'broken-pointer-study',
        });

      // Bypass create validation directly in DB to simulate invalid legacy/draft state
      await prisma.trial.create({
        data: {
          id: '99999999-9999-4999-8999-999999999999',
          orderIndex: 1,
          timingConfig: {
            preStimulusDelayMs: 500,
            stimulusDurationMs: 1000,
            responseTimeoutMs: 2000,
            allowEarlyResponse: false,
            waitForResponse: false,
          },
          nextTrialId: '00000000-9999-9999-9999-000000000000', // Does not exist
          experimentId: brokenPointerExp.body.id,
          stimulus: {
            create: {
              id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              type: 'text',
              content: 'Stimulus',
            },
          },
          expectedResponse: {
            create: {
              type: 'keypress',
              allowedKeys: ['Space'],
              correctResponse: 'Space',
              evaluationMode: 'exact_match',
            },
          },
        },
      });

      const res = await request(app).post(`/api/v1/experiments/${brokenPointerExp.body.id}/publish`);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('does not exist in this experiment');
    });

    it('should reject publish when experiment has no terminal trial (all trials loop)', async () => {
      const loopingExp = await request(app)
        .post('/api/v1/experiments')
        .send({
          title: 'Looping Experiment',
          description: 'No terminal trial',
          publicSlug: 'looping-study',
        });

      // Insert trial pointing to itself without terminal trial
      await prisma.trial.create({
        data: {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          orderIndex: 1,
          timingConfig: {
            preStimulusDelayMs: 500,
            stimulusDurationMs: 1000,
            responseTimeoutMs: 2000,
            allowEarlyResponse: false,
            waitForResponse: false,
          },
          nextTrialId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', // Self-loop, no null
          experimentId: loopingExp.body.id,
          stimulus: {
            create: {
              id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
              type: 'text',
              content: 'Loop Stimulus',
            },
          },
          expectedResponse: {
            create: {
              type: 'keypress',
              allowedKeys: ['Space'],
              evaluationMode: 'exact_match',
            },
          },
        },
      });

      const res = await request(app).post(`/api/v1/experiments/${loopingExp.body.id}/publish`);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('at least one terminal trial');
    });
  });
});
