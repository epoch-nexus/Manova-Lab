import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  TimingController,
  TimingDiagnostics,
  type TimingTrialInput,
  type TimingEnvironment,
  type TimingState,
} from '../src/timing/index.js';

interface ScheduledEvent {
  id: number;
  type: 'timer' | 'raf';
  fireAt: number;
  cb: (ts?: number) => void;
}

class MockTimingEnvironment implements TimingEnvironment {
  public currentTime = 1000.0;
  public visibility: 'visible' | 'hidden' = 'visible';
  private events: ScheduledEvent[] = [];
  private nextId = 1;
  private listeners: Map<string, Array<(e: any) => void>> = new Map();

  now(): number {
    return this.currentTime;
  }

  requestAnimationFrame(callback: (timestamp: number) => void): number {
    const id = this.nextId++;
    // Frame boundary at +16.0ms (simulating ~60Hz display refresh)
    this.events.push({
      id,
      type: 'raf',
      fireAt: this.currentTime + 16.0,
      cb: callback,
    });
    return id;
  }

  cancelAnimationFrame(id: number): void {
    this.events = this.events.filter((e) => !(e.id === id && e.type === 'raf'));
  }

  setTimeout(callback: () => void, ms: number): number {
    const id = this.nextId++;
    this.events.push({
      id,
      type: 'timer',
      fireAt: this.currentTime + ms,
      cb: callback,
    });
    return id;
  }

  clearTimeout(id: number | NodeJS.Timeout): void {
    const numId = typeof id === 'number' ? id : (id as any);
    this.events = this.events.filter((e) => !(e.id === numId && e.type === 'timer'));
  }

  getVisibilityState(): 'visible' | 'hidden' {
    return this.visibility;
  }

  addEventListener(type: string, listener: any): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: any): void {
    const arr = this.listeners.get(type);
    if (arr) {
      this.listeners.set(
        type,
        arr.filter((l) => l !== listener)
      );
    }
  }

  tick(ms: number): void {
    const targetTime = this.currentTime + ms;
    let guard = 0;
    while (guard++ < 5000) {
      this.events.sort((a, b) => a.fireAt - b.fireAt);
      const next = this.events[0];
      if (!next || next.fireAt > targetTime) {
        break;
      }
      this.events.shift();
      this.currentTime = next.fireAt;
      next.cb(this.currentTime);
    }
    this.currentTime = targetTime;
  }

  advanceToStimulusOnset(preStimulusDelayMs: number): void {
    // Advance pre-stimulus delay to trigger timer, then advance display frame (16ms) to render stimulus
    this.tick(preStimulusDelayMs + 16.0);
  }

  triggerKeydown(code: string): void {
    const list = [...(this.listeners.get('keydown') || [])];
    for (const listener of list) {
      listener({ code, key: code });
    }
  }
}

function createSampleTrial(overrides?: Partial<TimingTrialInput>): TimingTrialInput {
  return {
    id: 'trial_test_1234',
    orderIndex: 1,
    stimulus: {
      id: 'stim_test_1',
      type: 'text',
      content: 'X',
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
      evaluationMode: 'exact_match',
    },
    ...overrides,
  };
}

