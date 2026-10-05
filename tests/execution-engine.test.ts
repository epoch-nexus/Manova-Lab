import { ExecutionEngine } from '../src/engine/execution-engine.js';
import type { Experiment } from '../src/types/experiment.d.ts';

describe('ExecutionEngine Unit Tests', () => {
  const engine = new ExecutionEngine();

  const mockExperiment: Experiment = {
    id: 'exp_11111111-1111-4111-8111-111111111111',
    title: 'Test Reaction Time Study',
    description: 'Unit test experiment definition',
    status: 'PUBLISHED',
    version: 1,
    ownerResearcherId: 'res_11111111-1111-4111-8111-111111111111',
    publicSlug: 'test-study',
    generalInstructions: 'Look at the cross and respond.',
    completionMessage: 'Well done! Study complete.',
    config: {
      displayMode: 'fullscreen',
      backgroundColor: '#0F172A',
      allowPause: false,
      showFeedback: true,
    },
    trials: [
      {
        id: 'trial_11111111-1111-4111-8111-111111111111',
        orderIndex: 1,
        label: 'Trial 1',
        instructions: 'Press Space',
        fixation: {
          enabled: true,
          durationMs: 500,
          symbol: '+',
        },
        stimulus: {
          id: 'stim_11111111-1111-4111-8111-111111111111',
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
          allowedKeys: ['Space', 'KeyF'],
          correctResponse: 'Space',
          evaluationMode: 'exact_match',
        },
        nextTrialId: 'trial_22222222-2222-4222-8222-222222222222',
        branching: null,
      },
      {
        id: 'trial_22222222-2222-4222-8222-222222222222',
        orderIndex: 2,
        label: 'Trial 2',
        instructions: null,
        stimulus: {
          id: 'stim_22222222-2222-4222-8222-222222222222',
          type: 'text',
          content: 'PROBE',
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
        branching: null,
      },
    ],
    createdAt: '2026-09-26T10:00:00.000Z',
    updatedAt: '2026-09-26T10:00:00.000Z',
    publishedAt: '2026-09-26T10:00:00.000Z',
  };

  describe('resolveCurrentStep', () => {
    it('should return initial step and strip correctResponse from participant trial', () => {
      const step = engine.resolveCurrentStep(
        {
          id: 'sess_1',
          experimentId: mockExperiment.id,
          status: 'IN_PROGRESS',
          executionState: 'AWAITING_RESPONSE',
          currentTrialId: mockExperiment.trials[0]!.id,
          currentTrialIndex: 0,
          totalTrials: 2,
        },
        mockExperiment
      );

      expect(step.sessionId).toBe('sess_1');
      expect(step.status).toBe('IN_PROGRESS');
      expect(step.currentTrial).not.toBeNull();
      expect(step.currentTrial?.id).toBe(mockExperiment.trials[0]!.id);
      expect((step.currentTrial?.stimulus as any).content).toBe('TARGET');
      expect((step.currentTrial?.expectedResponse as any).correctResponse).toBeUndefined();
      expect((step.currentTrial?.expectedResponse as any).allowedKeys).toEqual(['Space', 'KeyF']);
      expect(step.generalInstructions).toBe('Look at the cross and respond.');
      expect(step.isCompleted).toBe(false);
    });

    it('should return completion step when session is COMPLETED', () => {
      const step = engine.resolveCurrentStep(
        {
          id: 'sess_1',
          experimentId: mockExperiment.id,
          status: 'COMPLETED',
          executionState: 'COMPLETE',
          currentTrialId: null,
          currentTrialIndex: 1,
          totalTrials: 2,
        },
        mockExperiment
      );

      expect(step.status).toBe('COMPLETED');
      expect(step.executionState).toBe('COMPLETE');
      expect(step.currentTrial).toBeNull();
      expect(step.completionMessage).toBe('Well done! Study complete.');
      expect(step.isCompleted).toBe(true);
    });
  });

  describe('validateResponse', () => {
    it('should accept an allowed keypress response', () => {
      expect(() => {
        engine.validateResponse(mockExperiment.trials[0]!, 'Space', false, 250);
      }).not.toThrow();

      expect(() => {
        engine.validateResponse(mockExperiment.trials[0]!, 'KeyF', false, 250);
      }).not.toThrow();
    });

    it('should accept null (timeout/non-response)', () => {
      expect(() => {
        engine.validateResponse(mockExperiment.trials[0]!, null, true, null);
      }).not.toThrow();
    });

    it('should reject a disallowed keypress response', () => {
      expect(() => {
        engine.validateResponse(mockExperiment.trials[0]!, 'KeyZ', false, 250);
      }).toThrow('Invalid response');
    });
  });

  describe('advanceLinearSequence', () => {
    it('should advance from Trial 1 to Trial 2', () => {
      const transition = engine.advanceLinearSequence(
        {
          id: 'sess_1',
          experimentId: mockExperiment.id,
          status: 'IN_PROGRESS',
          executionState: 'AWAITING_RESPONSE',
          currentTrialId: mockExperiment.trials[0]!.id,
          currentTrialIndex: 0,
          totalTrials: 2,
        },
        mockExperiment,
        mockExperiment.trials[0]!.id
      );

      expect(transition.sessionStatus).toBe('IN_PROGRESS');
      expect(transition.executionState).toBe('AWAITING_RESPONSE');
      expect(transition.nextTrialId).toBe(mockExperiment.trials[1]!.id);
      expect(transition.nextTrialIndex).toBe(1);
      expect(transition.nextTrial?.id).toBe(mockExperiment.trials[1]!.id);
      expect(transition.isCompleted).toBe(false);
    });

    it('should transition to COMPLETE when final trial response is submitted', () => {
      const transition = engine.advanceLinearSequence(
        {
          id: 'sess_1',
          experimentId: mockExperiment.id,
          status: 'IN_PROGRESS',
          executionState: 'AWAITING_RESPONSE',
          currentTrialId: mockExperiment.trials[1]!.id,
          currentTrialIndex: 1,
          totalTrials: 2,
        },
        mockExperiment,
        mockExperiment.trials[1]!.id
      );

      expect(transition.sessionStatus).toBe('COMPLETED');
      expect(transition.executionState).toBe('COMPLETE');
      expect(transition.nextTrialId).toBeNull();
      expect(transition.nextTrial).toBeNull();
      expect(transition.isCompleted).toBe(true);
      expect(transition.completionMessage).toBe('Well done! Study complete.');
    });

    it('should reject response for wrong/stale trial ID', () => {
      expect(() => {
        engine.advanceLinearSequence(
          {
            id: 'sess_1',
            experimentId: mockExperiment.id,
            status: 'IN_PROGRESS',
            executionState: 'AWAITING_RESPONSE',
            currentTrialId: mockExperiment.trials[1]!.id, // Currently on Trial 2
            currentTrialIndex: 1,
            totalTrials: 2,
          },
          mockExperiment,
          mockExperiment.trials[0]!.id // Submitting Trial 1
        );
      }).toThrow('Stale or invalid trial response');
    });

    it('should reject response when session is already COMPLETED', () => {
      expect(() => {
        engine.advanceLinearSequence(
          {
            id: 'sess_1',
            experimentId: mockExperiment.id,
            status: 'COMPLETED',
            executionState: 'COMPLETE',
            currentTrialId: null,
            currentTrialIndex: 1,
            totalTrials: 2,
          },
          mockExperiment,
          mockExperiment.trials[1]!.id
        );
      }).toThrow('Session is not in progress');
    });
  });
});
