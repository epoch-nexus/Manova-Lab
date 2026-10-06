import { prisma } from '../db/prisma.js';
import {
  createExperimentSchema,
  updateExperimentSchema,
  publishValidationSchema,
} from '../schemas/experiment.schema.js';
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
} from '../server/errors.js';
import { buildZodErrorPayload } from '../server/middleware/errorHandler.js';
import type {
  Experiment,
  Trial,
  PublishExperimentResponse,
} from '../types/experiment.d.ts';
import { Prisma } from '@prisma/client';
import { auditService } from './audit.service.js';
import { randomUUID } from 'crypto';

export class ExperimentService {
  /**
   * Helper to build standardized experiment list item representation.
   */
  toListItem(exp: {
    id: string;
    title: string;
    description: string;
    status: string;
    version: number;
    publicSlug: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    trialCount?: number;
    _count?: { trials: number };
  }) {
    return {
      id: exp.id,
      title: exp.title,
      description: exp.description,
      status: exp.status,
      version: exp.version,
      publicSlug: exp.publicSlug,
      trialCount: exp.trialCount ?? exp._count?.trials ?? 0,
      createdAt: typeof exp.createdAt === 'string' ? exp.createdAt : exp.createdAt.toISOString(),
      updatedAt: typeof exp.updatedAt === 'string' ? exp.updatedAt : exp.updatedAt.toISOString(),
    };
  }

  /**
   * Creates a new experiment in DRAFT status.
   */
  async createExperiment(input: unknown, researcherId: string) {
    if (!researcherId) {
      throw new UnauthorizedError('Authentication required');
    }

    const parsed = createExperimentSchema.safeParse(input);
    if (!parsed.success) {
      const errPayload = buildZodErrorPayload(parsed.error, 'INVALID_EXPERIMENT');
      throw new AppError(400, 'INVALID_EXPERIMENT', errPayload.message, errPayload.details, errPayload.fieldErrors);
    }
    const validated = parsed.data;

    try {
      const { created, trialIdMap } = await prisma.$transaction(async (tx) => {
        let trialIdMap: Record<string, string> = {};
        let prismaTrials: Prisma.TrialCreateWithoutExperimentInput[] | undefined;

        if (validated.trials && validated.trials.length > 0) {
          const incomingTrialIds = validated.trials.map((t) => t.id).filter(Boolean);
          const incomingStimulusIds = validated.trials
            .map((t) => t.stimulus?.id)
            .filter(Boolean);

          const existingTrials =
            incomingTrialIds.length > 0
              ? await tx.trial.findMany({
                  where: { id: { in: incomingTrialIds } },
                  select: { id: true },
                })
              : [];

          const existingStimuli =
            incomingStimulusIds.length > 0
              ? await tx.stimulus.findMany({
                  where: { id: { in: incomingStimulusIds } },
                  select: { id: true },
                })
              : [];

          const collidingTrialIds = new Set(existingTrials.map((t) => t.id));
          const collidingStimulusIds = new Set(existingStimuli.map((s) => s.id));

          trialIdMap = {};
          for (const t of validated.trials) {
            trialIdMap[t.id] = collidingTrialIds.has(t.id) ? randomUUID() : t.id;
          }

          const stimulusIdMap: Record<string, string> = {};
          for (const t of validated.trials) {
            if (t.stimulus?.id) {
              stimulusIdMap[t.stimulus.id] = collidingStimulusIds.has(t.stimulus.id)
                ? randomUUID()
                : t.stimulus.id;
            }
          }

          prismaTrials = this.mapTrialsToPrismaCreate(
            validated.trials,
            trialIdMap,
            stimulusIdMap
          );
        }

        const exp = await tx.experiment.create({
          data: {
            title: validated.title,
            description: validated.description,
            publicSlug: validated.publicSlug,
            generalInstructions: validated.generalInstructions ?? null,
            completionMessage: validated.completionMessage ?? null,
            config: (validated.config ?? {
              displayMode: 'fullscreen',
              backgroundColor: '#0F172A',
              allowPause: false,
              showFeedback: true,
            }) as Prisma.InputJsonValue,
            status: 'DRAFT',
            version: 1,
            ownerResearcherId: researcherId,
            trials:
              prismaTrials && prismaTrials.length > 0
                ? {
                    create: prismaTrials,
                  }
                : undefined,
          },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            version: true,
            ownerResearcherId: true,
            publicSlug: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return { created: exp, trialIdMap };
      });

      await auditService.log({
        researcherId,
        eventType: 'EXPERIMENT_CREATED',
        resourceId: created.id,
        metadata: { publicSlug: created.publicSlug, title: created.title },
      });

      return {
        ...this.toListItem({
          ...created,
          trialCount: validated.trials?.length ?? 0,
        }),
        ownerResearcherId: created.ownerResearcherId,
        trialIdMap,
      };
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError(
          'Resource conflict: one or more unique identifiers or constraints already exist',
          'INVALID_EXPERIMENT'
        );
      }
      throw err;
    }
  }

  /**
   * Lists all experiments owned by the researcher.
   */
  async listExperiments(researcherId: string) {
    if (!researcherId) {
      throw new UnauthorizedError('Authentication required');
    }

    const experiments = await prisma.experiment.findMany({
      where: { ownerResearcherId: researcherId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { trials: true },
        },
      },
    });

    return {
      experiments: experiments.map((exp) => this.toListItem(exp)),
      total: experiments.length,
    };
  }

