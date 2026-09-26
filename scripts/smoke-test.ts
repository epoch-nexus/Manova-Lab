import 'dotenv/config';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/db/prisma.js';
import type { Server } from 'http';

async function runSmokeTests() {
  console.log('--- Starting Comprehensive API & Execution Engine Live Smoke Test Suite ---');
  const app = createApp();
  const port = 3099;

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(port, () => resolve(s));
  });

  const baseUrl = `http://localhost:${port}`;

  try {
    // 0. Clean DB
    await prisma.sessionResponse.deleteMany();
    await prisma.session.deleteMany();
    await prisma.experimentVersion.deleteMany();
    await prisma.experiment.deleteMany();

    // 1. Healthcheck
    console.log('[1/12] Testing GET /health');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthBody = await healthRes.json();
    console.log('  Status:', healthRes.status, JSON.stringify(healthBody));
    if (healthRes.status !== 200 || healthBody.status !== 'ok') throw new Error('Healthcheck failed');

    // 2. Create Experiment (POST /api/v1/experiments)
    console.log('[2/12] Testing POST /api/v1/experiments (2-trial study)');
    const trial1Id = '11111111-1111-4111-8111-111111111111';
    const trial2Id = '22222222-2222-4222-8222-222222222222';
    const stim1Id = '33333333-3333-4333-8333-333333333333';
    const stim2Id = '44444444-4444-4444-8444-444444444444';

    const createPayload = {
      title: 'Smoke Test Reaction Time Study',
      description: 'Verifies live HTTP server routing, persistence, and execution engine.',
      publicSlug: 'smoke-test-rt',
      generalInstructions: 'Press Space when ready.',
      completionMessage: 'Smoke test study successfully completed!',
      config: {
        displayMode: 'fullscreen',
        backgroundColor: '#0F172A',
        allowPause: false,
        showFeedback: true,
      },
      trials: [
        {
          id: trial1Id,
          orderIndex: 1,
          label: 'Trial 1',
          instructions: null,
          fixation: {
            enabled: true,
            durationMs: 500,
            symbol: '+',
          },
          stimulus: {
            id: stim1Id,
            type: 'text',
            content: 'FIRST_STIMULUS',
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
            allowedKeys: ['Space', 'KeyF'],
            correctResponse: 'Space',
            evaluationMode: 'exact_match',
          },
          nextTrialId: trial2Id,
        },
        {
          id: trial2Id,
          orderIndex: 2,
          label: 'Trial 2',
          instructions: null,
          fixation: {
            enabled: true,
            durationMs: 500,
            symbol: '+',
          },
          stimulus: {
            id: stim2Id,
            type: 'text',
            content: 'SECOND_STIMULUS',
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
          nextTrialId: null, // Terminal trial
        },
      ],
    };

    const createRes = await fetch(`${baseUrl}/api/v1/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload),
    });
    const createdExp = await createRes.json();
    console.log('  Status:', createRes.status, `ID: ${createdExp.id}, Slug: ${createdExp.publicSlug}`);
    if (createRes.status !== 201 || !createdExp.id) throw new Error('Create experiment failed');

    const expId = createdExp.id;

    // 3. Publish Experiment (POST /api/v1/experiments/:id/publish)
    console.log(`[3/12] Testing POST /api/v1/experiments/${expId}/publish`);
    const pubRes = await fetch(`${baseUrl}/api/v1/experiments/${expId}/publish`, {
      method: 'POST',
    });
    const pubBody = await pubRes.json();
    console.log('  Status:', pubRes.status, JSON.stringify(pubBody));
    if (pubRes.status !== 200 || pubBody.status !== 'PUBLISHED') throw new Error('Publish experiment failed');

    // 4. Start Participant Session (POST /api/v1/participant/experiments/:publicSlug/sessions)
    console.log('[4/12] Testing POST /api/v1/participant/experiments/smoke-test-rt/sessions');
    const startRes = await fetch(`${baseUrl}/api/v1/participant/experiments/smoke-test-rt/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientEnvironment: { browser: 'Chrome', os: 'macOS' },
      }),
    });
    const sessionData = await startRes.json();
    console.log('  Status:', startRes.status, `SessionID: ${sessionData.sessionId}, FirstTrial: ${sessionData.firstTrial?.id}`);
    if (startRes.status !== 201 || !sessionData.sessionId) throw new Error('Start session failed');

    const sessionId = sessionData.sessionId;

    // 5. Get Current Step (GET /api/v1/participant/sessions/:sessionId)
    console.log(`[5/12] Testing GET /api/v1/participant/sessions/${sessionId}`);
    const step1Res = await fetch(`${baseUrl}/api/v1/participant/sessions/${sessionId}`);
    const step1Data = await step1Res.json();
    console.log('  Status:', step1Res.status, `CurrentTrial: ${step1Data.currentTrial?.id}, State: ${step1Data.executionState}`);
    if (step1Res.status !== 200 || step1Data.currentTrial?.id !== trial1Id) throw new Error('Get current step failed');

    // 6. Submit Response for Trial 1 (POST /api/v1/participant/sessions/:sessionId/trials/:trialId/response)
    console.log(`[6/12] Testing POST response for Trial 1`);
    const resp1Res = await fetch(`${baseUrl}/api/v1/participant/sessions/${sessionId}/trials/${trial1Id}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submittedResponse: 'Space' }),
    });
    const resp1Data = await resp1Res.json();
    console.log('  Status:', resp1Res.status, `Status: ${resp1Data.sessionStatus}, NextTrial: ${resp1Data.nextTrial?.id}`);
    if (resp1Res.status !== 200 || resp1Data.nextTrial?.id !== trial2Id || resp1Data.isCompleted !== false) {
      throw new Error('Trial 1 response submission failed');
    }

    // 7. Get Next Step (GET /api/v1/participant/sessions/:sessionId)
    console.log(`[7/12] Testing GET /api/v1/participant/sessions/${sessionId} (on Trial 2)`);
    const step2Res = await fetch(`${baseUrl}/api/v1/participant/sessions/${sessionId}`);
    const step2Data = await step2Res.json();
    console.log('  Status:', step2Res.status, `CurrentTrial: ${step2Data.currentTrial?.id}`);
    if (step2Res.status !== 200 || step2Data.currentTrial?.id !== trial2Id) throw new Error('Get step 2 failed');

    // 8. Submit Final Response for Trial 2 -> Transitions to COMPLETE
    console.log(`[8/12] Testing POST response for Terminal Trial 2`);
    const resp2Res = await fetch(`${baseUrl}/api/v1/participant/sessions/${sessionId}/trials/${trial2Id}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submittedResponse: 'Space' }),
    });
    const resp2Data = await resp2Res.json();
    console.log('  Status:', resp2Res.status, `Status: ${resp2Data.sessionStatus}, isCompleted: ${resp2Data.isCompleted}`);
    if (resp2Res.status !== 200 || resp2Data.sessionStatus !== 'COMPLETED' || resp2Data.isCompleted !== true) {
      throw new Error('Terminal trial completion failed');
    }

    // 9. Error Case: Access Nonexistent Session (GET /api/v1/participant/sessions/sess_fake -> 404)
    console.log('[9/12] Testing 404 SESSION_NOT_FOUND error case');
    const badSessRes = await fetch(`${baseUrl}/api/v1/participant/sessions/sess_nonexistent`);
    const badSessBody = await badSessRes.json();
    console.log('  Status:', badSessRes.status, JSON.stringify(badSessBody));
    if (badSessRes.status !== 404 || badSessBody.error.code !== 'SESSION_NOT_FOUND') {
      throw new Error('404 session test failed');
    }

    // 10. Error Case: Submit Disallowed Key (POST ... -> 400 INVALID_RESPONSE)
    console.log('[10/12] Testing 400 INVALID_RESPONSE (Disallowed key)');
    // Start fresh session to test bad key
    const freshStart = await fetch(`${baseUrl}/api/v1/participant/experiments/smoke-test-rt/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const freshSession = await freshStart.json();
    const badKeyRes = await fetch(`${baseUrl}/api/v1/participant/sessions/${freshSession.sessionId}/trials/${trial1Id}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submittedResponse: 'KeyZ' }), // Not allowed
    });
    const badKeyBody = await badKeyRes.json();
    console.log('  Status:', badKeyRes.status, JSON.stringify(badKeyBody));
    if (badKeyRes.status !== 400 || badKeyBody.error.code !== 'INVALID_RESPONSE') {
      throw new Error('400 bad key test failed');
    }

    // 11. Error Case: Submit Wrong Trial ID (Stale response)
    console.log('[11/12] Testing 400 INVALID_RESPONSE (Wrong/stale trial ID)');
    const wrongTrialRes = await fetch(`${baseUrl}/api/v1/participant/sessions/${freshSession.sessionId}/trials/${trial2Id}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submittedResponse: 'Space' }), // Currently on trial 1, sending trial 2
    });
    const wrongTrialBody = await wrongTrialRes.json();
    console.log('  Status:', wrongTrialRes.status, JSON.stringify(wrongTrialBody));
    if (wrongTrialRes.status !== 400 || wrongTrialBody.error.code !== 'INVALID_RESPONSE') {
      throw new Error('400 wrong trial test failed');
    }

    // 12. Error Case: Response After Session Completion
    console.log('[12/12] Testing 409 SESSION_ALREADY_COMPLETED');
    const afterCompleteRes = await fetch(`${baseUrl}/api/v1/participant/sessions/${sessionId}/trials/${trial2Id}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submittedResponse: 'Space' }),
    });
    const afterCompleteBody = await afterCompleteRes.json();
    console.log('  Status:', afterCompleteRes.status, JSON.stringify(afterCompleteBody));
    if (afterCompleteRes.status !== 409 || afterCompleteBody.error.code !== 'SESSION_ALREADY_COMPLETED') {
      throw new Error('409 session completed test failed');
    }

    console.log('--- ALL 12 LIVE SMOKE TESTS PASSED CLEANLY! ---');
  } finally {
    await prisma.sessionResponse.deleteMany();
    await prisma.session.deleteMany();
    await prisma.experimentVersion.deleteMany();
    await prisma.experiment.deleteMany();
    await prisma.$disconnect();
    server.close();
  }
}

runSmokeTests().catch((err) => {
  console.error('Smoke tests failed:', err);
  process.exit(1);
});
