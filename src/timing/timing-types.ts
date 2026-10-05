import type {
  TrialTimingConfig,
  Stimulus,
  FixationConfig,
  TimingMeasurement,
} from '../types/experiment.d.ts';

/**
 * Typed error thrown when a trial is aborted or superseded by a new trial.
 * Fix 3: Resolves or rejects the pending promise on abort or supersede with a typed AbortError.
 */
export class AbortError extends Error {
  readonly code = 'TRIAL_ABORTED' as const;
  constructor(message = 'Trial was aborted or superseded') {
    super(message);
    this.name = 'AbortError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * High-Precision Timing Engine Lifecycle States.
 * Strictly distinct from Phase 3 experiment progression states.
 */
export type TimingState =
  | 'IDLE'
  | 'PRE_STIMULUS'
  | 'STIMULUS_PENDING_PRESENTATION'
  | 'STIMULUS_PRESENTED'
  | 'AWAITING_RESPONSE'
  | 'RESPONSE_CAPTURED'
  | 'TIMEOUT'
  | 'COMPLETE';

/**
 * Definition of trial input accepted by the Timing Controller.
 */
export interface TimingTrialInput {
  id: string;
  orderIndex?: number;
  label?: string | null;
  instructions?: string | null;
  fixation?: FixationConfig | null;
  stimulus: Stimulus;
  timingConfig: TrialTimingConfig;
  expectedResponse: {
    type: 'keypress' | 'button_click';
    allowedKeys?: string[];
    allowedButtons?: string[];
    evaluationMode?: 'exact_match' | 'none';
  };
}

/**
 * Completed Timing Result for a single trial execution.
 */
export interface TimingResult {
  trialId: string;
  submittedResponse: string | null;
  reactionTimeMs: number | null;
  timedOut: boolean;
  stimulusPresentationTimestamp: number;
  responseTimestamp: number | null;
  timingMeasurement: TimingMeasurement | null;
}

/**
 * Environmental clock and animation frame abstraction for deterministic testing
 * and browser execution.
 *
 * Fix 4: addVisibilityListener / removeVisibilityListener are added so custom
 * environments (tests, workers) can intercept visibility events without relying
 * on the global `document`.
 */
export interface TimingEnvironment {
  now(): number;
  requestAnimationFrame(callback: (timestamp: number) => void): number;
  cancelAnimationFrame(id: number): void;
  setTimeout(callback: () => void, ms: number): number | NodeJS.Timeout;
  clearTimeout(id: number | NodeJS.Timeout): void;
  getVisibilityState(): 'visible' | 'hidden';
  /**
   * Subscribe to document visibility changes.
   * The controller calls this once per trial; the implementation should attach
   * the listener to whatever visibility event source is appropriate.
   */
  addVisibilityListener?(listener: () => void): void;
  /**
   * Unsubscribe a previously registered visibility listener.
   */
  removeVisibilityListener?(listener: () => void): void;
  addEventListener?(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener?(type: string, listener: EventListenerOrEventListenerObject): void;
}

/**
 * Callbacks emitted by the Timing Controller during the trial lifecycle.
 */
export interface TimingLifecycleCallbacks {
  onStateChange?(state: TimingState): void;
  onFixationShow?(fixation: FixationConfig | null): void;
  onFixationHide?(): void;
  onStimulusShow?(stimulus: Stimulus, timestamp: number): void;
  onStimulusHide?(): void;
  onResponseCaptured?(response: string, latencyMs: number): void;
  onTimeout?(): void;
}
