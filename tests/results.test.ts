import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/db/prisma.js';
import { createTestResearcher } from './helpers/auth.js';
import type { Application } from 'express';

describe('Phase 5 Results Aggregation, Analytics & Data Export', () => {
  let app: Application;
  let authHeader: { Authorization: string };
  let experimentIdA: string;
  let experimentIdB: string;
  let trial1IdA: string;
  let trial2IdA: string;
  let session1Id: string;
  let session2Id: string;

  beforeAll(async () => {
    app = createApp();

    // Clean up test data if any
    await prisma.sessionResponse.deleteMany();
    await prisma.session.deleteMany();
    await prisma.experimentVersion.deleteMany();
    await prisma.expectedResponse.deleteMany();
    await prisma.stimulus.deleteMany();
    await prisma.trial.deleteMany();
    await prisma.experiment.deleteMany();
    await prisma.researcher.deleteMany();

    const researcher = await createTestResearcher(app, 'results-suite@test.com');
    authHeader = researcher.authHeader;

    // 1. Create Experiment A with 2 trials
    trial1IdA = '11111111-1111-4111-8111-111111111111';
    trial2IdA = '22222222-2222-4222-8222-222222222222';

    const expARes = await request(app)
      .post('/api/v1/experiments')
      .set(authHeader)
      .send({
        title: 'Results Test Experiment A',
        description: 'Testing results aggregation',
        publicSlug: 'results-exp-a',
        config: {
          displayMode: 'fullscreen',
          backgroundColor: '#FFFFFF',
          allowPause: false,
          showFeedback: true,
        },
        trials: [
          {
            id: trial1IdA,
            orderIndex: 1,
            stimulus: { id: '33333333-3333-4333-8333-333333333333', type: 'text', content: 'X' },
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
            nextTrialId: trial2IdA,
            branching: null,
          },
          {
            id: trial2IdA,
            orderIndex: 2,
            stimulus: { id: '44444444-4444-4444-8444-444444444444', type: 'text', content: 'O' },
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
      });

    experimentIdA = expARes.body.id;

    // Publish Experiment A
    await request(app)
      .post(`/api/v1/experiments/${experimentIdA}/publish`)
      .set(authHeader);

    // 2. Create Experiment B (for isolation tests)
    const expBRes = await request(app)
      .post('/api/v1/experiments')
      .set(authHeader)
      .send({
        title: 'Results Test Experiment B',
        description: 'Testing isolation',
        publicSlug: 'results-exp-b',
        config: {
          displayMode: 'windowed',
          backgroundColor: '#000000',
          allowPause: false,
          showFeedback: false,
        },
        trials: [
          {
            id: '55555555-5555-4555-8555-555555555555',
            orderIndex: 1,
            stimulus: { id: '66666666-6666-4666-8666-666666666666', type: 'text', content: 'Z' },
            timingConfig: {
              preStimulusDelayMs: 100,
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
      });

    experimentIdB = expBRes.body.id;
    await request(app)
      .post(`/api/v1/experiments/${experimentIdB}/publish`)
      .set(authHeader);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ========================================================
  // 1. Empty Results Handling
  // ========================================================
  it('should return empty results and clean null statistics for experiment with no responses', async () => {
    const rawRes = await request(app)
      .get(`/api/v1/experiments/${experimentIdB}/results`)
      .set(authHeader);
    expect(rawRes.status).toBe(200);
    expect(rawRes.body.experimentId).toBe(experimentIdB);
    expect(rawRes.body.total).toBe(0);
    expect(rawRes.body.results).toEqual([]);

    const summaryRes = await request(app)
      .get(`/api/v1/experiments/${experimentIdB}/results/summary`)
      .set(authHeader);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.experimentId).toBe(experimentIdB);
    expect(summaryRes.body.totalSessions).toBe(0);
    expect(summaryRes.body.completedSessions).toBe(0);
    expect(summaryRes.body.totalResponses).toBe(0);
    expect(summaryRes.body.responseRate).toBeNull();
    expect(summaryRes.body.accuracyRate).toBeNull();
    expect(summaryRes.body.meanReactionTimeMs).toBeNull();
    expect(summaryRes.body.medianReactionTimeMs).toBeNull();
    expect(summaryRes.body.minReactionTimeMs).toBeNull();
    expect(summaryRes.body.maxReactionTimeMs).toBeNull();
    expect(summaryRes.body.standardDeviationReactionTimeMs).toBeNull();
  });

  // ========================================================
  // 2. Data Population & Execution
  // ========================================================
  it('should collect responses from participant sessions with timing telemetry and correctness', async () => {
    // Session 1: Both trials responded with valid RTs
    const s1Res = await request(app).post('/api/v1/participant/experiments/results-exp-a/sessions');
    session1Id = s1Res.body.sessionId;

    // Trial 1: RT = 200 ms, correct = true
    const resp1 = await request(app)
      .post(`/api/v1/participant/sessions/${session1Id}/trials/${trial1IdA}/response`)
      .send({
        submittedResponse: 'Space',
        reactionTimeMs: 200.0,
        timedOut: false,
        timingMeasurement: {
          stimulusOnsetTimestamp: 1000.0,
          responseTimestamp: 1200.0,
          calculatedLatencyMs: 200.0,
          hardwarePrecision: {
            timingMethod: 'requestAnimationFrame',
            displayRefreshRateEstimateHz: 60,
            hiddenTabDetected: false,
          },
        },
      });
    expect(resp1.status).toBe(200);
    expect(resp1.body.isCorrect).toBe(true);

    // Trial 2: RT = 300 ms, correct = true
    const resp2 = await request(app)
      .post(`/api/v1/participant/sessions/${session1Id}/trials/${trial2IdA}/response`)
      .send({
        submittedResponse: 'Space',
        reactionTimeMs: 300.0,
        timedOut: false,
        timingMeasurement: {
          stimulusOnsetTimestamp: 2000.0,
          responseTimestamp: 2300.0,
          calculatedLatencyMs: 300.0,
          hardwarePrecision: {
            timingMethod: 'requestAnimationFrame',
            displayRefreshRateEstimateHz: 60,
            hiddenTabDetected: false,
          },
        },
      });
    expect(resp2.status).toBe(200);
    expect(resp2.body.isCompleted).toBe(true);
    expect(resp2.body.isCorrect).toBe(true);

    // Session 2: Trial 1 responded (RT = 250 ms), Trial 2 timed out
    const s2Res = await request(app).post('/api/v1/participant/experiments/results-exp-a/sessions');
    session2Id = s2Res.body.sessionId;

    // Trial 1: RT = 250 ms, correct = true
    const s2Resp1 = await request(app)
      .post(`/api/v1/participant/sessions/${session2Id}/trials/${trial1IdA}/response`)
      .send({
        submittedResponse: 'Space',
        reactionTimeMs: 250.0,
        timedOut: false,
        timingMeasurement: {
          stimulusOnsetTimestamp: 3000.0,
          responseTimestamp: 3250.0,
          calculatedLatencyMs: 250.0,
          hardwarePrecision: {
            timingMethod: 'requestAnimationFrame',
            displayRefreshRateEstimateHz: 60,
            hiddenTabDetected: true,
          },
        },
      });
    expect(s2Resp1.status).toBe(200);
    expect(s2Resp1.body.isCorrect).toBe(true);

    // Trial 2: Timed out (submittedResponse: null, timedOut: true)
    const s2Resp2 = await request(app)
      .post(`/api/v1/participant/sessions/${session2Id}/trials/${trial2IdA}/response`)
      .send({
        submittedResponse: null,
        reactionTimeMs: null,
        timedOut: true,
      });
    expect(s2Resp2.status).toBe(200);
    expect(s2Resp2.body.isCorrect).toBe(false); // timeout evaluated as incorrect
    expect(s2Resp2.body.isCompleted).toBe(true);
  });

  // ========================================================
  // 3. Raw Results Retrieval & Filtering
  // ========================================================
  it('should retrieve raw results and support filtering by session, trial, and timeout status', async () => {
    // All results for Experiment A (4 total)
    const allRes = await request(app)
      .get(`/api/v1/experiments/${experimentIdA}/results`)
      .set(authHeader);
    expect(allRes.status).toBe(200);
    expect(allRes.body.total).toBe(4);
    expect(allRes.body.results).toHaveLength(4);

    // Filter by sessionId
    const s1Only = await request(app)
      .get(`/api/v1/experiments/${experimentIdA}/results?sessionId=${session1Id}`)
      .set(authHeader);
    expect(s1Only.status).toBe(200);
    expect(s1Only.body.total).toBe(2);
    expect(s1Only.body.results.every((r: any) => r.sessionId === session1Id)).toBe(true);

    // Filter by trialId
    const t1Only = await request(app)
      .get(`/api/v1/experiments/${experimentIdA}/results?trialId=${trial1IdA}`)
      .set(authHeader);
    expect(t1Only.status).toBe(200);
    expect(t1Only.body.total).toBe(2);
    expect(t1Only.body.results.every((r: any) => r.trialId === trial1IdA)).toBe(true);

    // Filter by timedOut=true
    const timeoutOnly = await request(app)
      .get(`/api/v1/experiments/${experimentIdA}/results?timedOut=true`)
      .set(authHeader);
    expect(timeoutOnly.status).toBe(200);
    expect(timeoutOnly.body.total).toBe(1);
    expect(timeoutOnly.body.results[0].timedOut).toBe(true);
    expect(timeoutOnly.body.results[0].sessionId).toBe(session2Id);
  });

  // ========================================================
  // 4. Statistical Summary Aggregation
  // ========================================================
  it('should compute exact statistical aggregations at experiment-level', async () => {
    const summaryRes = await request(app)
      .get(`/api/v1/experiments/${experimentIdA}/results/summary`)
      .set(authHeader);
    expect(summaryRes.status).toBe(200);
    const s = summaryRes.body;

    expect(s.totalSessions).toBe(2);
    expect(s.completedSessions).toBe(2);
    expect(s.abandonedSessions).toBe(0);
    expect(s.totalResponses).toBe(4);
    expect(s.totalTimeouts).toBe(1);

    // responseRate = non-timeout responses / total response records = (4 - 1) / 4 = 0.75
    expect(s.responseRate).toBe(0.75);

    // Accuracy: 3 correct, 1 incorrect = 3 / 4 = 0.75
    expect(s.correctResponses).toBe(3);
    expect(s.incorrectResponses).toBe(1);
    expect(s.accuracyRate).toBe(0.75);

    // Valid RTs: [200, 250, 300]
    expect(s.minReactionTimeMs).toBe(200);
    expect(s.maxReactionTimeMs).toBe(300);
    expect(s.meanReactionTimeMs).toBe(250);
    expect(s.medianReactionTimeMs).toBe(250);

    // Sample StdDev: sqrt(((200-250)^2 + (250-250)^2 + (300-250)^2) / 2) = sqrt(5000 / 2) = 50.0
    expect(s.standardDeviationReactionTimeMs).toBe(50);
  });

  // ========================================================
  // 5. Trial-Level Summary Aggregation
  // ========================================================
  it('should compute trial-level summary when ?trialId=... is supplied', async () => {
    const trialSummaryRes = await request(app)
      .get(`/api/v1/experiments/${experimentIdA}/results/summary?trialId=${trial1IdA}`)
      .set(authHeader);
    expect(trialSummaryRes.status).toBe(200);
    const s = trialSummaryRes.body;

    expect(s.trialId).toBe(trial1IdA);
    expect(s.totalResponses).toBe(2);
    expect(s.totalTimeouts).toBe(0);
    expect(s.responseRate).toBe(1.0);
    expect(s.accuracyRate).toBe(1.0);

    // Valid RTs on Trial 1: [200, 250] -> Mean = 225, Median = 225
    expect(s.meanReactionTimeMs).toBe(225);
    expect(s.medianReactionTimeMs).toBe(225);
    expect(s.minReactionTimeMs).toBe(200);
    expect(s.maxReactionTimeMs).toBe(250);
  });

  // ========================================================
  // 6. JSON Export
  // ========================================================
  it('should export complete structured JSON with proper attachment headers', async () => {
    const exportRes = await request(app)
      .get(`/api/v1/experiments/${experimentIdA}/results/export.json`)
      .set(authHeader);
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toContain('application/json');
    expect(exportRes.headers['content-disposition']).toContain(
      `attachment; filename="experiment_${experimentIdA}_results.json"`
    );
    expect(exportRes.body.experimentId).toBe(experimentIdA);
    expect(exportRes.body.totalResults).toBe(4);
    expect(exportRes.body.results).toHaveLength(4);
    expect(exportRes.body.results[0]).toHaveProperty('timingMeasurement');
  });

  // ========================================================
  // 7. CSV Export
  // ========================================================
  it('should export valid RFC 4180 CSV without participantId and with proper escaping', async () => {
    const csvRes = await request(app)
      .get(`/api/v1/experiments/${experimentIdA}/results/export.csv`)
      .set(authHeader);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.headers['content-disposition']).toContain(
      `attachment; filename="experiment_${experimentIdA}_results.csv"`
    );

    const csvText: string = csvRes.text;
    const lines = csvText.trim().split('\r\n');
    expect(lines.length).toBe(5); // 1 header + 4 data rows

    const header = lines[0]!;
    // Explicit User Adjustment: participantId must NOT be in the CSV
    expect(header).not.toContain('participantId');

    // Expected columns:
    expect(header).toBe(
      'sessionId,experimentId,experimentVersion,trialId,submittedResponse,isCorrect,reactionTimeMs,timedOut,stimulusOnsetTimestamp,responseTimestamp,timingMethod,displayRefreshRateEstimateHz,hiddenTabDetected,submittedAt'
    );

    // Verify first row contains session1Id and RT 200
    const row1 = lines[1]!;
    expect(row1).toContain(session1Id);
    expect(row1).toContain('Space');
    expect(row1).toContain('200');
    expect(row1).toContain('requestAnimationFrame');

    // Verify timeout row contains timedOut = true and empty RT
    const timeoutRow = lines.find((l) => l.includes('true') && l.includes(session2Id) && l.includes(trial2IdA));
    expect(timeoutRow).toBeDefined();
    expect(timeoutRow).toContain(',true,'); // timedOut is true
  });

  // ========================================================
  // 8. Experiment Isolation & Error Cases
  // ========================================================
  it('should isolate results between different experiments', async () => {
    const expBRes = await request(app)
      .get(`/api/v1/experiments/${experimentIdB}/results`)
      .set(authHeader);
    expect(expBRes.status).toBe(200);
    expect(expBRes.body.total).toBe(0);
    expect(expBRes.body.results).toEqual([]);
  });

  it('should return 404 EXPERIMENT_NOT_FOUND when querying results for non-existent experiment', async () => {
    const res = await request(app)
      .get('/api/v1/experiments/00000000-0000-0000-0000-000000000000/results')
      .set(authHeader);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EXPERIMENT_NOT_FOUND');
  });
});
