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
  trialOrder?: string[] | null;
  randomizationEnabled?: boolean;
}

function hasCorrectnessBranching(
  branching: unknown
): branching is { ifCorrect: string; ifIncorrect: string } {
  if (!branching || typeof branching !== 'object') return false;
  const b = branching as Record<string, unknown>;
  return typeof b.ifCorrect === 'string' && typeof b.ifIncorrect === 'string';
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

    const projectedNextTrialId =
      session.randomizationEnabled && session.trialOrder && session.trialOrder.length > 0
        ? (session.trialOrder[session.currentTrialIndex + 1] ?? null)
        : trial.nextTrialId;
    const projectedOrderIndex = session.currentTrialIndex + 1;

    return {
      sessionId: session.id,
      experimentId: session.experimentId,
      experimentTitle: snapshot.title,
      status: session.status,
      executionState: session.executionState,
      currentTrialIndex: session.currentTrialIndex,
      totalTrials: session.totalTrials,
      currentTrial: this.stripTrial(trial, projectedNextTrialId, projectedOrderIndex),
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
   * Advances the session sequence based on branching (Phase 7), trialOrder (Phase 6), or linear pointer (Phase 3).
   * Precedence:
   * 1. If current trial has branching -> branching determines next trial based on response correctness.
   * 2. Otherwise:
   *    - If randomized session -> follows session.trialOrder
   *    - If linear session -> follows currentTrial.nextTrialId pointer
   */
  advanceLinearSequence(
    session: SessionContext,
    snapshot: Experiment,
    submittedTrialId: string,
    isCorrect?: boolean | null
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

    // 1. Dynamic Conditional Branching (Phase 7): If current trial has branching, it takes precedence
    if (hasCorrectnessBranching(currentTrial.branching)) {
      const targetTrialId =
        isCorrect === true
          ? currentTrial.branching.ifCorrect
          : currentTrial.branching.ifIncorrect;

      const nextTrial = snapshot.trials.find((t) => t.id === targetTrialId);
      if (!nextTrial) {
        throw new BadRequestError(
          `Corrupted branching pointer: target trial '${targetTrialId}' missing from snapshot`,
          'TRIAL_NOT_FOUND'
        );
      }

      let nextTrialIndex = session.currentTrialIndex + 1;
      let projectedNextTrialId: string | null = nextTrial.nextTrialId;

      if (session.randomizationEnabled && session.trialOrder && session.trialOrder.length > 0) {
        const targetPos = session.trialOrder.indexOf(targetTrialId);
        if (targetPos >= 0) {
          nextTrialIndex = targetPos;
          projectedNextTrialId = session.trialOrder[targetPos + 1] ?? null;
        }
      }

      return {
        sessionStatus: 'IN_PROGRESS',
        executionState: 'AWAITING_RESPONSE',
        nextTrialId: nextTrial.id,
        nextTrialIndex,
        nextTrial: this.stripTrial(nextTrial, projectedNextTrialId, nextTrialIndex + 1),
        isCompleted: false,
        completionMessage: null,
      };
    }

    // 2. Non-branching: If randomized session, follow session.trialOrder
    if (session.randomizationEnabled && session.trialOrder && session.trialOrder.length > 0) {
      const nextTrialIndex = session.currentTrialIndex + 1;

      // Terminal trial reached
      if (nextTrialIndex >= session.trialOrder.length) {
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

      const nextTrialId = session.trialOrder[nextTrialIndex]!;
      const nextTrial = snapshot.trials.find((t) => t.id === nextTrialId);
      if (!nextTrial) {
        throw new BadRequestError(
          `Corrupted progression pointer: next trial '${nextTrialId}' missing from snapshot`,
          'TRIAL_NOT_FOUND'
        );
      }

      const projectedNextTrialId = session.trialOrder[nextTrialIndex + 1] ?? null;

      return {
        sessionStatus: 'IN_PROGRESS',
        executionState: 'AWAITING_RESPONSE',
        nextTrialId: nextTrial.id,
        nextTrialIndex,
        nextTrial: this.stripTrial(nextTrial, projectedNextTrialId, nextTrialIndex + 1),
        isCompleted: false,
        completionMessage: null,
      };
    }

    // 3. Non-branching & Non-randomized: Follow currentTrial.nextTrialId
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
  stripTrial(
    trial: Trial,
    projectedNextTrialId?: string | null,
    projectedOrderIndex?: number
  ): ParticipantTrial {
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
      orderIndex: projectedOrderIndex !== undefined ? projectedOrderIndex : trial.orderIndex,
      label: trial.label,
      instructions: trial.instructions,
      fixation: trial.fixation,
      stimulus: trial.stimulus,
      timingConfig: trial.timingConfig,
      expectedResponse: strippedExpected,
      nextTrialId: projectedNextTrialId !== undefined ? projectedNextTrialId : trial.nextTrialId,
      branching: null,
    };
  }
}