describe('Phase 4 High-Precision Timing Engine', () => {
  let env: MockTimingEnvironment;
  let controller: TimingController;

  beforeEach(() => {
    env = new MockTimingEnvironment();
    controller = new TimingController(env);
  });

  // ==========================================
  // Test 1 — Stimulus Timestamp
  // ==========================================
  it('Test 1 — Stimulus timestamp: verifies stimulus presentation establishes timing reference on frame boundary', async () => {
    const states: TimingState[] = [];
    let stimulusPresentedTs = 0;

    const trial = createSampleTrial({
      timingConfig: {
        preStimulusDelayMs: 500,
        stimulusDurationMs: 1000,
        responseTimeoutMs: 2000,
        allowEarlyResponse: false,
        waitForResponse: false,
      },
    });

    const runPromise = controller.runTrial(trial, {
      onStateChange: (s) => states.push(s),
      onStimulusShow: (_stim, ts) => {
        stimulusPresentedTs = ts;
      },
    });

    // Initial state immediately moves to PRE_STIMULUS
    expect(controller.getState()).toBe('PRE_STIMULUS');

    // Advance 500ms pre-stimulus delay + 16ms frame synchronization
    env.advanceToStimulusOnset(500);

    // Now in AWAITING_RESPONSE after frame synchronization
    expect(controller.getState()).toBe('AWAITING_RESPONSE');
    expect(states).toContain('PRE_STIMULUS');
    expect(states).toContain('STIMULUS_PENDING_PRESENTATION');
    expect(states).toContain('STIMULUS_PRESENTED');
    expect(states).toContain('AWAITING_RESPONSE');

    // Stimulus timestamp was captured
    expect(stimulusPresentedTs).toBe(1516);

    // Complete the trial with Space response
    env.tick(150);
    env.triggerKeydown('Space');

    const result = await runPromise;
    expect(result.stimulusPresentationTimestamp).toBe(stimulusPresentedTs);
    expect(result.timingMeasurement?.stimulusOnsetTimestamp).toBe(stimulusPresentedTs);
  });

  // ==========================================
  // Test 2 — Response Timestamp & Elapsed RT Calculation
  // ==========================================
  it('Test 2 — Response timestamp: calculates elapsed reaction time correctly via performance.now() difference', async () => {
    const trial = createSampleTrial();
    const runPromise = controller.runTrial(trial);

    // Advance past pre-stimulus delay (500ms) and frame synchronization (16ms)
    env.advanceToStimulusOnset(500);
    expect(controller.getState()).toBe('AWAITING_RESPONSE');

    // Participant responds exactly 242.5ms after stimulus onset
    env.tick(242.5);
    const expectedResponseTime = env.now();
    env.triggerKeydown('Space');

    const result = await runPromise;

    expect(result.timedOut).toBe(false);
    expect(result.submittedResponse).toBe('Space');
    expect(result.responseTimestamp).toBe(expectedResponseTime);
    expect(result.reactionTimeMs).toBe(242.5);
    expect(result.timingMeasurement?.calculatedLatencyMs).toBe(242.5);
    expect(result.timingMeasurement?.hardwarePrecision.timingMethod).toBe('requestAnimationFrame');
  });

  // ==========================================
  // Test 3 — Early Response Handling
  // ==========================================
  it('Test 3 — Early response: ignores keypress during pre-stimulus fixation when allowEarlyResponse is false', async () => {
    const trial = createSampleTrial({
      timingConfig: {
        preStimulusDelayMs: 600,
        stimulusDurationMs: 1000,
        responseTimeoutMs: 2000,
        allowEarlyResponse: false,
        waitForResponse: false,
      },
    });

    const runPromise = controller.runTrial(trial);

    // Premature keypress at 200ms into pre-stimulus delay
    env.tick(200);
    expect(controller.getState()).toBe('PRE_STIMULUS');
    env.triggerKeydown('Space');

    // Controller MUST still be in PRE_STIMULUS (premature press ignored)
    expect(controller.getState()).toBe('PRE_STIMULUS');

    // Finish pre-stimulus delay (remaining 400ms + 16ms frame) to reach stimulus presentation
    env.tick(400 + 16.0);
    expect(controller.getState()).toBe('AWAITING_RESPONSE');

    // Now valid response occurs at 180ms after stimulus onset
    env.tick(180);
    env.triggerKeydown('Space');

    const result = await runPromise;
    expect(result.timedOut).toBe(false);
    expect(result.reactionTimeMs).toBe(180);
  });

  // ==========================================
  // Test 4 — Duplicate Response Suppression
  // ==========================================
  it('Test 4 — Duplicate response: captures only the first valid response and ignores subsequent keypresses', async () => {
    let capturedCount = 0;
    const trial = createSampleTrial();

    const runPromise = controller.runTrial(trial, {
      onResponseCaptured: () => {
        capturedCount++;
      },
    });

    env.advanceToStimulusOnset(500);
    expect(controller.getState()).toBe('AWAITING_RESPONSE');

    // First keypress at 200ms
    env.tick(200);
    env.triggerKeydown('Space');

    // Rapid successive keypresses immediately after
    env.tick(20);
    env.triggerKeydown('Space');
    env.tick(20);
    env.triggerKeydown('Space');

    const result = await runPromise;
    expect(capturedCount).toBe(1);
    expect(result.reactionTimeMs).toBe(200);
    expect(controller.getState()).toBe('COMPLETE');
  });

  // ==========================================
  // Test 5 — Timeout Handling
  // ==========================================
  it('Test 5 — Timeout: correctly transitions to TIMEOUT when no response occurs within responseTimeoutMs', async () => {
    let timeoutFired = false;
    const states: TimingState[] = [];

    const trial = createSampleTrial({
      timingConfig: {
        preStimulusDelayMs: 300,
        stimulusDurationMs: 800,
        responseTimeoutMs: 1000,
        allowEarlyResponse: false,
        waitForResponse: false,
      },
    });

    const runPromise = controller.runTrial(trial, {
      onStateChange: (s) => states.push(s),
      onTimeout: () => {
        timeoutFired = true;
      },
    });

    env.advanceToStimulusOnset(300);
    expect(controller.getState()).toBe('AWAITING_RESPONSE');

    // Advance 1000ms without responding (reaches responseTimeoutMs)
    env.tick(1000);

    const result = await runPromise;

    expect(timeoutFired).toBe(true);
    expect(states).toContain('TIMEOUT');
    expect(states).toContain('COMPLETE');
    expect(result.timedOut).toBe(true);
    expect(result.submittedResponse).toBeNull();
    expect(result.reactionTimeMs).toBeNull();
    expect(result.responseTimestamp).toBeNull();
    expect(result.timingMeasurement).toBeNull();
  });

  // ==========================================
  // Test 6 — Stimulus Duration
  // ==========================================
  it('Test 6 — Stimulus duration: hides stimulus after stimulusDurationMs while still awaiting response', async () => {
    let stimulusHidden = false;

    const trial = createSampleTrial({
      timingConfig: {
        preStimulusDelayMs: 200,
        stimulusDurationMs: 400,
        responseTimeoutMs: 1500,
        allowEarlyResponse: false,
        waitForResponse: false,
      },
    });

    const runPromise = controller.runTrial(trial, {
      onStimulusHide: () => {
        stimulusHidden = true;
      },
    });

    env.advanceToStimulusOnset(200);
    expect(controller.getState()).toBe('AWAITING_RESPONSE');
    expect(stimulusHidden).toBe(false);

    // Advance 400ms (stimulusDurationMs expires)
    env.tick(400);
    expect(stimulusHidden).toBe(true);
    expect(controller.getState()).toBe('AWAITING_RESPONSE');

    // Participant responds at 700ms after onset (300ms after stimulus hidden)
    env.tick(300);
    env.triggerKeydown('Space');

    const result = await runPromise;
    expect(result.timedOut).toBe(false);
    expect(result.reactionTimeMs).toBe(700);
  });

  // ==========================================
  // Test 7 — Trial Isolation
  // ==========================================
  it('Test 7 — Trial isolation: aborting or finishing Trial N cannot leak callbacks or mutate Trial N+1', async () => {
    const trial1 = createSampleTrial({ id: 'trial_1' });
    const trial2 = createSampleTrial({ id: 'trial_2' });

    let trial1CallbackCount = 0;
    controller.runTrial(trial1, {
      onResponseCaptured: () => {
        trial1CallbackCount++;
      },
    });

    // Advance halfway through trial 1 fixation
    env.tick(250);

    // Abort trial 1 early and immediately run trial 2
    controller.abortTrial();
    expect(controller.getState()).toBe('IDLE');

    const run2 = controller.runTrial(trial2);
    env.advanceToStimulusOnset(500);
    env.tick(200);
    env.triggerKeydown('Space');

    const result2 = await run2;
    expect(result2.trialId).toBe('trial_2');
    expect(trial1CallbackCount).toBe(0);
  });

  // ==========================================
  // Test 8 — Multiple Trials (50 Sequential Trials)
  // ==========================================
  it('Test 8 — Multiple trials: runs 50 sequential trials verifying repeated capture, isolation, and diagnostics', async () => {
    const diagnostics = new TimingDiagnostics();

    for (let i = 1; i <= 50; i++) {
      const trial = createSampleTrial({
        id: `trial_${i}`,
        orderIndex: i,
        timingConfig: {
          preStimulusDelayMs: 100,
          stimulusDurationMs: 500,
          responseTimeoutMs: 1000,
          allowEarlyResponse: false,
          waitForResponse: false,
        },
      });

      const runPromise = controller.runTrial(trial);
      env.advanceToStimulusOnset(100);

      // 48 trials succeed with varied RTs (200ms to 340ms), 2 trials timeout
      if (i === 12 || i === 38) {
        // Let it time out
        env.tick(1000);
      } else {
        const simulatedRt = 200 + (i % 15) * 10; // 200ms - 340ms
        env.tick(simulatedRt);
        env.triggerKeydown('Space');
      }

      const result = await runPromise;
      diagnostics.record(result);
    }

    const summary = diagnostics.computeSummary();
    expect(summary.trialsCompleted).toBe(50);
    expect(summary.responsesCaptured).toBe(48);
    expect(summary.timeouts).toBe(2);
    expect(summary.minRtMs).toBe(200);
    expect(summary.maxRtMs).toBe(340);
    expect(summary.meanRtMs).toBeGreaterThan(250);
    expect(summary.meanRtMs).toBeLessThan(300);
  });
});
