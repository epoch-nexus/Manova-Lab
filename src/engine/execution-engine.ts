import type {
  Experiment,
  Trial,
} from '../types/experiment.d.ts';
import type {
  ExecutionStep,
  ParticipantTrial,
  ParticipantExpectedResponse,
  TransitionResult,
  SessionStatus,
  ExecutionState,
} from './execution-state.js';
import { BadRequestError } from '../server/errors.js';

export interface SessionContext {
  id: string;
  experimentId: string;
  status: SessionStatus;
  executionState: ExecutionState;
  currentTrialId: string | null;
  currentTrialIndex: number;
  totalTrials: number;
}

export class ExecutionEngine {
  /**
   * Resolves the current step that the participant should perceive and execute.
   * Derives exclusively from the immutable snapshot and current session state.
   */
  resolveCurrentStep(session: SessionContext, snapshot: Experiment): ExecutionStep {
    if (session.status === 'COMPLETED' || session.executionState === 'COMPLETE') {
      return {
        sessionId: session.id,
        experimentId: session.experimentId,
        experimentTitle: snapshot.title,
        status: 'COMPLETED',
        executionState: 'COMPLETE',
        currentTrialIndex: session.currentTrialIndex,
        totalTrials: session.totalTrials,
        currentTrial: null,
        generalInstructions: snapshot.generalInstructions,
        completionMessage: snapshot.completionMessage ?? 'Experiment complete! Thank you for participating.',
        isCompleted: true,
      };
    }

    if (!session.currentTrialId) {
      throw new BadRequestError('Session has no active trial assigned');
    }

    const trial = snapshot.trials.find((t) => t.id === session.currentTrialId);
    if (!trial) {
      throw new BadRequestError(
        `Trial '${session.currentTrialId}' not found in experiment snapshot`
      );
    }

    return {
      sessionId: session.id,
      experimentId: session.experimentId,
      experimentTitle: snapshot.title,
      status: session.status,
      executionState: session.executionState,
      currentTrialIndex: session.currentTrialIndex,
      totalTrials: session.totalTrials,
      currentTrial: this.stripTrial(trial),
      generalInstructions: session.currentTrialIndex === 0 ? snapshot.generalInstructions : null,
      completionMessage: null,
      isCompleted: false,
    };
  }

  /**
   * Validates whether submitted response conforms to trial's allowed input criteria.
   */
  validateResponse(trial: Trial, submittedResponse: string | null): void {
    if (submittedResponse === null) {
      // Timeout or null response is allowed as a non-response input
      return;
    }

    const { expectedResponse } = trial;
    if (expectedResponse.type === 'keypress') {
      if (!expectedResponse.allowedKeys.includes(submittedResponse)) {
        throw new BadRequestError(
          `Invalid response '${submittedResponse}'. Allowed keys: [${expectedResponse.allowedKeys.join(', ')}]`,
          'INVALID_RESPONSE'
        );
      }
    } else if (expectedResponse.type === 'button_click') {
      if (!expectedResponse.allowedButtons.includes(submittedResponse)) {
        throw new BadRequestError(
          `Invalid response '${submittedResponse}'. Allowed buttons: [${expectedResponse.allowedButtons.join(', ')}]`,
          'INVALID_RESPONSE'
        );
      }
    }
  }

  /**
   * Advances the session along the linear trial sequence.
   * Does NOT evaluate conditional branching; follows nextTrialId pointer deterministically.
   */
  advanceLinearSequence(
    session: SessionContext,
    snapshot: Experiment,
    submittedTrialId: string
  ): TransitionResult {
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestError('Session is not in progress', 'SESSION_ALREADY_COMPLETED');
    }

    if (session.currentTrialId !== submittedTrialId) {
      throw new BadRequestError(
        `Stale or invalid trial response. Active trial is '${session.currentTrialId}', but received response for '${submittedTrialId}'.`,
        'INVALID_RESPONSE'
      );
    }

    const currentTrial = snapshot.trials.find((t) => t.id === submittedTrialId);
    if (!currentTrial) {
      throw new BadRequestError(
        `Trial '${submittedTrialId}' not found in experiment snapshot`,
        'TRIAL_NOT_FOUND'
      );
    }

    // Terminal trial reached
    if (currentTrial.nextTrialId === null) {
      return {
        sessionStatus: 'COMPLETED',
        executionState: 'COMPLETE',
        nextTrialId: null,
        nextTrialIndex: session.currentTrialIndex,
        nextTrial: null,
        isCompleted: true,
        completionMessage:
          snapshot.completionMessage ?? 'Thank you for participating! Your responses have been anonymously recorded.',
      };
    }

    // Advance to next trial in sequence
    const nextTrial = snapshot.trials.find((t) => t.id === currentTrial.nextTrialId);
    if (!nextTrial) {
      throw new BadRequestError(
        `Corrupted progression pointer: next trial '${currentTrial.nextTrialId}' missing from snapshot`,
        'TRIAL_NOT_FOUND'
      );
    }

    const nextTrialIndex = session.currentTrialIndex + 1;

    return {
      sessionStatus: 'IN_PROGRESS',
      executionState: 'AWAITING_RESPONSE',
      nextTrialId: nextTrial.id,
      nextTrialIndex,
      nextTrial: this.stripTrial(nextTrial),
      isCompleted: false,
      completionMessage: null,
    };
  }

  /**
   * Strips correctResponse from expectedResponse to ensure participant cannot inspect answer.
   */
  stripTrial(trial: Trial): ParticipantTrial {
    const strippedExpected: ParticipantExpectedResponse =
      trial.expectedResponse.type === 'keypress'
        ? {
            type: 'keypress',
            allowedKeys: trial.expectedResponse.allowedKeys,
            evaluationMode: trial.expectedResponse.evaluationMode,
          }
        : {
            type: 'button_click',
            allowedButtons: trial.expectedResponse.allowedButtons,
            evaluationMode: trial.expectedResponse.evaluationMode,
          };

    return {
      id: trial.id,
      orderIndex: trial.orderIndex,
      label: trial.label,
      instructions: trial.instructions,
      fixation: trial.fixation,
      stimulus: trial.stimulus,
      timingConfig: trial.timingConfig,
      expectedResponse: strippedExpected,
      nextTrialId: trial.nextTrialId,
      branching: null,
    };
  }
}
