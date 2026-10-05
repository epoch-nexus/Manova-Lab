import {
  AbortError,
  type TimingState,
  type TimingTrialInput,
  type TimingResult,
  type TimingEnvironment,
  type TimingLifecycleCallbacks,
} from './timing-types.js';
import type { TimingMethod } from '../types/experiment.d.ts';

export { AbortError };
export const TrialAbortedError = AbortError;
export type TrialAbortedError = AbortError;

/**
 * Creates default browser environment adapters using native browser APIs.
 */
function createDefaultBrowserEnvironment(): TimingEnvironment {
  const isBrowser = typeof window !== 'undefined' && typeof performance !== 'undefined';

  return {
    now(): number {
      if (isBrowser) {
        return performance.now();
      }
      // Node.js performance fallback
      return typeof performance !== 'undefined' ? performance.now() : Date.now();
    },
    requestAnimationFrame(cb: (timestamp: number) => void): number {
      if (isBrowser && typeof window.requestAnimationFrame === 'function') {
        return window.requestAnimationFrame(cb);
      }
      // Node.js fallback simulation (16ms ~ 60fps)
      return setTimeout(() => cb(this.now()), 16) as unknown as number;
    },
    cancelAnimationFrame(id: number): void {
      if (isBrowser && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(id);
      } else {
        clearTimeout(id);
      }
    },
    setTimeout(cb: () => void, ms: number) {
      return setTimeout(cb, ms);
    },
    clearTimeout(id: number | NodeJS.Timeout): void {
      clearTimeout(id as any);
    },
    getVisibilityState(): 'visible' | 'hidden' {
      if (typeof document !== 'undefined' && document.visibilityState) {
        return document.visibilityState;
      }
      return 'visible';
    },
    // Fix 4: addVisibilityListener/removeVisibilityListener on the environment
    addVisibilityListener(listener: () => void): void {
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', listener);
      }
    },
    removeVisibilityListener(listener: () => void): void {
      if (typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('visibilitychange', listener);
      }
    },
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener(type, listener);
      }
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener(type, listener);
      }
    },
  };
}

/**
 * High-Precision Timing Engine Controller.
 *
 * Implements millisecond-resolution timing for behavioral trials:
 * - Uses performance.now() for elapsed-time measurement.
 * - Uses requestAnimationFrame() for frame-synchronized presentation boundaries.
 * - Enforces the Phase 4 timing state lifecycle.
 * - Guards against premature, duplicate, and post-timeout responses.
 * - Isolates trials from cross-trial timer/callback leaks.
 */
export class TimingController {
  private env: TimingEnvironment;
  private state: TimingState = 'IDLE';
  private tokenCounter = 0;
  private activeTrialToken = 0;

  // Active timers & callbacks to clear on cleanup
  private preStimulusTimer: number | NodeJS.Timeout | null = null;
  private stimulusDurationTimer: number | NodeJS.Timeout | null = null;
  private timeoutTimer: number | NodeJS.Timeout | null = null;
  private rafHandle: number | null = null;
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;
  private visibilityListener: (() => void) | null = null;

  // Fix 3: track and resolve/reject the pending trial promise on abort/supersede
  private pendingReject: ((err: TrialAbortedError) => void) | null = null;

  // Real-time telemetry
  private hiddenTabDetected = false;
  private estimatedRefreshRate: number | null = null;

  constructor(customEnv?: TimingEnvironment) {
    this.env = customEnv ?? createDefaultBrowserEnvironment();
  }

  /**
   * Retrieves current timing state.
   */
  getState(): TimingState {
    return this.state;
  }

  /**
   * Sets estimated display refresh rate in Hz.
   */
  setEstimatedRefreshRate(hz: number | null): void {
    this.estimatedRefreshRate = hz;
  }

