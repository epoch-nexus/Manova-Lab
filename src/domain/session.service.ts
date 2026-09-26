import { prisma } from '../db/prisma.js';
import { ExecutionEngine } from '../engine/execution-engine.js';
import {
  startSessionSchema,
  submitResponseSchema,
} from '../schemas/participant.schema.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../server/errors.js';
import type { Experiment } from '../types/experiment.d.ts';
import type { ExecutionStep, ParticipantTrial } from '../engine/execution-state.js';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

export interface StartSessionResult {
  sessionId: string;
  experimentId: string;
  experimentTitle: string;
  generalInstructions?: string | null;
  totalTrials: number;
  firstTrial: ParticipantTrial;
}

export interface SubmitResponseApiResult {
  responseId: string;
  isCorrect?: boolean | null;
  sessionStatus: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  nextTrial: ParticipantTrial | null;
  isCompleted: boolean;
  completionMessage?: string | null;
}

export class SessionService {
  private engine = new ExecutionEngine();

  /**
   * Initializes an anonymous participant session bound to the latest published snapshot.
   */
  async startSession(
    experimentSlugOrId: string,
    rawInput?: unknown
  ): Promise<StartSessionResult> {
    const validated = startSessionSchema.parse(rawInput ?? {});

    // 1. Locate experiment by publicSlug or id
    const experiment = await prisma.experiment.findFirst({
      where: {
        OR: [{ publicSlug: experimentSlugOrId }, { id: experimentSlugOrId }],
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!experiment) {
      throw new NotFoundError(
        `Experiment '${experimentSlugOrId}' not found`,
        'EXPERIMENT_NOT_FOUND'
      );
    }

    if (experiment.status !== 'PUBLISHED') {
      throw new ConflictError(
        'This study is in draft status and not accepting participants.',
        'EXPERIMENT_NOT_PUBLISHED'
      );
    }

    const latestVersion = experiment.versions[0];
    if (!latestVersion) {
      throw new NotFoundError(
        'No published version available for this experiment',
        'EXPERIMENT_NOT_FOUND'
      );
    }

    const snapshot = latestVersion.snapshotData as unknown as Experiment;
    if (!snapshot.trials || snapshot.trials.length === 0) {
      throw new BadRequestError('Published experiment snapshot contains no trials');
    }

    const firstTrial = snapshot.trials[0]!;
    const sessionId = `sess_${crypto.randomUUID()}`;
    const participantId = `part_anon_${crypto.randomUUID()}`;

    // 2. Persist session permanently bound to this snapshotId
    await prisma.session.create({
      data: {
        id: sessionId,
        participantId,
        status: 'IN_PROGRESS',
        executionState: 'AWAITING_RESPONSE',
        currentTrialId: firstTrial.id,
        currentTrialIndex: 0,
        totalTrials: snapshot.trials.length,
        clientEnvironment: (validated.clientEnvironment ?? {}) as Prisma.InputJsonValue,
        experimentId: experiment.id,
        experimentVersion: latestVersion.version,
        experimentSnapshotId: latestVersion.snapshotId,
      },
    });

    return {
      sessionId,
      experimentId: experiment.id,
      experimentTitle: snapshot.title,
      generalInstructions: snapshot.generalInstructions,
      totalTrials: snapshot.trials.length,
      firstTrial: this.engine.stripTrial(firstTrial),
    };
  }

  /**
   * Retrieves the current execution step derived from the locked snapshot.
   */
  async getCurrentStep(sessionId: string): Promise<ExecutionStep> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        version: true,
      },
    });

    if (!session) {
      throw new NotFoundError(`Session '${sessionId}' not found`, 'SESSION_NOT_FOUND');
    }

    const snapshot = session.version.snapshotData as unknown as Experiment;

    return this.engine.resolveCurrentStep(
      {
        id: session.id,
        experimentId: session.experimentId,
        status: session.status,
        executionState: session.executionState,
        currentTrialId: session.currentTrialId,
        currentTrialIndex: session.currentTrialIndex,
        totalTrials: session.totalTrials,
      },
      snapshot
    );
  }

  /**
   * Accepts participant response and atomically advances session along linear sequence.
   */
  async submitResponse(
    sessionId: string,
    trialId: string,
    rawInput: unknown
  ): Promise<SubmitResponseApiResult> {
    const validated = submitResponseSchema.parse(rawInput ?? {});

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch session with snapshot data
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: {
          version: true,
        },
      });

      if (!session) {
        throw new NotFoundError(`Session '${sessionId}' not found`, 'SESSION_NOT_FOUND');
      }

      if (session.status === 'COMPLETED') {
        throw new ConflictError(
          'This session has already ended.',
          'SESSION_ALREADY_COMPLETED'
        );
      }

      if (session.status === 'ABANDONED') {
        throw new ConflictError(
          'This session was abandoned.',
          'SESSION_ALREADY_COMPLETED'
        );
      }

      // 2. Prevent stale or out-of-order trial responses
      if (session.currentTrialId !== trialId) {
        throw new BadRequestError(
          `Trial response out of sequence. Active trial is '${session.currentTrialId}'.`,
          'INVALID_RESPONSE'
        );
      }

      const snapshot = session.version.snapshotData as unknown as Experiment;
      const currentTrial = snapshot.trials.find((t) => t.id === trialId);
      if (!currentTrial) {
        throw new NotFoundError(`Trial '${trialId}' not found in snapshot`, 'TRIAL_NOT_FOUND');
      }

      // 3. Validate response according to expected response criteria
      this.engine.validateResponse(currentTrial, validated.submittedResponse ?? null);

      // Evaluate correctness against the frozen ExperimentVersion snapshot
      let isCorrect: boolean | null = null;
      if (currentTrial.expectedResponse.evaluationMode === 'exact_match') {
        if (validated.timedOut || !validated.submittedResponse) {
          isCorrect = false;
        } else {
          isCorrect =
            validated.submittedResponse === currentTrial.expectedResponse.correctResponse;
        }
      } else if (currentTrial.expectedResponse.evaluationMode === 'none') {
        isCorrect = null;
      }

      // 4. Record session response with timing telemetry (enforces unique constraint per session & trial)
      const responseId = `resp_${crypto.randomUUID()}`;
      await tx.sessionResponse.create({
        data: {
          id: responseId,
          sessionId: session.id,
          trialId: trialId,
          submittedResponse: validated.submittedResponse ?? null,
          isCorrect,
          reactionTimeMs: validated.reactionTimeMs ?? null,
          timedOut: validated.timedOut ?? false,
          timingMeasurement: (validated.timingMeasurement ?? Prisma.DbNull) as Prisma.InputJsonValue,
          clientMetadata: (validated.clientMetadata ?? Prisma.DbNull) as Prisma.InputJsonValue,
        },
      });

      // 5. Advance linear state machine
      const transition = this.engine.advanceLinearSequence(
        {
          id: session.id,
          experimentId: session.experimentId,
          status: session.status,
          executionState: session.executionState,
          currentTrialId: session.currentTrialId,
          currentTrialIndex: session.currentTrialIndex,
          totalTrials: session.totalTrials,
        },
        snapshot,
        trialId
      );

      // 6. Update session in database
      await tx.session.update({
        where: { id: sessionId },
        data: {
          status: transition.sessionStatus,
          executionState: transition.executionState,
          currentTrialId: transition.nextTrialId,
          currentTrialIndex: transition.nextTrialIndex,
          completedAt: transition.isCompleted ? new Date() : null,
        },
      });

      if (transition.isCompleted) {
        return {
          responseId,
          isCorrect,
          sessionStatus: 'COMPLETED',
          nextTrial: null,
          isCompleted: true,
          completionMessage: transition.completionMessage,
        };
      }

      return {
        responseId,
        isCorrect,
        sessionStatus: 'IN_PROGRESS',
        nextTrial: transition.nextTrial,
        isCompleted: false,
      };
    });
  }

  /**
   * Explicitly abandons a session upon participant exit or consent withdrawal.
   */
  async abandonSession(sessionId: string): Promise<{ sessionId: string; status: 'ABANDONED' }> {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundError(`Session '${sessionId}' not found`, 'SESSION_NOT_FOUND');
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'ABANDONED',
      },
    });

    return {
      sessionId,
      status: 'ABANDONED',
    };
  }
}
