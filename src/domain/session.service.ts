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
import { generateRandomizationSeed, seededFisherYatesShuffle } from '../randomization/index.js';

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
    experimentSlug: string,
    rawInput?: unknown
  ): Promise<StartSessionResult> {
    const validated = startSessionSchema.parse(rawInput ?? {});

    // 1. Locate experiment by publicSlug only (not by id)
    const experiment = await prisma.experiment.findFirst({
      where: { publicSlug: experimentSlug },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!experiment) {
      throw new NotFoundError(
        `Experiment '${experimentSlug}' not found`,
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

    // Start at the entry trial: lowest orderIndex
    const sortedTrials = [...snapshot.trials].sort((a, b) => a.orderIndex - b.orderIndex);

    const isRandomized = Boolean(snapshot.config?.randomization?.enabled);
    const originalTrialIds = sortedTrials.map((t) => t.id);

    let seed: string | null = null;
    let trialOrder: string[] = originalTrialIds;

    if (isRandomized) {
      seed = generateRandomizationSeed();
      trialOrder = seededFisherYatesShuffle(originalTrialIds, seed);
    }

    const firstTrialId = trialOrder[0]!;
    const firstTrial = snapshot.trials.find((t) => t.id === firstTrialId)!;
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
        randomizationEnabled: isRandomized,
        randomizationSeed: seed,
        trialOrder: trialOrder as unknown as Prisma.InputJsonValue,
        clientEnvironment: (validated.clientEnvironment ?? {}) as Prisma.InputJsonValue,
        experimentId: experiment.id,
        experimentVersion: latestVersion.version,
        experimentSnapshotId: latestVersion.snapshotId,
      },
    });

    const projectedNextTrialId = trialOrder[1] ?? null;

    return {
      sessionId,
      experimentId: experiment.id,
      experimentTitle: snapshot.title,
      generalInstructions: snapshot.generalInstructions,
      totalTrials: snapshot.trials.length,
      firstTrial: this.engine.stripTrial(firstTrial, projectedNextTrialId, 1),
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

    // ABANDONED session: getCurrentStep => 409 SESSION_ALREADY_COMPLETED
    if (session.status === 'ABANDONED') {
      throw new ConflictError(
        'This session was abandoned.',
        'SESSION_ALREADY_COMPLETED'
      );
    }

    const snapshot = session.version.snapshotData as unknown as Experiment;
    const rawTrialOrder = session.trialOrder as string[] | null;

    return this.engine.resolveCurrentStep(
      {
        id: session.id,
        experimentId: session.experimentId,
        status: session.status,
        executionState: session.executionState,
        currentTrialId: session.currentTrialId,
        currentTrialIndex: session.currentTrialIndex,
        totalTrials: session.totalTrials,
        trialOrder: rawTrialOrder,
        randomizationEnabled: session.randomizationEnabled,
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
      const timedOut = validated.timedOut ?? false;
      this.engine.validateResponse(
        currentTrial,
        validated.submittedResponse ?? null,
        timedOut,
        validated.reactionTimeMs ?? null
      );

      // Check that this trial has not already been answered in this session
      const existingResponse = await tx.sessionResponse.findFirst({
        where: { sessionId: session.id, trialId },
        select: { id: true },
      });
      if (existingResponse) {
        // Idempotency replay: return the existing response data and current next step
        const rawTrialOrder = session.trialOrder as string[] | null;
        const replayTransition = this.engine.advanceLinearSequence(
          {
            id: session.id,
            experimentId: session.experimentId,
            status: session.status,
            executionState: session.executionState,
            currentTrialId: session.currentTrialId,
            currentTrialIndex: session.currentTrialIndex,
            totalTrials: session.totalTrials,
            trialOrder: rawTrialOrder,
            randomizationEnabled: session.randomizationEnabled,
          },
          snapshot,
          trialId,
          null
        );
        return {
          responseId: existingResponse.id,
          isCorrect: null,
          sessionStatus: session.status as 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED',
          nextTrial: replayTransition.nextTrial,
          isCompleted: replayTransition.isCompleted,
          completionMessage: replayTransition.completionMessage,
        };
      }

      // Evaluate correctness against the frozen ExperimentVersion snapshot
      let isCorrect: boolean | null = null;
      if (currentTrial.expectedResponse.evaluationMode === 'exact_match') {
        if (timedOut || !validated.submittedResponse) {
          isCorrect = false;
        } else {
          isCorrect =
            validated.submittedResponse === currentTrial.expectedResponse.correctResponse;
        }
      } else if (currentTrial.expectedResponse.evaluationMode === 'none') {
        isCorrect = null;
      }

      // 4. Record session response (enforces unique constraint per session & trial)
      const responseId = `resp_${crypto.randomUUID()}`;
      try {
        await tx.sessionResponse.create({
          data: {
            id: responseId,
            sessionId: session.id,
            trialId: trialId,
            submittedResponse: validated.submittedResponse ?? null,
            isCorrect,
            reactionTimeMs: validated.reactionTimeMs ?? null,
            timedOut: timedOut,
            timingMeasurement: (validated.timingMeasurement ?? Prisma.DbNull) as Prisma.InputJsonValue,
            clientMetadata: (validated.clientMetadata ?? Prisma.DbNull) as Prisma.InputJsonValue,
          },
        });
      } catch (err: unknown) {
        // P2002 unique constraint violation = duplicate submission (race condition)
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          // Idempotent replay
          const existing = await tx.sessionResponse.findFirst({
            where: { sessionId: session.id, trialId },
            select: { id: true },
          });
          const rawTrialOrder = session.trialOrder as string[] | null;
          const replayTransition = this.engine.advanceLinearSequence(
            {
              id: session.id,
              experimentId: session.experimentId,
              status: session.status,
              executionState: session.executionState,
              currentTrialId: session.currentTrialId,
              currentTrialIndex: session.currentTrialIndex,
              totalTrials: session.totalTrials,
              trialOrder: rawTrialOrder,
              randomizationEnabled: session.randomizationEnabled,
            },
            snapshot,
            trialId,
            null
          );
          return {
            responseId: existing?.id ?? responseId,
            isCorrect: null,
            sessionStatus: session.status as 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED',
            nextTrial: replayTransition.nextTrial,
            isCompleted: replayTransition.isCompleted,
            completionMessage: replayTransition.completionMessage,
          };
        }
        throw err;
      }

      const rawTrialOrder = session.trialOrder as string[] | null;

      // 5. Atomically advance session — only if the session is still on this trial
      const updateResult = await tx.session.updateMany({
        where: { id: sessionId, currentTrialId: trialId, status: 'IN_PROGRESS' },
        data: {
          // Temporarily set a sentinel; actual values come from transition below
          // We need the transition first, then update
        },
      });

      if (updateResult.count === 0) {
        // Race condition: session already advanced by a concurrent request
        throw new ConflictError(
          'Session has already advanced past this trial. Concurrent response conflict.',
          'SESSION_ALREADY_COMPLETED'
        );
      }

      // 6. Compute transition after confirming lock
      const transition = this.engine.advanceLinearSequence(
        {
          id: session.id,
          experimentId: session.experimentId,
          status: session.status,
          executionState: session.executionState,
          currentTrialId: session.currentTrialId,
          currentTrialIndex: session.currentTrialIndex,
          totalTrials: session.totalTrials,
          trialOrder: rawTrialOrder,
          randomizationEnabled: session.randomizationEnabled,
        },
        snapshot,
        trialId,
        isCorrect
      );

      // 7. Update session with final values
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

      // Determine isCorrect visibility based on showFeedback config
      const showFeedback = snapshot.config?.showFeedback !== false;

      if (transition.isCompleted) {
        return {
          responseId,
          ...(showFeedback ? { isCorrect } : {}),
          sessionStatus: 'COMPLETED',
          nextTrial: null,
          isCompleted: true,
          completionMessage: transition.completionMessage,
        };
      }

      return {
        responseId,
        ...(showFeedback ? { isCorrect } : {}),
        sessionStatus: 'IN_PROGRESS',
        nextTrial: transition.nextTrial,
        isCompleted: false,
      };
    });
  }

  /**
   * Explicitly abandons a session upon participant exit or consent withdrawal.
   * - IN_PROGRESS => set ABANDONED
   * - Already ABANDONED => idempotent 200
   * - COMPLETED => 409 SESSION_ALREADY_COMPLETED
   */
  async abandonSession(sessionId: string): Promise<{ sessionId: string; status: 'ABANDONED' }> {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundError(`Session '${sessionId}' not found`, 'SESSION_NOT_FOUND');
    }

    if (session.status === 'COMPLETED') {
      throw new ConflictError(
        'Cannot abandon a completed session.',
        'SESSION_ALREADY_COMPLETED'
      );
    }

    // Already ABANDONED: idempotent 200
    if (session.status === 'ABANDONED') {
      return { sessionId, status: 'ABANDONED' };
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'ABANDONED' },
    });

    return { sessionId, status: 'ABANDONED' };
  }
}