  /**
   * Helper to estimate display refresh rate via consecutive requestAnimationFrame deltas.
   */
  async estimateRefreshRate(samples = 15): Promise<number> {
    return new Promise((resolve) => {
      const timestamps: number[] = [];
      let count = 0;

      const onFrame = (ts: number) => {
        timestamps.push(ts);
        count++;
        if (count < samples) {
          this.env.requestAnimationFrame(onFrame);
        } else {
          // Calculate average delta between consecutive frames
          const deltas: number[] = [];
          for (let i = 1; i < timestamps.length; i++) {
            deltas.push(timestamps[i]! - timestamps[i - 1]!);
          }
          const avgDelta = deltas.reduce((acc, val) => acc + val, 0) / deltas.length;
          const estimatedHz = avgDelta > 0 ? Math.round(1000 / avgDelta) : 60;
          this.estimatedRefreshRate = estimatedHz;
          resolve(estimatedHz);
        }
      };

      this.env.requestAnimationFrame(onFrame);
    });
  }

  /**
   * Aborts active trial and resets state to IDLE.
   * Cancels all timers, frame callbacks, and event listeners.
   * Fix 3: rejects the pending promise with a TrialAbortedError.
   */
  abortTrial(): void {
    const reject = this.pendingReject;
    this.pendingReject = null;
    this.cleanupActiveTrial();
    this.transitionState('IDLE');
    reject?.(new AbortError('Trial was explicitly aborted'));
  }

