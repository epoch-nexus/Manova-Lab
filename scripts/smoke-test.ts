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
    await prisma.auditLog.deleteMany();
    await prisma.researcher.deleteMany();

    // 1. Healthcheck
    console.log('[1/20] Testing GET /health');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthBody = await healthRes.json();
    console.log('  Status:', healthRes.status, JSON.stringify(healthBody));
    if (healthRes.status !== 200 || healthBody.status !== 'ok') throw new Error('Healthcheck failed');
    if (healthRes.headers.get('x-content-type-options') !== 'nosniff') throw new Error('Security header nosniff missing');
    if (healthRes.headers.get('x-frame-options') !== 'SAMEORIGIN') throw new Error('Security header x-frame-options missing');

    // 2. Phase 8: Researcher Registration
    console.log('[2/20] Testing POST /api/v1/auth/register (Primary Researcher)');
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice.researcher@manova.labs',
        password: 'SecurePassword123!',
        name: 'Dr. Alice',
      }),
    });
    const regData = await regRes.json();
    console.log('  Status:', regRes.status, `Token: ${Boolean(regData.token)}, Researcher: ${regData.researcher?.email}`);
    if (regRes.status !== 201 || !regData.token || !regData.researcher?.id) {
      throw new Error('Researcher registration failed');
    }
    if ((regData as any).password || (regData as any).passwordHash || (regData.researcher as any).passwordHash) {
      throw new Error('Password hash leaked in registration response!');
    }
    const token1 = regData.token;
    const authHeaders1 = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    };

    // 3. Phase 8: Auth Edge Cases (Duplicate email, Login bad password, Invalid token)
    console.log('[3/20] Testing Auth Edge Cases (Duplicate email, Invalid login, Missing/Bad token)');
    const dupRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice.researcher@manova.labs',
        password: 'AnotherPassword123!',
      }),
    });
    if (dupRes.status !== 409) throw new Error(`Expected 409 on duplicate email, got ${dupRes.status}`);

    const badLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice.researcher@manova.labs',
        password: 'WrongPassword!',
      }),
    });
    if (badLoginRes.status !== 401) throw new Error(`Expected 401 on bad login, got ${badLoginRes.status}`);

    // GET /me without token -> 401
    const noTokenMe = await fetch(`${baseUrl}/api/v1/auth/me`);
    if (noTokenMe.status !== 401) throw new Error(`Expected 401 on /me without token, got ${noTokenMe.status}`);

    // GET /me with valid token -> 200
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const meData = await meRes.json();
    if (meRes.status !== 200 || meData.email !== 'alice.researcher@manova.labs') {
      throw new Error('/me endpoint failed with valid token');
    }
    if ((meData as any).passwordHash) throw new Error('Password hash leaked in /me!');

    // Register second researcher for ownership tests
    const reg2Res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob.researcher@manova.labs',
        password: 'BobSecurePassword123!',
        name: 'Dr. Bob',
      }),
    });
    const reg2Data = await reg2Res.json();
    const token2 = reg2Data.token;
    const authHeaders2 = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`,
    };

    // 4. Create Experiment (POST /api/v1/experiments) with Auth
    console.log('[4/20] Testing POST /api/v1/experiments (with Researcher 1 Auth)');
    const trial1Id = '11111111-1111-4111-8111-111111111111';
    const trial2Id = '22222222-2222-4222-8222-222222222222';
    const stim1Id = '33333333-3333-4333-8333-333333333333';
    const stim2Id = '44444444-4444-4444-8444-444444444444';

    // Verify unauthenticated create is rejected
    const unauthCreate = await fetch(`${baseUrl}/api/v1/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauth Study', publicSlug: 'unauth-study', trials: [] }),
    });
    if (unauthCreate.status !== 401) throw new Error(`Expected 401 on unauthenticated create, got ${unauthCreate.status}`);

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
      headers: authHeaders1,
      body: JSON.stringify(createPayload),
    });
    const createdExp = await createRes.json();
    console.log('  Status:', createRes.status, `ID: ${createdExp.id}, Slug: ${createdExp.publicSlug}`);
    if (createRes.status !== 201 || !createdExp.id) throw new Error('Create experiment failed');

    const expId = createdExp.id;

    // 5. Phase 8: Verify Cross-Researcher Ownership Forbidden (403)
    console.log('[5/20] Testing Cross-Researcher Ownership Authorization (403 Forbidden)');
    const r2GetExp = await fetch(`${baseUrl}/api/v1/experiments/${expId}`, {
      headers: authHeaders2,
    });
    if (r2GetExp.status !== 403) throw new Error(`Expected 403 when Researcher 2 accesses Researcher 1's experiment, got ${r2GetExp.status}`);

    const r2PubExp = await fetch(`${baseUrl}/api/v1/experiments/${expId}/publish`, {
      method: 'POST',
      headers: authHeaders2,
    });
    if (r2PubExp.status !== 403) throw new Error(`Expected 403 when Researcher 2 publishes Researcher 1's experiment, got ${r2PubExp.status}`);

    // 6. Publish Experiment (POST /api/v1/experiments/:id/publish) with Researcher 1
    console.log(`[6/20] Testing POST /api/v1/experiments/${expId}/publish (Researcher 1)`);
    const pubRes = await fetch(`${baseUrl}/api/v1/experiments/${expId}/publish`, {
      method: 'POST',
      headers: authHeaders1,
    });
    const pubBody = await pubRes.json();
    console.log('  Status:', pubRes.status, JSON.stringify(pubBody));
    if (pubRes.status !== 200 || pubBody.status !== 'PUBLISHED') throw new Error('Publish experiment failed');

    // 7. Start Participant Session (POST /api/v1/participant/experiments/:publicSlug/sessions) - ANONYMOUS
    console.log('[7/20] Testing POST /api/v1/participant/experiments/smoke-test-rt/sessions (Anonymous - NO JWT)');
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
    if ((sessionData as any).ownerResearcherId || (sessionData as any).researcher) {
      throw new Error('Researcher identity leaked in participant session response!');
    }

    const sessionId = sessionData.sessionId;

    // 8. Get Current Step (GET /api/v1/participant/sessions/:sessionId) - ANONYMOUS
    console.log(`[8/20] Testing GET /api/v1/participant/sessions/${sessionId} (Anonymous)`);
    const step1Res = await fetch(`${baseUrl}/api/v1/participant/sessions/${sessionId}`);
    const step1Data = await step1Res.json();
    console.log('  Status:', step1Res.status, `CurrentTrial: ${step1Data.currentTrial?.id}, State: ${step1Data.executionState}`);
    if (step1Res.status !== 200 || step1Data.currentTrial?.id !== trial1Id) throw new Error('Get current step failed');

    // 9. Submit Response for Trial 1 (POST /api/v1/participant/sessions/:sessionId/trials/:trialId/response)
    console.log(`[9/20] Testing POST response for Trial 1 (Anonymous)`);
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

    // 10. Get Next Step (GET /api/v1/participant/sessions/:sessionId)
    console.log(`[10/20] Testing GET /api/v1/participant/sessions/${sessionId} (on Trial 2)`);
    const step2Res = await fetch(`${baseUrl}/api/v1/participant/sessions/${sessionId}`);
    const step2Data = await step2Res.json();
    console.log('  Status:', step2Res.status, `CurrentTrial: ${step2Data.currentTrial?.id}`);
    if (step2Res.status !== 200 || step2Data.currentTrial?.id !== trial2Id) throw new Error('Get step 2 failed');

    // 11. Submit Final Response for Trial 2 -> Transitions to COMPLETE
    console.log(`[11/20] Testing POST response for Terminal Trial 2`);
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

    // 12. Error Cases: Access Nonexistent Session & Disallowed Key
    console.log('[12/20] Testing Participant Error Cases (404 and 400)');
    const badSessRes = await fetch(`${baseUrl}/api/v1/participant/sessions/sess_nonexistent`);
    const badSessBody = await badSessRes.json();
    if (badSessRes.status !== 404 || badSessBody.error.code !== 'SESSION_NOT_FOUND') {
      throw new Error('404 session test failed');
    }

    const freshStart = await fetch(`${baseUrl}/api/v1/participant/experiments/smoke-test-rt/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const freshSession = await freshStart.json();
    const badKeyRes = await fetch(`${baseUrl}/api/v1/participant/sessions/${freshSession.sessionId}/trials/${trial1Id}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submittedResponse: 'KeyZ' }),
    });
    const badKeyBody = await badKeyRes.json();
    if (badKeyRes.status !== 400 || badKeyBody.error.code !== 'INVALID_RESPONSE') {
      throw new Error('400 bad key test failed');
    }

    // 13. Phase 5 & 8: Query Raw Results (Requires Researcher 1 Auth; Rejects Researcher 2)
    console.log('[13/20] Testing GET /api/v1/experiments/:id/results (Auth + Ownership)');
    // Researcher 2 gets 403
    const r2ResultsRes = await fetch(`${baseUrl}/api/v1/experiments/${expId}/results`, { headers: authHeaders2 });
    if (r2ResultsRes.status !== 403) throw new Error(`Expected 403 on Researcher 2 querying results, got ${r2ResultsRes.status}`);

    // Researcher 1 succeeds
    const resultsRes = await fetch(`${baseUrl}/api/v1/experiments/${expId}/results`, { headers: authHeaders1 });
    const resultsData = await resultsRes.json();
    console.log('  Status:', resultsRes.status, `Total results: ${resultsData.total}`);
    if (resultsRes.status !== 200 || resultsData.total < 2) {
      throw new Error('Raw results query failed');
    }

    // 14. Phase 5 & 8: Summary Statistics
    console.log('[14/20] Testing GET /api/v1/experiments/:id/results/summary (Researcher 1 Auth)');
    const summaryRes = await fetch(`${baseUrl}/api/v1/experiments/${expId}/results/summary`, { headers: authHeaders1 });
    const summaryData = await summaryRes.json();
    console.log('  Status:', summaryRes.status, `Total responses: ${summaryData.totalResponses}, Rate: ${summaryData.responseRate}`);
    if (summaryRes.status !== 200 || summaryData.totalResponses < 2) {
      throw new Error('Results summary query failed');
    }

    // 15. Phase 5 & 8: JSON Export
    console.log('[15/20] Testing GET /api/v1/experiments/:id/results/export.json (Researcher 1 Auth)');
    const jsonExportRes = await fetch(`${baseUrl}/api/v1/experiments/${expId}/results/export.json`, { headers: authHeaders1 });
    const jsonExportData = await jsonExportRes.json();
    const jsonDisposition = jsonExportRes.headers.get('content-disposition');
    console.log('  Status:', jsonExportRes.status, `Disposition: ${jsonDisposition}, Total exported: ${jsonExportData.totalResults}`);
    if (jsonExportRes.status !== 200 || !jsonDisposition?.includes('attachment;') || jsonExportData.totalResults < 2) {
      throw new Error('JSON export failed');
    }

    // 16. Phase 5 & 8: CSV Export (Verify participant anonymity preserved)
    console.log('[16/20] Testing GET /api/v1/experiments/:id/results/export.csv (Researcher 1 Auth)');
    const csvExportRes = await fetch(`${baseUrl}/api/v1/experiments/${expId}/results/export.csv`, { headers: authHeaders1 });
    const csvText = await csvExportRes.text();
    const csvDisposition = csvExportRes.headers.get('content-disposition');
    const csvLines = csvText.trim().split('\r\n');
    console.log('  Status:', csvExportRes.status, `Disposition: ${csvDisposition}, CSV Header: ${csvLines[0]}`);
    if (
      csvExportRes.status !== 200 ||
      !csvDisposition?.includes('attachment;') ||
      !csvLines[0]?.includes('sessionId') ||
      csvLines[0]?.includes('participantId') // Must NOT contain participantId
    ) {
      throw new Error('CSV export failed');
    }

    // 17. Phase 6: Randomized Experiment Live Flow (4 trials)
    console.log('[17/20] Testing Phase 6: Seeded Trial Randomization Engine (Auth + Anonymous Exec)');
    const randTrialIds = [
      'aaaa1111-1111-4111-8111-111111111111',
      'bbbb2222-2222-4222-8222-222222222222',
      'cccc3333-3333-4333-8333-333333333333',
      'dddd4444-4444-4444-8444-444444444444',
    ];
    const randExpRes = await fetch(`${baseUrl}/api/v1/experiments`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({
        title: 'Phase 6 Randomized Memory Task',
        description: 'Verifies seeded Fisher-Yates trial randomization live in HTTP runtime.',
        publicSlug: 'phase-6-randomized-task',
        config: {
          displayMode: 'fullscreen',
          backgroundColor: '#0F172A',
          allowPause: false,
          showFeedback: true,
          randomization: { enabled: true },
        },
        trials: [
          {
            id: randTrialIds[0],
            orderIndex: 1,
            label: 'Trial A',
            stimulus: { id: '12111111-1111-4111-8111-111111111111', type: 'text', content: 'STIM_A' },
            timingConfig: { preStimulusDelayMs: 100, stimulusDurationMs: 500, responseTimeoutMs: 1000, allowEarlyResponse: false, waitForResponse: false },
            expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
            nextTrialId: randTrialIds[1],
          },
          {
            id: randTrialIds[1],
            orderIndex: 2,
            label: 'Trial B',
            stimulus: { id: '23222222-2222-4222-8222-222222222222', type: 'text', content: 'STIM_B' },
            timingConfig: { preStimulusDelayMs: 100, stimulusDurationMs: 500, responseTimeoutMs: 1000, allowEarlyResponse: false, waitForResponse: false },
            expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
            nextTrialId: randTrialIds[2],
          },
          {
            id: randTrialIds[2],
            orderIndex: 3,
            label: 'Trial C',
            stimulus: { id: '34333333-3333-4333-8333-333333333333', type: 'text', content: 'STIM_C' },
            timingConfig: { preStimulusDelayMs: 100, stimulusDurationMs: 500, responseTimeoutMs: 1000, allowEarlyResponse: false, waitForResponse: false },
            expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
            nextTrialId: randTrialIds[3],
          },
          {
            id: randTrialIds[3],
            orderIndex: 4,
            label: 'Trial D',
            stimulus: { id: '45444444-4444-4444-8444-444444444444', type: 'text', content: 'STIM_D' },
            timingConfig: { preStimulusDelayMs: 100, stimulusDurationMs: 500, responseTimeoutMs: 1000, allowEarlyResponse: false, waitForResponse: false },
            expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
            nextTrialId: null,
          },
        ],
      }),
    });
    const randExpData = await randExpRes.json();
    if (randExpRes.status !== 201) throw new Error('Randomized experiment creation failed');

    // Publish
    const pubRandRes = await fetch(`${baseUrl}/api/v1/experiments/${randExpData.id}/publish`, {
      method: 'POST',
      headers: authHeaders1,
    });
    if (pubRandRes.status !== 200) throw new Error('Randomized experiment publish failed');

    // Start 2 participant sessions anonymously
    const s1Res = await fetch(`${baseUrl}/api/v1/participant/experiments/phase-6-randomized-task/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const s1Data = await s1Res.json();

    const s2Res = await fetch(`${baseUrl}/api/v1/participant/experiments/phase-6-randomized-task/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const s2Data = await s2Res.json();

    const dbS1 = await prisma.session.findUnique({ where: { id: s1Data.sessionId } });
    const dbS2 = await prisma.session.findUnique({ where: { id: s2Data.sessionId } });

    if (!dbS1?.randomizationEnabled || !dbS1?.randomizationSeed || !Array.isArray(dbS1?.trialOrder)) {
      throw new Error('Session 1 missing randomization persistence fields');
    }
    if (!dbS2?.randomizationEnabled || !dbS2?.randomizationSeed || !Array.isArray(dbS2?.trialOrder)) {
      throw new Error('Session 2 missing randomization persistence fields');
    }
    if (dbS1.randomizationSeed === dbS2.randomizationSeed) {
      throw new Error('Session seeds are not independently generated');
    }

    const s1TrialOrder = dbS1.trialOrder as string[];
    console.log('  Session 1 Seed:', dbS1.randomizationSeed, 'Trial Order:', s1TrialOrder.map((id) => id.slice(0, 8)));
    console.log('  Session 2 Seed:', dbS2.randomizationSeed, 'Trial Order:', (dbS2.trialOrder as string[]).map((id) => id.slice(0, 8)));

    if (s1Data.firstTrial.id !== s1TrialOrder[0]) {
      throw new Error(`First trial ${s1Data.firstTrial.id} does not match trialOrder[0] ${s1TrialOrder[0]}`);
    }

    // Step through each trial in s1TrialOrder
    const executedTrials: string[] = [];
    for (let idx = 0; idx < s1TrialOrder.length; idx++) {
      const activeId = s1TrialOrder[idx]!;
      executedTrials.push(activeId);

      const stepCheck = await fetch(`${baseUrl}/api/v1/participant/sessions/${s1Data.sessionId}/current-step`);
      const stepCheckData = await stepCheck.json();
      if (stepCheckData.currentTrial.id !== activeId) {
        throw new Error(`Step mismatch at idx ${idx}: expected ${activeId}, got ${stepCheckData.currentTrial.id}`);
      }

      const resp = await fetch(`${baseUrl}/api/v1/participant/sessions/${s1Data.sessionId}/trials/${activeId}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submittedResponse: 'Space', reactionTimeMs: 250 + idx * 20 }),
      });
      const respData = await resp.json();
      if (resp.status !== 200) throw new Error(`Response submission failed for trial ${activeId}`);

      const isLast = idx === s1TrialOrder.length - 1;
      if (respData.isCompleted !== isLast) {
        throw new Error(`Unexpected isCompleted: ${respData.isCompleted} at trial ${idx + 1}`);
      }
    }

    if (new Set(executedTrials).size !== randTrialIds.length || executedTrials.length !== randTrialIds.length) {
      throw new Error('Trial repetition or missing trials detected');
    }

    // 18. Phase 7: Dynamic Conditional Branching Engine Live Flow
    console.log('[18/20] Testing Phase 7: Dynamic Conditional Branching Engine Validation');
    const branchTrial1 = '71111111-1111-4111-8111-111111111111';
    const branchTrial2 = '72222222-2222-4222-8222-222222222222';
    const branchTrial3 = '73333333-3333-4333-8333-333333333333';

    // Verify invalid branch target is rejected at create time
    const invalidBranchRes = await fetch(`${baseUrl}/api/v1/experiments`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({
        title: 'Invalid Branch Study',
        description: 'Should fail due to dangling target',
        publicSlug: 'invalid-branch-study',
        trials: [
          {
            id: branchTrial1,
            orderIndex: 1,
            stimulus: { id: '91111111-1111-4111-8111-111111111111', type: 'text', content: 'T1' },
            timingConfig: { preStimulusDelayMs: 0, stimulusDurationMs: 500, responseTimeoutMs: 1000, allowEarlyResponse: false, waitForResponse: false },
            expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
            nextTrialId: branchTrial2,
            branching: { ifCorrect: '00000000-0000-4000-8000-000000000000', ifIncorrect: branchTrial2 },
          },
          {
            id: branchTrial2,
            orderIndex: 2,
            stimulus: { id: '92222222-2222-4222-8222-222222222222', type: 'text', content: 'T2' },
            timingConfig: { preStimulusDelayMs: 0, stimulusDurationMs: 500, responseTimeoutMs: 1000, allowEarlyResponse: false, waitForResponse: false },
            expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
            nextTrialId: null,
          },
        ],
      }),
    });
    if (invalidBranchRes.status !== 400) {
      throw new Error(`Expected invalid branch to fail with 400, got ${invalidBranchRes.status}`);
    }

    // 19. Create and Publish valid branching experiment
    console.log('[19/20] Testing Phase 7: Branching Study Creation & Publishing');
    const validBranchRes = await fetch(`${baseUrl}/api/v1/experiments`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({
        title: 'Phase 7 Branching Live Study',
        description: 'Verifies runtime accuracy-contingent trial branching',
        publicSlug: 'phase-7-branching-study',
        trials: [
          {
            id: branchTrial1,
            orderIndex: 1,
            label: 'Decision Trial',
            stimulus: { id: '81111111-1111-4111-8111-111111111111', type: 'text', content: 'Target Stimulus' },
            timingConfig: { preStimulusDelayMs: 100, stimulusDurationMs: 500, responseTimeoutMs: 1000, allowEarlyResponse: false, waitForResponse: false },
            expectedResponse: { type: 'keypress', allowedKeys: ['Space', 'KeyF'], correctResponse: 'Space', evaluationMode: 'exact_match' },
            nextTrialId: branchTrial2,
            branching: {
              ifCorrect: branchTrial3,
              ifIncorrect: branchTrial2,
            },
          },
          {
            id: branchTrial2,
            orderIndex: 2,
            label: 'Remediation Trial',
            stimulus: { id: '82222222-2222-4222-8222-222222222222', type: 'text', content: 'Remediation' },
            timingConfig: { preStimulusDelayMs: 100, stimulusDurationMs: 500, responseTimeoutMs: 1000, allowEarlyResponse: false, waitForResponse: false },
            expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
            nextTrialId: branchTrial3,
            branching: null,
          },
          {
            id: branchTrial3,
            orderIndex: 3,
            label: 'Terminal Trial',
            stimulus: { id: '83333333-3333-4333-8333-333333333333', type: 'text', content: 'Terminal' },
            timingConfig: { preStimulusDelayMs: 100, stimulusDurationMs: 500, responseTimeoutMs: 1000, allowEarlyResponse: false, waitForResponse: false },
            expectedResponse: { type: 'keypress', allowedKeys: ['Space'], correctResponse: 'Space', evaluationMode: 'exact_match' },
            nextTrialId: null,
            branching: null,
          },
        ],
      }),
    });
    const validBranchData = await validBranchRes.json();
    if (validBranchRes.status !== 201) throw new Error('Valid branching experiment creation failed');

    const pubBranchRes = await fetch(`${baseUrl}/api/v1/experiments/${validBranchData.id}/publish`, {
      method: 'POST',
      headers: authHeaders1,
    });
    if (pubBranchRes.status !== 200) throw new Error('Branching experiment publish failed');

    // 20. Live branching session verification (Correct vs Incorrect branch routing)
    console.log('[20/20] Testing Phase 7: Live Session Dynamic Branch Routing');
    // Session A: Correct -> jumps to Trial 3
    const sessionARes = await fetch(`${baseUrl}/api/v1/participant/experiments/phase-7-branching-study/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const sessionAData = await sessionARes.json();

    const respA = await fetch(`${baseUrl}/api/v1/participant/sessions/${sessionAData.sessionId}/trials/${branchTrial1}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submittedResponse: 'Space', reactionTimeMs: 280 }),
    });
    const respAData = await respA.json();
    if (respAData.nextTrial.id !== branchTrial3) {
      throw new Error(`Session A did not branch to ifCorrect target: expected ${branchTrial3}, got ${respAData.nextTrial.id}`);
    }

    const completeA = await fetch(`${baseUrl}/api/v1/participant/sessions/${sessionAData.sessionId}/trials/${branchTrial3}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submittedResponse: 'Space', reactionTimeMs: 290 }),
    });
    const completeAData = await completeA.json();
    if (!completeAData.isCompleted) throw new Error('Session A did not complete on terminal trial');

    // Session B: Incorrect -> jumps to Trial 2
    const sessionBRes = await fetch(`${baseUrl}/api/v1/participant/experiments/phase-7-branching-study/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const sessionBData = await sessionBRes.json();

    const respB = await fetch(`${baseUrl}/api/v1/participant/sessions/${sessionBData.sessionId}/trials/${branchTrial1}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submittedResponse: 'KeyF', reactionTimeMs: 380 }),
    });
    const respBData = await respB.json();
    if (respBData.nextTrial.id !== branchTrial2) {
      throw new Error(`Session B did not branch to ifIncorrect target: expected ${branchTrial2}, got ${respBData.nextTrial.id}`);
    }

    const continueB = await fetch(`${baseUrl}/api/v1/participant/sessions/${sessionBData.sessionId}/trials/${branchTrial2}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submittedResponse: 'Space', reactionTimeMs: 320 }),
    });
    const continueBData = await continueB.json();
    if (continueBData.nextTrial.id !== branchTrial3) {
      throw new Error(`Session B did not advance to Trial 3: expected ${branchTrial3}, got ${continueBData.nextTrial.id}`);
    }

    // 21. Phase 9: Audit Trail Live Verification
    console.log('[21/21] Testing Phase 9: Audit Log Trail Verification');
    const auditLogs = await prisma.auditLog.findMany();
    console.log('  Total Audit Events Recorded:', auditLogs.length);
    if (auditLogs.length === 0) throw new Error('No audit logs recorded during live smoke tests');
    for (const log of auditLogs) {
      const meta = log.metadata as any;
      if (meta?.password || meta?.passwordHash || meta?.token || meta?.jwt) {
        throw new Error(`Sensitive field leaked in audit log metadata for event ${log.eventType}`);
      }
    }

    console.log('--- ALL 21 LIVE SMOKE TESTS (PHASES 1-9) PASSED CLEANLY! ---');
  } finally {
    await prisma.sessionResponse.deleteMany();
    await prisma.session.deleteMany();
    await prisma.experimentVersion.deleteMany();
    await prisma.experiment.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.researcher.deleteMany();
    await prisma.$disconnect();
    server.close();
  }
}

runSmokeTests().catch((err) => {
  console.error('Smoke tests failed:', err);
  process.exit(1);
});
