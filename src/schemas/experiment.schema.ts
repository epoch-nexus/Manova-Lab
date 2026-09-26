import { z } from 'zod';
import { trialSchema } from './trial.schema.js';

export const randomizationConfigSchema = z.object({
  enabled: z.boolean().default(false),
});

export const experimentDisplayConfigSchema = z.object({
  displayMode: z.enum(['fullscreen', 'windowed']).default('fullscreen'),
  backgroundColor: z.string().default('#0F172A'),
  allowPause: z.boolean().default(false),
  showFeedback: z.boolean().default(true),
  randomization: randomizationConfigSchema.optional().default({ enabled: false }),
});

export const createExperimentSchema = z.object({
  title: z
    .string()
    .min(3, 'Experiment title must be at least 3 characters')
    .max(120, 'Experiment title must be at most 120 characters'),
  description: z.string().min(1, 'Experiment description is required'),
  publicSlug: z
    .string()
    .min(3, 'Public slug must be at least 3 characters')
    .max(64, 'Public slug must be at most 64 characters')
    .regex(/^[a-z0-9-]+$/, 'Public slug must be lowercase alphanumeric with hyphens only'),
  generalInstructions: z.string().nullable().optional(),
  completionMessage: z.string().nullable().optional(),
  config: experimentDisplayConfigSchema.partial().optional(),
  trials: z.array(trialSchema).optional(),
}).superRefine((val, ctx) => {
  if (val.trials && val.trials.length > 0) {
    validateTrialGraph(val.trials, ctx);
  }
});

export const updateExperimentSchema = z.object({
  title: z
    .string()
    .min(3, 'Experiment title must be at least 3 characters')
    .max(120, 'Experiment title must be at most 120 characters')
    .optional(),
  description: z.string().min(1, 'Experiment description is required').optional(),
  publicSlug: z
    .string()
    .min(3, 'Public slug must be at least 3 characters')
    .max(64, 'Public slug must be at most 64 characters')
    .regex(/^[a-z0-9-]+$/, 'Public slug must be lowercase alphanumeric with hyphens only')
    .optional(),
  generalInstructions: z.string().nullable().optional(),
  completionMessage: z.string().nullable().optional(),
  config: experimentDisplayConfigSchema.partial().optional(),
  trials: z.array(trialSchema).optional(),
}).superRefine((val, ctx) => {
  if (val.trials && val.trials.length > 0) {
    validateTrialGraph(val.trials, ctx);
  }
});

/**
 * Validates trial graph integrity:
 * 1. Unique trial IDs
 * 2. Every nextTrialId points to an existing trial in the set (or is null)
 * 3. Terminal path: at least one trial has nextTrialId === null
 */
export function validateTrialGraph(
  trials: z.infer<typeof trialSchema>[],
  ctx: z.RefinementCtx
): void {
  const trialIdSet = new Set<string>();
  let hasTerminalTrial = false;

  for (let i = 0; i < trials.length; i++) {
    const trial = trials[i]!;
    if (trialIdSet.has(trial.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate trial ID '${trial.id}' found at index ${i}`,
        path: ['trials', i, 'id'],
      });
    }
    trialIdSet.add(trial.id);

    if (trial.nextTrialId === null) {
      hasTerminalTrial = true;
    }
  }

  for (let i = 0; i < trials.length; i++) {
    const trial = trials[i]!;
    if (trial.nextTrialId !== null && !trialIdSet.has(trial.nextTrialId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Trial '${trial.id}' has nextTrialId '${trial.nextTrialId}' which does not exist in this experiment`,
        path: ['trials', i, 'nextTrialId'],
      });
    }

    if (trial.branching?.conditions) {
      for (let j = 0; j < trial.branching.conditions.length; j++) {
        const cond = trial.branching.conditions[j]!;
        if (!trialIdSet.has(cond.targetTrialId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Branching condition targetTrialId '${cond.targetTrialId}' does not exist in this experiment`,
            path: ['trials', i, 'branching', 'conditions', j, 'targetTrialId'],
          });
        }
      }
    }

    if (
      trial.branching?.defaultNextTrialId &&
      !trialIdSet.has(trial.branching.defaultNextTrialId)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Branching defaultNextTrialId '${trial.branching.defaultNextTrialId}' does not exist in this experiment`,
        path: ['trials', i, 'branching', 'defaultNextTrialId'],
      });
    }
  }

  if (trials.length > 0 && !hasTerminalTrial) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Experiment must contain at least one terminal trial (nextTrialId: null)',
      path: ['trials'],
    });
  }
}

/**
 * Publishing validation schema:
 * Enforces all requirements necessary to transition from DRAFT to PUBLISHED.
 */
export const publishValidationSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(1),
  publicSlug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/),
  trials: z.array(trialSchema).min(1, 'An experiment must contain at least one trial to be published'),
}).superRefine((val, ctx) => {
  validateTrialGraph(val.trials, ctx);
});

export type CreateExperimentInput = z.infer<typeof createExperimentSchema>;
export type UpdateExperimentInput = z.infer<typeof updateExperimentSchema>;