  /**
   * Retrieves full experiment definition with trials, stimuli, and expected responses.
   * Returns 404 EXPERIMENT_NOT_FOUND if missing or not owned by researcherId.
   */
  async getExperimentById(id: string, researcherId: string): Promise<Experiment> {
    if (!researcherId) {
      throw new UnauthorizedError('Authentication required');
    }

    const exp = await prisma.experiment.findFirst({
      where: { id, ownerResearcherId: researcherId },
      include: {
        trials: {
          orderBy: { orderIndex: 'asc' },
          include: {
            stimulus: true,
            expectedResponse: true,
          },
        },
      },
    });

    if (!exp) {
      throw new NotFoundError(`Experiment '${id}' not found`, 'EXPERIMENT_NOT_FOUND');
    }

    return this.formatExperiment(exp);
  }

  /**
   * Updates an existing experiment.
   * Existence, ownership, and status reads are executed within a locked transaction.
   * Partial config is merged over stored config.
   */
  async updateExperiment(id: string, input: unknown, researcherId: string) {
    if (!researcherId) {
      throw new UnauthorizedError('Authentication required');
    }

    const parsed = updateExperimentSchema.safeParse(input);
    if (!parsed.success) {
      const errPayload = buildZodErrorPayload(parsed.error, 'INVALID_EXPERIMENT');
      throw new AppError(400, 'INVALID_EXPERIMENT', errPayload.message, errPayload.details, errPayload.fieldErrors);
    }
    const validated = parsed.data;

    try {
      const { updated, trialIdMap } = await prisma.$transaction(async (tx) => {
        // Row lock
        await tx.$queryRaw`SELECT id FROM experiments WHERE id = ${id} FOR UPDATE`;

        // Read existence & ownership inside transaction
        const existing = await tx.experiment.findFirst({
          where: { id, ownerResearcherId: researcherId },
        });

        if (!existing) {
          throw new NotFoundError(`Experiment '${id}' not found`, 'EXPERIMENT_NOT_FOUND');
        }

        const isPublished = existing.status === 'PUBLISHED';
        const newVersion = isPublished ? existing.version + 1 : existing.version;
        const newStatus = isPublished ? 'DRAFT' : existing.status;

        // Merge partial config over stored config
        const mergedConfig = validated.config
          ? {
              ...((existing.config as Record<string, unknown>) ?? {}),
              ...validated.config,
            }
          : existing.config;

        let trialIdMap: Record<string, string> = {};
        let prismaTrials: Prisma.TrialCreateWithoutExperimentInput[] | undefined;

        // If trials are being replaced, resolve collisions with other experiments and recreate
        if (validated.trials) {
          const incomingTrialIds = validated.trials.map((t) => t.id).filter(Boolean);
          const incomingStimulusIds = validated.trials
            .map((t) => t.stimulus?.id)
            .filter(Boolean);

          const existingTrials =
            incomingTrialIds.length > 0
              ? await tx.trial.findMany({
                  where: { id: { in: incomingTrialIds } },
                  select: { id: true, experimentId: true },
                })
              : [];

          const existingStimuli =
            incomingStimulusIds.length > 0
              ? await tx.stimulus.findMany({
                  where: { id: { in: incomingStimulusIds } },
                  select: { id: true, trial: { select: { experimentId: true } } },
                })
              : [];

          // Colliding IDs: exist under a DIFFERENT experiment
          const collidingTrialIds = new Set(
            existingTrials.filter((t) => t.experimentId !== id).map((t) => t.id)
          );
          const collidingStimulusIds = new Set(
            existingStimuli
              .filter((s) => s.trial?.experimentId !== id)
              .map((s) => s.id)
          );

          trialIdMap = {};
          for (const t of validated.trials) {
            trialIdMap[t.id] = collidingTrialIds.has(t.id) ? randomUUID() : t.id;
          }

          const stimulusIdMap: Record<string, string> = {};
          for (const t of validated.trials) {
            if (t.stimulus?.id) {
              stimulusIdMap[t.stimulus.id] = collidingStimulusIds.has(t.stimulus.id)
                ? randomUUID()
                : t.stimulus.id;
            }
          }

          await tx.trial.deleteMany({ where: { experimentId: id } });

          prismaTrials = this.mapTrialsToPrismaCreate(
            validated.trials,
            trialIdMap,
            stimulusIdMap
          );
        }

        const expUpdated = await tx.experiment.update({
          where: { id },
          data: {
            title: validated.title,
            description: validated.description,
            publicSlug: validated.publicSlug,
            generalInstructions: validated.generalInstructions,
            completionMessage: validated.completionMessage,
            status: newStatus,
            version: newVersion,
            config: mergedConfig as Prisma.InputJsonValue,
            trials: prismaTrials
              ? {
                  create: prismaTrials,
                }
              : undefined,
          },
          select: {
            id: true,
            title: true,
            status: true,
            version: true,
            updatedAt: true,
          },
        });

        return { updated: expUpdated, trialIdMap };
      });

      await auditService.log({
        researcherId,
        eventType: 'EXPERIMENT_UPDATED',
        resourceId: id,
        metadata: { version: updated.version },
      });

      return {
        ...updated,
        trialIdMap,
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError(
          'Resource conflict: one or more unique identifiers or constraints already exist',
          'EXPERIMENT_ALREADY_PUBLISHED'
        );
      }
      throw err;
    }
  }

