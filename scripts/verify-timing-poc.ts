import {
  TimingController,
  TimingDiagnostics,
  type TimingTrialInput,
} from '../src/timing/index.js';

async function run50TrialVerification() {
  console.log('================================================================');
  console.log('  MANOVA LABS — Phase 4 Timing Engine 50-Trial Verification Run  ');
  console.log('================================================================');

  const controller = new TimingController();
  const diagnostics = new TimingDiagnostics();

  // 1. Refresh Rate Estimation
  console.log('\n[Telemetry] Estimating display refresh rate via requestAnimationFrame...');
  const refreshRateHz = await controller.estimateRefreshRate(15);
  console.log(`[Telemetry] Display Refresh Rate: ~${refreshRateHz} Hz (frame interval: ~${(1000 / refreshRateHz).toFixed(2)} ms)`);

  const totalTrials = 50;
  console.log(`\n[Execution] Commencing ${totalTrials}-trial automated timing sequence...\n`);

  for (let i = 1; i <= totalTrials; i++) {
    const isTimeoutTrial = i === 11 || i === 36;
    const targetLetter = i % 2 === 0 ? 'O' : 'X';

    const trialInput: TimingTrialInput = {
      id: `trial_verify_${i}`,
      orderIndex: i,
      stimulus: {
        id: `stim_${i}`,
        type: 'text',
        content: targetLetter,
      },
      timingConfig: {
        preStimulusDelayMs: 100,
        stimulusDurationMs: 500,
        responseTimeoutMs: 600,
        allowEarlyResponse: false,
        waitForResponse: false,
      },
      expectedResponse: {
        type: 'keypress',
        allowedKeys: ['Space'],
        evaluationMode: 'exact_match',
      },
    };

    const trialPromise = controller.runTrial(trialInput);

    if (!isTimeoutTrial) {
      // Realistic human response latency (200ms - 320ms)
      const simulatedRt = 200 + ((i * 17) % 120);
      setTimeout(() => {
        if (controller.getState() === 'AWAITING_RESPONSE') {
          controller.dispatchInput('Space');
        }
      }, 100 + 16 + simulatedRt);
    }

    const result = await trialPromise;
    diagnostics.record(result);

    // Print individual trial log
    console.log(diagnostics.formatTrialLog(i, result));

    // Inter-trial interval (20ms)
    await new Promise((r) => setTimeout(r, 20));
  }

  console.log('\n' + diagnostics.formatSummaryReport());
}

run50TrialVerification().catch((err) => {
  console.error('Timing Verification Failed:', err);
  process.exit(1);
});
