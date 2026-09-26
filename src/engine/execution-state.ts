import type {
  Stimulus,
  TrialTimingConfig,
  FixationConfig,
  ExpectedKeypressResponse,
  ExpectedButtonClickResponse,
} from '../types/experiment.d.ts';

export type ExecutionState =
  | 'INSTRUCTION'
  | 'TRIAL'
  | 'STIMULUS'
  | 'AWAITING_RESPONSE'
  | 'RECORDED'
  | 'NEXT_TRIAL'
  | 'COMPLETE';

export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export type ParticipantExpectedResponse =
  | Omit<ExpectedKeypressResponse, 'correctResponse'>
  | Omit<ExpectedButtonClickResponse, 'correctResponse'>;

/**
 * Participant-facing trial view with correctResponse stripped for integrity.
 */
export interface ParticipantTrial {
  id: string;
  orderIndex: number;
  label?: string | null;
  instructions?: string | null;
  fixation?: FixationConfig | null;
  stimulus: Stimulus;
  timingConfig: TrialTimingConfig;
  expectedResponse: ParticipantExpectedResponse;
  nextTrialId: string | null;
  branching?: null;
}

/**
 * Current execution step returned to the participant runtime.
 */
export interface ExecutionStep {
  sessionId: string;
  experimentId: string;
  experimentTitle: string;
  status: SessionStatus;
  executionState: ExecutionState;
  currentTrialIndex: number;
  totalTrials: number;
  currentTrial: ParticipantTrial | null;
  generalInstructions?: string | null;
  completionMessage?: string | null;
  isCompleted: boolean;
}

/**
 * Result of advancing the state machine upon response submission.
 */
export interface TransitionResult {
  sessionStatus: SessionStatus;
  executionState: ExecutionState;
  nextTrialId: string | null;
  nextTrialIndex: number;
  nextTrial: ParticipantTrial | null;
  isCompleted: boolean;
  completionMessage?: string | null;
}