  /**
   * Deletes an experiment.
   * If any session exists, throws 409 EXPERIMENT_HAS_DATA unless force === true.
   */
  async deleteExperiment(
    id: string,
    researcherId: string,
    force = false
  ): Promise<void> {
    if (!researcherId) {
      throw new UnauthorizedError('Authentication required');
    }

    const existing = await prisma.experiment.findFirst({
      where: { id, ownerResearcherId: researcherId },
    });

    if (!existing) {
      throw new NotFoundError(`Experiment '${id}' not found`, 'EXPERIMENT_NOT_FOUND');
    }

    const sessionCount = await prisma.session.count({
      where: { experimentId: id },
    });

    if (sessionCount > 0 && !force) {
      throw new ConflictError(
        `Cannot delete experiment '${id}' because it has ${sessionCount} participant session(s). Use ?force=true to override.`,
        'EXPERIMENT_HAS_DATA'
      );
    }

    if (sessionCount > 0 && force) {
      const responseCount = await prisma.sessionResponse.count({
        where: { session: { experimentId: id } },
      });

      await prisma.experiment.delete({ where: { id } });

      await auditService.log({
        researcherId,
        eventType: 'EXPERIMENT_DELETED',
        resourceId: id,
        metadata: {
          forced: true,
          sessionCount,
          responseCount,
        },
      });
      return;
    }

    await prisma.experiment.delete({ where: { id } });

    await auditService.log({
      researcherId,
      eventType: 'EXPERIMENT_DELETED',
      resourceId: id,
    });
  }

