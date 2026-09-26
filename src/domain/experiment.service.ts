import { prisma } from '../db/prisma.js';
import {
  createExperimentSchema,
  updateExperimentSchema,
  publishValidationSchema,
} from '../schemas/experiment.schema.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../server/errors.js';
import type {
  Experiment,
  Trial,
  PublishExperimentResponse,
} from '../types/experiment.d.ts';
import { Prisma } from '@prisma/client';
import { auditService } from './audit.service.js';

export class ExperimentService {
  /**
   * Creates a new experiment in DRAFT status.
   */
  async createExperiment(input: unknown, researcherId: string) {
    const validated = createExperimentSchema.parse(input);

    const created = await prisma.experiment.create({
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
        trials: validated.trials && validated.trials.length > 0
          ? {
              create: this.mapTrialsToPrismaCreate(validated.trials),
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

    await auditService.log({
      researcherId,
      eventType: 'EXPERIMENT_CREATED',
      resourceId: created.id,
      metadata: { publicSlug: created.publicSlug, title: created.title },
    });

    return {
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Lists all experiments owned by the researcher.
   */
  async listExperiments(researcherId?: string) {
    const experiments = await prisma.experiment.findMany({
      where: researcherId ? { ownerResearcherId: researcherId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { trials: true },
        },
      },
    });

    return {
      experiments: experiments.map((exp) => ({
        id: exp.id,
        title: exp.title,
        status: exp.status,
        version: exp.version,
        publicSlug: exp.publicSlug,
        trialCount: exp._count.trials,
        createdAt: exp.createdAt.toISOString(),
        updatedAt: exp.updatedAt.toISOString(),
      })),
      total: experiments.length,
    };
  }

  /**
   * Retrieves full experiment definition with trials, stimuli, and expected responses.
   */
  async getExperimentById(id: string, researcherId?: string): Promise<Experiment> {
    const exp = await prisma.experiment.findUnique({
      where: { id },
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
      throw new NotFoundError(`Experiment '${id}' not found`);
    }

    if (researcherId && exp.ownerResearcherId !== researcherId) {
      throw new ForbiddenError('You do not own this experiment');
    }

    return this.formatExperiment(exp);
  }

  /**
   * Updates an existing experiment.
   */
  async updateExperiment(id: string, input: unknown, researcherId?: string) {
    const validated = updateExperimentSchema.parse(input);

    const existing = await prisma.experiment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Experiment '${id}' not found`);
    }

    if (researcherId && existing.ownerResearcherId !== researcherId) {
      throw new ForbiddenError('You do not own this experiment');
    }

    const isPublished = existing.status === 'PUBLISHED';
    const newVersion = isPublished ? existing.version + 1 : existing.version;
    const newStatus = isPublished ? 'DRAFT' : existing.status;

    const result = await prisma.$transaction(async (tx) => {
      // If trials are being replaced, delete existing and recreate
      if (validated.trials) {
        await tx.trial.deleteMany({ where: { experimentId: id } });
      }

      const updated = await tx.experiment.update({
        where: { id },
        data: {
          title: validated.title,
          description: validated.description,
          publicSlug: validated.publicSlug,
          generalInstructions: validated.generalInstructions,
          completionMessage: validated.completionMessage,
          status: newStatus,
          version: newVersion,
          config: validated.config ? (validated.config as unknown as Prisma.InputJsonValue) : undefined,
          trials: validated.trials
            ? {
                create: this.mapTrialsToPrismaCreate(validated.trials),
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

      return {
        ...updated,
        updatedAt: updated.updatedAt.toISOString(),
      };
    });

    await auditService.log({
      researcherId: existing.ownerResearcherId,
      eventType: 'EXPERIMENT_UPDATED',
      resourceId: id,
      metadata: { version: newVersion },
    });

    return result;
  }

  /**
   * Deletes an experiment.
   */
  async deleteExperiment(id: string, researcherId?: string): Promise<void> {
    const existing = await prisma.experiment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Experiment '${id}' not found`);
    }

    if (researcherId && existing.ownerResearcherId !== researcherId) {
      throw new ForbiddenError('You do not own this experiment');
    }

    await prisma.experiment.delete({ where: { id } });

    await auditService.log({
      researcherId: existing.ownerResearcherId,
      eventType: 'EXPERIMENT_DELETED',
      resourceId: id,
    });
  }

  /**
   * Publishes an experiment:
   * 1. Validates all trials, stimuli, timing, and progression pointers
   * 2. Freezes snapshot into ExperimentVersion
   * 3. Transitions status to PUBLISHED
   */
  async publishExperiment(id: string, researcherId?: string): Promise<PublishExperimentResponse> {
    const fullExperiment = await this.getExperimentById(id, researcherId);

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

    const result = await prisma.$transaction(async (tx) => {
      // Create immutable snapshot
      await tx.experimentVersion.upsert({
        where: { snapshotId },
        create: {
          snapshotId,
          version: fullExperiment.version,
          publicSlug: fullExperiment.publicSlug,
          publishedAt,
          snapshotData: fullExperiment as unknown as Prisma.InputJsonValue,
          experimentId: fullExperiment.id,
        },
        update: {
          snapshotData: fullExperiment as unknown as Prisma.InputJsonValue,
          publishedAt,
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
      researcherId: fullExperiment.ownerResearcherId,
      eventType: 'EXPERIMENT_PUBLISHED',
      resourceId: id,
      metadata: { version: fullExperiment.version, publicSlug: fullExperiment.publicSlug },
    });

    return result;
  }

  private mapTrialsToPrismaCreate(trials: any[]): Prisma.TrialCreateWithoutExperimentInput[] {
    return trials.map((t) => ({
      id: t.id,
      orderIndex: t.orderIndex,
      label: t.label ?? null,
      instructions: t.instructions ?? null,
      fixation: t.fixation ? (t.fixation as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      timingConfig: t.timingConfig as unknown as Prisma.InputJsonValue,
      nextTrialId: t.nextTrialId ?? null,
      branching: t.branching ? (t.branching as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      stimulus: {
        create: {
          id: t.stimulus.id,
          type: String(t.stimulus.type),
          content: t.stimulus.type === 'text' ? t.stimulus.content : null,
          url: t.stimulus.type === 'image' ? t.stimulus.url : null,
          altText: t.stimulus.type === 'image' ? (t.stimulus.altText ?? null) : null,
          styling: t.stimulus.styling ? (t.stimulus.styling as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          metadata: t.stimulus.metadata ? (t.stimulus.metadata as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      },
      expectedResponse: {
        create: {
          type: String(t.expectedResponse.type),
          allowedKeys: t.expectedResponse.type === 'keypress' ? t.expectedResponse.allowedKeys : [],
          allowedButtons: t.expectedResponse.type === 'button_click' ? t.expectedResponse.allowedButtons : [],
          correctResponse: t.expectedResponse.correctResponse ?? null,
          evaluationMode: String(t.expectedResponse.evaluationMode),
        },
      },
    }));
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
      trials: (exp.trials || []).map((t: any): Trial => ({
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
              evaluationMode: t.expectedResponse.evaluationMode as 'exact_match' | 'none',
            }
          : ({} as any),
      })),
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
      publishedAt: exp.publishedAt ? exp.publishedAt.toISOString() : null,
    };
  }
}