  /**
   * Runs an atomic behavioral trial through the complete high-precision timing lifecycle.
   * Fix 3: superseding a running trial rejects its promise with AbortError.
   */
  async runTrial(
    trial: TimingTrialInput,
    callbacks?: TimingLifecycleCallbacks
  ): Promise<TimingResult> {
    // 1. Terminate any previous trial context:
    //    reject the previous pending promise before overwriting it (Fix 3)
    const prevReject = this.pendingReject;
    this.pendingReject = null;
    this.cleanupActiveTrial();
    prevReject?.(new AbortError('Trial superseded by a new runTrial() call'));

    const currentToken = ++this.tokenCounter;
    this.activeTrialToken = currentToken;

    this.hiddenTabDetected = this.env.getVisibilityState() === 'hidden';

    // 2. Track visibility changes using the injected environment (Fix 4)
    const visListener = () => {
      if (this.env.getVisibilityState() === 'hidden') {
        this.hiddenTabDetected = true;
      }
    };
    this.visibilityListener = visListener;
    if (this.env.addVisibilityListener) {
      this.env.addVisibilityListener(visListener);
    }

    return new Promise<TimingResult>((resolve, reject) => {
      // Store the reject so abortTrial()/supersede can resolve the promise (Fix 3)
      this.pendingReject = reject;

      const timingConfig = trial.timingConfig;
      const expectedResponse = trial.expectedResponse;
      const preStimulusStart = this.env.now();

      let stimulusPresentationTimestamp = 0;
      let actualPreStimulusDurationMs = 0;
      let trialFinished = false;

      const finishTrial = (result: TimingResult) => {
        if (trialFinished || this.activeTrialToken !== currentToken) {
          return;
        }
        trialFinished = true;
        this.pendingReject = null;
        this.cleanupActiveTrial();
        resolve(result);
      };

      // ---------------------------------------------------------------
      // Input filtering helpers (Fix 1 & Fix 2)
      // ---------------------------------------------------------------
      /**
       * Returns true if the given input code is an allowed response for the
       * current trial's expected-response configuration.
       * Applied in BOTH the early-response and awaiting-response paths.
       */
      const isAllowedInput = (code: string): boolean => {
        if (expectedResponse.type === 'keypress') {
          const allowed = expectedResponse.allowedKeys;
          if (allowed && allowed.length > 0 && !allowed.includes(code)) {
            return false;
          }
        } else if (expectedResponse.type === 'button_click') {
          // Fix 2: filter button_click on allowedButtons
          const allowed = expectedResponse.allowedButtons;
          if (allowed && allowed.length > 0 && !allowed.includes(code)) {
            return false;
          }
        }
        return true;
      };

      // 3. Early response listener during PRE_STIMULUS
      const earlyResponseHandler = (keyOrBtn: string) => {
        if (this.activeTrialToken !== currentToken || trialFinished) return;

        if (this.state === 'PRE_STIMULUS') {
          if (timingConfig.allowEarlyResponse) {
            // Fix 1: apply the same allowedKeys / allowedButtons filter here
            if (!isAllowedInput(keyOrBtn)) return;

            const responseTimestamp = this.env.now();
            const earlyLatency = responseTimestamp - preStimulusStart;
            this.transitionState('RESPONSE_CAPTURED', callbacks);
            callbacks?.onResponseCaptured?.(keyOrBtn, earlyLatency);
            this.transitionState('COMPLETE', callbacks);

            finishTrial({
              trialId: trial.id,
              submittedResponse: keyOrBtn,
              reactionTimeMs: earlyLatency,
              timedOut: false,
              stimulusPresentationTimestamp: preStimulusStart,
              responseTimestamp,
              timingMeasurement: {
                stimulusOnsetTimestamp: preStimulusStart,
                responseTimestamp,
                calculatedLatencyMs: earlyLatency,
                hardwarePrecision: {
                  timingMethod: 'performanceNow',
                  displayRefreshRateEstimateHz: this.estimatedRefreshRate,
                  hiddenTabDetected: this.hiddenTabDetected,
                  preStimulusActualDurationMs: 0,
                },
              },
            });
          } else {
            // Documented contract: Premature response during fixation is ignored
            // when allowEarlyResponse is false.
          }
        }
      };

      // Setup keyboard listener
      this.setupInputListener((code) => {
        if (this.state === 'PRE_STIMULUS') {
          earlyResponseHandler(code);
          return;
        }

        if (this.state === 'AWAITING_RESPONSE') {
          // Fix 1 & Fix 2: use shared isAllowedInput() for both keypress and button_click
          if (!isAllowedInput(code)) {
            // Disallowed key/button: ignore and continue awaiting valid input
            return;
          }

          // Valid response captured! Latch timestamp immediately
          const responseTimestamp = this.env.now();
          const reactionTimeMs = responseTimestamp - stimulusPresentationTimestamp;

          // Remove input listener immediately to prevent duplicate responses
          this.removeInputListener();

          this.transitionState('RESPONSE_CAPTURED', callbacks);
          callbacks?.onResponseCaptured?.(code, reactionTimeMs);

          this.transitionState('COMPLETE', callbacks);

          const timingMethod: TimingMethod = 'requestAnimationFrame';

          finishTrial({
            trialId: trial.id,
            submittedResponse: code,
            reactionTimeMs,
            timedOut: false,
            stimulusPresentationTimestamp,
            responseTimestamp,
            timingMeasurement: {
              stimulusOnsetTimestamp: stimulusPresentationTimestamp,
              responseTimestamp,
              calculatedLatencyMs: reactionTimeMs,
              hardwarePrecision: {
                timingMethod,
                displayRefreshRateEstimateHz: this.estimatedRefreshRate,
                hiddenTabDetected: this.hiddenTabDetected,
                preStimulusActualDurationMs: actualPreStimulusDurationMs,
              },
            },
          });
        }
      });

      // 4. Enter PRE_STIMULUS phase
      this.transitionState('PRE_STIMULUS', callbacks);
      callbacks?.onFixationShow?.(trial.fixation ?? null);

      const preDelay = Math.max(0, timingConfig.preStimulusDelayMs);

      // 5. Schedule pre-stimulus delay completion
      this.preStimulusTimer = this.env.setTimeout(() => {
        if (this.activeTrialToken !== currentToken || trialFinished) return;

        // Pre-stimulus complete: Clear fixation and prepare stimulus
        this.transitionState('STIMULUS_PENDING_PRESENTATION', callbacks);
        callbacks?.onFixationHide?.();

        // 6. Synchronize with display refresh frame via requestAnimationFrame
        // Distinguishes: "JS decided to show stimulus" vs "Browser reached rendering frame"
        this.rafHandle = this.env.requestAnimationFrame((_frameTimestamp) => {
          if (this.activeTrialToken !== currentToken || trialFinished) return;

          // Realized stimulus presentation boundary
          stimulusPresentationTimestamp = this.env.now();
          actualPreStimulusDurationMs = stimulusPresentationTimestamp - preStimulusStart;

          this.transitionState('STIMULUS_PRESENTED', callbacks);
          callbacks?.onStimulusShow?.(trial.stimulus, stimulusPresentationTimestamp);

          // Immediately transition to AWAITING_RESPONSE
          this.transitionState('AWAITING_RESPONSE', callbacks);

          // 7. Schedule stimulus hiding if stimulusDurationMs is configured
          if (
            timingConfig.stimulusDurationMs !== null &&
            timingConfig.stimulusDurationMs !== undefined &&
            timingConfig.stimulusDurationMs > 0
          ) {
            this.stimulusDurationTimer = this.env.setTimeout(() => {
              if (this.activeTrialToken !== currentToken || trialFinished) return;
              callbacks?.onStimulusHide?.();
            }, timingConfig.stimulusDurationMs);
          }

          // 8. Schedule response timeout if configured (and not waitForResponse)
          if (
            !timingConfig.waitForResponse &&
            timingConfig.responseTimeoutMs !== null &&
            timingConfig.responseTimeoutMs !== undefined &&
            timingConfig.responseTimeoutMs > 0
          ) {
            this.timeoutTimer = this.env.setTimeout(() => {
              if (this.activeTrialToken !== currentToken || trialFinished) return;

              // Remove input listener immediately
              this.removeInputListener();

              this.transitionState('TIMEOUT', callbacks);
              callbacks?.onTimeout?.();

              this.transitionState('COMPLETE', callbacks);

              finishTrial({
                trialId: trial.id,
                submittedResponse: null,
                reactionTimeMs: null,
                timedOut: true,
                stimulusPresentationTimestamp,
                responseTimestamp: null,
                timingMeasurement: null,
              });
            }, timingConfig.responseTimeoutMs);
          }
        });
      }, preDelay);
    });
  }