  /**
   * Publishes an experiment:
   * 1. Validates all trials, stimuli, timing, and progression pointers
   * 2. Freezes snapshot into ExperimentVersion (using create, not upsert)
   * 3. Transitions status to PUBLISHED
   * Read + validate + write in ONE locked transaction.
   * If already PUBLISHED, throws 409 EXPERIMENT_ALREADY_PUBLISHED.
   */
  async publishExperiment(
    id: string,
    researcherId: string
  ): Promise<PublishExperimentResponse> {
    if (!researcherId) {
      throw new UnauthorizedError('Authentication required');
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Row lock
        await tx.$queryRaw`SELECT id FROM experiments WHERE id = ${id} FOR UPDATE`;

        const exp = await tx.experiment.findFirst({
          where: { id, ownerResearcherId: researcherId },
          include: {
            trials: {
              orderBy: { orderIndex: 'asc' },
              include: {
                stimulus: true,
                expectedResponse: true,
              },
            },
          },
        });

        if (!exp) {
          throw new NotFoundError(
            `Experiment '${id}' not found`,
            'EXPERIMENT_NOT_FOUND'
          );
        }

        if (exp.status === 'PUBLISHED') {
          throw new ConflictError(
            `Experiment '${id}' is already published.`,
            'EXPERIMENT_ALREADY_PUBLISHED'
          );
        }

        const fullExperiment = this.formatExperiment(exp);

        // Validate completeness for publishing
        const validationResult = publishValidationSchema.safeParse(fullExperiment);
        if (!validationResult.success) {
          const details = validationResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }));
          throw new ValidationError(
            `Cannot publish experiment: ${validationResult.error.errors[0]?.message}`,
            details
          );
        }

        const snapshotId = `snap_${fullExperiment.id}_v${fullExperiment.version}`;
        const publishedAt = new Date();

        // Create immutable snapshot (create, not upsert)
        await tx.experimentVersion.create({
          data: {
            snapshotId,
            version: fullExperiment.version,
            publicSlug: fullExperiment.publicSlug,
            publishedAt,
            snapshotData: fullExperiment as unknown as Prisma.InputJsonValue,
            experimentId: fullExperiment.id,
          },
        });

        // Update experiment status
        const updated = await tx.experiment.update({
          where: { id },
          data: {
            status: 'PUBLISHED',
            publishedAt,
          },
        });

        return {
          experimentId: updated.id,
          version: updated.version,
          publicSlug: updated.publicSlug,
          publishedAt: publishedAt.toISOString(),
          status: 'PUBLISHED' as const,
        };
      });

      await auditService.log({
        researcherId,
        eventType: 'EXPERIMENT_PUBLISHED',
        resourceId: id,
        metadata: { version: result.version, publicSlug: result.publicSlug },
      });

      return result;
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError(
          'Experiment is already published or version snapshot already exists',
          'EXPERIMENT_ALREADY_PUBLISHED'
        );
      }
      throw err;
    }
  }

  /**
   * Maps trial definitions to Prisma create format.
   * Rewrites trial IDs, nextTrialId, branching targets, and stimulus IDs using the provided maps.
   */
  mapTrialsToPrismaCreate(
    trials: any[],
    trialIdMap: Record<string, string> = {},
    stimulusIdMap: Record<string, string> = {}
  ): Prisma.TrialCreateWithoutExperimentInput[] {
    const prismaTrials = trials.map((t) => {
      const remappedTrialId = trialIdMap[t.id] ?? t.id;
      const remappedNextTrialId = t.nextTrialId
        ? (trialIdMap[t.nextTrialId] ?? t.nextTrialId)
        : null;

      let remappedBranching: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue = Prisma.JsonNull;
      if (t.branching) {
        remappedBranching = {
          ...t.branching,
          ifCorrect: t.branching.ifCorrect
            ? (trialIdMap[t.branching.ifCorrect] ?? t.branching.ifCorrect)
            : null,
          ifIncorrect: t.branching.ifIncorrect
            ? (trialIdMap[t.branching.ifIncorrect] ?? t.branching.ifIncorrect)
            : null,
        } as unknown as Prisma.InputJsonValue;
      }

      const remappedStimulusId = t.stimulus?.id
        ? (stimulusIdMap[t.stimulus.id] ?? t.stimulus.id)
        : undefined;

      return {
        id: remappedTrialId,
        orderIndex: t.orderIndex,
        label: t.label ?? null,
        instructions: t.instructions ?? null,
        fixation: t.fixation
          ? (t.fixation as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        timingConfig: t.timingConfig as unknown as Prisma.InputJsonValue,
        nextTrialId: remappedNextTrialId,
        branching: remappedBranching,
        stimulus: t.stimulus
          ? {
              create: {
                id: remappedStimulusId,
                type: String(t.stimulus.type),
                content: t.stimulus.type === 'text' ? t.stimulus.content : null,
                url: t.stimulus.type === 'image' ? t.stimulus.url : null,
                altText:
                  t.stimulus.type === 'image' ? (t.stimulus.altText ?? null) : null,
                styling: t.stimulus.styling
                  ? (t.stimulus.styling as unknown as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
                metadata: t.stimulus.metadata
                  ? (t.stimulus.metadata as unknown as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              },
            }
          : undefined,
        expectedResponse: t.expectedResponse
          ? {
              create: {
                type: String(t.expectedResponse.type),
                allowedKeys:
                  t.expectedResponse.type === 'keypress'
                    ? t.expectedResponse.allowedKeys
                    : [],
                allowedButtons:
                  t.expectedResponse.type === 'button_click'
                    ? t.expectedResponse.allowedButtons
                    : [],
                correctResponse: t.expectedResponse.correctResponse ?? null,
                evaluationMode: String(t.expectedResponse.evaluationMode),
              },
            }
          : undefined,
      };
    });

    (prismaTrials as any).trialIdMap = trialIdMap;
    return prismaTrials;
  }

  /**
   * Formats raw Prisma record into typed Experiment entity.
   */
  private formatExperiment(exp: any): Experiment {
    return {
      id: exp.id,
      title: exp.title,
      description: exp.description,
      status: exp.status,
      version: exp.version,
      ownerResearcherId: exp.ownerResearcherId,
      publicSlug: exp.publicSlug,
      generalInstructions: exp.generalInstructions,
      completionMessage: exp.completionMessage,
      config: exp.config,
      trials: (exp.trials || []).map(
        (t: any): Trial => ({
          id: t.id,
          orderIndex: t.orderIndex,
          label: t.label,
          instructions: t.instructions,
          fixation: t.fixation,
          timingConfig: t.timingConfig,
          nextTrialId: t.nextTrialId,
          branching: t.branching,
          stimulus: t.stimulus
            ? t.stimulus.type === 'text'
              ? {
                  id: t.stimulus.id,
                  type: 'text',
                  content: t.stimulus.content ?? '',
                  styling: t.stimulus.styling ?? undefined,
                  metadata: t.stimulus.metadata ?? undefined,
                }
              : {
                  id: t.stimulus.id,
                  type: 'image',
                  url: t.stimulus.url ?? '',
                  altText: t.stimulus.altText ?? undefined,
                  styling: t.stimulus.styling ?? undefined,
                  metadata: t.stimulus.metadata ?? undefined,
                }
            : ({} as any),
          expectedResponse: t.expectedResponse
            ? {
                type: t.expectedResponse.type as 'keypress' | 'button_click',
                allowedKeys: t.expectedResponse.allowedKeys ?? [],
                allowedButtons: t.expectedResponse.allowedButtons ?? [],
                correctResponse: t.expectedResponse.correctResponse ?? undefined,
                evaluationMode: t.expectedResponse.evaluationMode as
                  | 'exact_match'
                  | 'none',
              }
            : ({} as any),
        })
      ),
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
      publishedAt: exp.publishedAt ? exp.publishedAt.toISOString() : null,
    };
  }
}
