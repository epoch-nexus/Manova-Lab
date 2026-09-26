import 'dotenv/config';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/db/prisma.js';
import type { Server } from 'http';

async function runSmokeTests() {
  console.log('--- Starting API Live Smoke Test Suite ---');
  const app = createApp();
  const port = 3099;

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(port, () => resolve(s));
  });

  const baseUrl = `http://localhost:${port}`;

  try {
    // 0. Clean DB
    await prisma.experiment.deleteMany();

    // 1. Healthcheck
    console.log('[1/9] Testing GET /health');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthBody = await healthRes.json();
    console.log('  Status:', healthRes.status, JSON.stringify(healthBody));
    if (healthRes.status !== 200 || healthBody.status !== 'ok') throw new Error('Healthcheck failed');

    // 2. Create Experiment (POST /api/v1/experiments)
    console.log('[2/9] Testing POST /api/v1/experiments');
    const createPayload = {
      title: 'Smoke Test Reaction Time Study',
      description: 'Verifies live HTTP server routing and persistence.',
      publicSlug: 'smoke-test-rt',
      generalInstructions: 'Press Space when ready.',
      completionMessage: 'Done!',
      config: {
        displayMode: 'fullscreen',
        backgroundColor: '#0F172A',
        allowPause: false,
        showFeedback: true,
      },
      trials: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          orderIndex: 1,
          label: 'Trial 1',
          instructions: null,
          fixation: {
            enabled: true,
            durationMs: 500,
            symbol: '+',
          },
          stimulus: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            type: 'text',
            content: 'TARGET',
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
    };

    const createRes = await fetch(`${baseUrl}/api/v1/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload),
    });
    const createdExp = await createRes.json();
    console.log('  Status:', createRes.status, JSON.stringify(createdExp));
    if (createRes.status !== 201 || !createdExp.id) throw new Error('Create experiment failed');

    const expId = createdExp.id;

    // 3. List Experiments (GET /api/v1/experiments)
    console.log('[3/9] Testing GET /api/v1/experiments');
    const listRes = await fetch(`${baseUrl}/api/v1/experiments`);
    const listBody = await listRes.json();
    console.log('  Status:', listRes.status, `Count: ${listBody.total}`);
    if (listRes.status !== 200 || listBody.total !== 1) throw new Error('List experiments failed');

    // 4. Get Experiment by ID (GET /api/v1/experiments/:id)
    console.log(`[4/9] Testing GET /api/v1/experiments/${expId}`);
    const getRes = await fetch(`${baseUrl}/api/v1/experiments/${expId}`);
    const getBody = await getRes.json();
    console.log('  Status:', getRes.status, `Title: "${getBody.title}", Trials: ${getBody.trials?.length}`);
    if (getRes.status !== 200 || getBody.trials?.length !== 1) throw new Error('Get experiment failed');

    // 5. Update Experiment (PUT /api/v1/experiments/:id)
    console.log(`[5/9] Testing PUT /api/v1/experiments/${expId}`);
    const updateRes = await fetch(`${baseUrl}/api/v1/experiments/${expId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Smoke Test Reaction Time Study - Revised' }),
    });
    const updateBody = await updateRes.json();
    console.log('  Status:', updateRes.status, JSON.stringify(updateBody));
    if (updateRes.status !== 200 || updateBody.title !== 'Smoke Test Reaction Time Study - Revised') {
      throw new Error('Update experiment failed');
    }

    // 6. Publish Experiment (POST /api/v1/experiments/:id/publish)
    console.log(`[6/9] Testing POST /api/v1/experiments/${expId}/publish`);
    const pubRes = await fetch(`${baseUrl}/api/v1/experiments/${expId}/publish`, {
      method: 'POST',
    });
    const pubBody = await pubRes.json();
    console.log('  Status:', pubRes.status, JSON.stringify(pubBody));
    if (pubRes.status !== 200 || pubBody.status !== 'PUBLISHED') throw new Error('Publish experiment failed');

    // 7. Delete Experiment (DELETE /api/v1/experiments/:id)
    console.log(`[7/9] Testing DELETE /api/v1/experiments/${expId}`);
    const delRes = await fetch(`${baseUrl}/api/v1/experiments/${expId}`, {
      method: 'DELETE',
    });
    console.log('  Status:', delRes.status);
    if (delRes.status !== 204) throw new Error('Delete experiment failed');

    // 8. Error Case: Request Deleted Experiment (GET /api/v1/experiments/:id -> 404)
    console.log('[8/9] Testing 404 EXPERIMENT_NOT_FOUND error case');
    const notFoundRes = await fetch(`${baseUrl}/api/v1/experiments/${expId}`);
    const notFoundBody = await notFoundRes.json();
    console.log('  Status:', notFoundRes.status, JSON.stringify(notFoundBody));
    if (notFoundRes.status !== 404 || notFoundBody.error.code !== 'EXPERIMENT_NOT_FOUND') {
      throw new Error('404 error case failed');
    }

    // 9. Error Case: Malformed Create Payload (POST /api/v1/experiments -> 400)
    console.log('[9/9] Testing 400 INVALID_EXPERIMENT error case');
    const badReqRes = await fetch(`${baseUrl}/api/v1/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'A' }), // Title too short, missing fields
    });
    const badReqBody = await badReqRes.json();
    console.log('  Status:', badReqRes.status, JSON.stringify(badReqBody));
    if (badReqRes.status !== 400 || badReqBody.error.code !== 'INVALID_EXPERIMENT') {
      throw new Error('400 error case failed');
    }

    console.log('--- ALL 9 LIVE SMOKE TESTS PASSED CLEANLY! ---');
  } finally {
    await prisma.experiment.deleteMany();
    await prisma.$disconnect();
    server.close();
  }
}

runSmokeTests().catch((err) => {
  console.error('Smoke tests failed:', err);
  process.exit(1);
});