  /**
   * Programmatically dispatches an input event (e.g. for button clicks or simulated responses).
   */
  dispatchInput(code: string): void {
    if (this.keydownListener) {
      const syntheticEvent = {
        code,
        key: code,
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as KeyboardEvent;
      this.keydownListener(syntheticEvent);
    }
  }

  private transitionState(newState: TimingState, callbacks?: TimingLifecycleCallbacks): void {
    this.state = newState;
    callbacks?.onStateChange?.(newState);
  }

  private setupInputListener(onInput: (code: string) => void): void {
    this.removeInputListener();

    this.keydownListener = (e: KeyboardEvent) => {
      // Capture event key or code (prefer standard e.code e.g. "Space", "KeyF")
      const code = e.code || e.key;
      onInput(code);
    };

    if (this.env.addEventListener) {
      this.env.addEventListener('keydown', this.keydownListener as EventListener);
    } else if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('keydown', this.keydownListener);
    }
  }

  private removeInputListener(): void {
    if (this.keydownListener) {
      if (this.env.removeEventListener) {
        this.env.removeEventListener('keydown', this.keydownListener as EventListener);
      } else if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('keydown', this.keydownListener);
      }
      this.keydownListener = null;
    }
  }

  private cleanupActiveTrial(): void {
    if (this.preStimulusTimer !== null) {
      this.env.clearTimeout(this.preStimulusTimer);
      this.preStimulusTimer = null;
    }
    if (this.stimulusDurationTimer !== null) {
      this.env.clearTimeout(this.stimulusDurationTimer);
      this.stimulusDurationTimer = null;
    }
    if (this.timeoutTimer !== null) {
      this.env.clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.rafHandle !== null) {
      this.env.cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.removeInputListener();

    // Fix 4: use env.removeVisibilityListener instead of global document
    if (this.visibilityListener) {
      if (this.env.removeVisibilityListener) {
        this.env.removeVisibilityListener(this.visibilityListener);
      }
      this.visibilityListener = null;
    }
  }
}
