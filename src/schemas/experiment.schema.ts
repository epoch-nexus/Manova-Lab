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

export const DEFAULT_EXPERIMENT_CONFIG: z.infer<typeof experimentDisplayConfigSchema> = {
  displayMode: 'fullscreen',
  backgroundColor: '#0F172A',
  allowPause: false,
  showFeedback: true,
  randomization: { enabled: false },
};

export function mergeExperimentConfig(
  storedConfig: Partial<z.infer<typeof experimentDisplayConfigSchema>> | null | undefined,
  partialConfig: Partial<z.infer<typeof experimentDisplayConfigSchema>> | null | undefined
): z.infer<typeof experimentDisplayConfigSchema> {
  const base = storedConfig || DEFAULT_EXPERIMENT_CONFIG;
  const merged = {
    ...DEFAULT_EXPERIMENT_CONFIG,
    ...base,
    ...(partialConfig || {}),
    randomization: {
      ...DEFAULT_EXPERIMENT_CONFIG.randomization,
      ...(base.randomization || {}),
      ...(partialConfig?.randomization || {}),
    },
  };
  return experimentDisplayConfigSchema.parse(merged);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESERVED_SLUGS = new Set(['api', 'admin', 'health', 'auth', 'experiments', 'participant']);

export const publicSlugSchema = z
  .string()
  .min(3, 'Public slug must be at least 3 characters')
  .max(64, 'Public slug must be at most 64 characters')
  .regex(/^[a-z0-9-]+$/, 'Public slug must be lowercase alphanumeric with hyphens only')
  .refine((slug) => !UUID_REGEX.test(slug), {
    message: 'Public slug cannot be formatted as a UUID',
  })
  .refine((slug) => !RESERVED_SLUGS.has(slug.toLowerCase()), {
    message: 'Public slug cannot be a reserved word',
  });

export const createExperimentSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Experiment title must be at least 3 characters')
      .max(120, 'Experiment title must be at most 120 characters'),
    description: z.string().min(1, 'Experiment description is required'),
    publicSlug: publicSlugSchema,
    generalInstructions: z.string().max(5000).nullable().optional(),
    completionMessage: z.string().max(5000).nullable().optional(),
    config: z
      .preprocess((val) => {
        if (val === undefined || val === null) {
          return DEFAULT_EXPERIMENT_CONFIG;
        }
        if (typeof val === 'object') {
          const raw = val as Record<string, any>;
          return {
            ...DEFAULT_EXPERIMENT_CONFIG,
            ...raw,
            randomization: {
              ...DEFAULT_EXPERIMENT_CONFIG.randomization,
              ...(raw.randomization || {}),
            },
          };
        }
        return val;
      }, experimentDisplayConfigSchema)
      .default(DEFAULT_EXPERIMENT_CONFIG),
    trials: z.array(trialSchema).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.trials && val.trials.length > 0) {
      validateTrialGraph(val.trials, ctx);
    }
  });

export const updateExperimentSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Experiment title must be at least 3 characters')
      .max(120, 'Experiment title must be at most 120 characters')
      .optional(),
    description: z.string().min(1, 'Experiment description is required').optional(),
    publicSlug: publicSlugSchema.optional(),
    generalInstructions: z.string().max(5000).nullable().optional(),
    completionMessage: z.string().max(5000).nullable().optional(),
    config: experimentDisplayConfigSchema.partial().optional(),
    trials: z.array(trialSchema).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.trials && val.trials.length > 0) {
      validateTrialGraph(val.trials, ctx);
    }
  });

/**
 * Validates trial graph integrity:
 * 1. Unique trial IDs & unique orderIndex
 * 2. Pointer target existence & self-loops
 * 3. Terminal path existence
 * 4. Exactly one entry node
 * 5. Reachability (no unreachable trials)
 * 6. Acyclicity (no cycles in nextTrialId + branch targets)
 * 7. Non-branching sequential ordering
 */
export function validateTrialGraph(
  trials: z.infer<typeof trialSchema>[],
  ctx: z.RefinementCtx
): void {
  if (!trials || trials.length === 0) return;

  const trialIdSet = new Set<string>();
  const orderIndexSet = new Set<number>();
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

    if (orderIndexSet.has(trial.orderIndex)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate orderIndex '${trial.orderIndex}' found at index ${i}`,
        path: ['trials', i, 'orderIndex'],
      });
    }
    orderIndexSet.add(trial.orderIndex);

    if (trial.nextTrialId === null) {
      hasTerminalTrial = true;
    }
    if (trial.branching && (trial.branching.ifCorrect === null || trial.branching.ifIncorrect === null)) {
      hasTerminalTrial = true;
    }
  }

  if (!hasTerminalTrial) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Experiment must contain at least one terminal trial (nextTrialId: null)',
      path: ['trials'],
    });
  }

  for (let i = 0; i < trials.length; i++) {
    const trial = trials[i]!;

    if (trial.nextTrialId !== null) {
      if (trial.nextTrialId === trial.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Self-loop detected: trial '${trial.id}' nextTrialId points to itself`,
          path: ['trials', i, 'nextTrialId'],
        });
      } else if (!trialIdSet.has(trial.nextTrialId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Trial '${trial.id}' has nextTrialId '${trial.nextTrialId}' which does not exist in this experiment`,
          path: ['trials', i, 'nextTrialId'],
        });
      }
    }

    if (trial.branching) {
      if (trial.branching.ifCorrect !== null) {
        if (trial.branching.ifCorrect === trial.id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Self-referential branching detected: trial '${trial.id}' ifCorrect points to itself`,
            path: ['trials', i, 'branching', 'ifCorrect'],
          });
        } else if (!trialIdSet.has(trial.branching.ifCorrect)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Branching ifCorrect target '${trial.branching.ifCorrect}' does not exist in this experiment`,
            path: ['trials', i, 'branching', 'ifCorrect'],
          });
        }
      }

      if (trial.branching.ifIncorrect !== null) {
        if (trial.branching.ifIncorrect === trial.id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Self-referential branching detected: trial '${trial.id}' ifIncorrect points to itself`,
            path: ['trials', i, 'branching', 'ifIncorrect'],
          });
        } else if (!trialIdSet.has(trial.branching.ifIncorrect)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Branching ifIncorrect target '${trial.branching.ifIncorrect}' does not exist in this experiment`,
            path: ['trials', i, 'branching', 'ifIncorrect'],
          });
        }
      }
    }
  }

  // Calculate in-degree (incoming edges)
  const incomingCounts = new Map<string, number>();
  for (const t of trials) {
    incomingCounts.set(t.id, 0);
  }

  for (const trial of trials) {
    if (trial.nextTrialId !== null && incomingCounts.has(trial.nextTrialId)) {
      incomingCounts.set(trial.nextTrialId, incomingCounts.get(trial.nextTrialId)! + 1);
    }
    if (trial.branching) {
      if (trial.branching.ifCorrect !== null && incomingCounts.has(trial.branching.ifCorrect)) {
        incomingCounts.set(trial.branching.ifCorrect, incomingCounts.get(trial.branching.ifCorrect)! + 1);
      }
      if (trial.branching.ifIncorrect !== null && incomingCounts.has(trial.branching.ifIncorrect)) {
        incomingCounts.set(trial.branching.ifIncorrect, incomingCounts.get(trial.branching.ifIncorrect)! + 1);
      }
    }
  }

  const entryNodes = trials.filter((t) => incomingCounts.get(t.id) === 0);
  if (entryNodes.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Trial graph must have exactly one entry node (found ${entryNodes.length})`,
      path: ['trials'],
    });
  }

  // Reachability check
  const startNode =
    entryNodes.length > 0
      ? [...entryNodes].sort((a, b) => a.orderIndex - b.orderIndex)[0]!
      : [...trials].sort((a, b) => a.orderIndex - b.orderIndex)[0]!;

  const trialMap = new Map<string, z.infer<typeof trialSchema>>();
  for (const t of trials) {
    trialMap.set(t.id, t);
  }

  const reachableIds = new Set<string>();
  const queue: string[] = [startNode.id];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (reachableIds.has(currentId)) continue;
    reachableIds.add(currentId);

    const t = trialMap.get(currentId);
    if (!t) continue;

    if (t.nextTrialId !== null && trialMap.has(t.nextTrialId)) {
      queue.push(t.nextTrialId);
    }
    if (t.branching) {
      if (t.branching.ifCorrect !== null && trialMap.has(t.branching.ifCorrect)) {
        queue.push(t.branching.ifCorrect);
      }
      if (t.branching.ifIncorrect !== null && trialMap.has(t.branching.ifIncorrect)) {
        queue.push(t.branching.ifIncorrect);
      }
    }
  }

  for (let i = 0; i < trials.length; i++) {
    const trial = trials[i]!;
    if (!reachableIds.has(trial.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unreachable trial '${trial.id}' detected`,
        path: ['trials', i],
      });
    }
  }

  // Cycle detection (0: unvisited, 1: visiting, 2: visited)
  const visitState = new Map<string, number>();
  for (const t of trials) {
    visitState.set(t.id, 0);
  }

  function checkCycleDfs(trialId: string): boolean {
    visitState.set(trialId, 1);
    const t = trialMap.get(trialId);
    if (t) {
      const targets: string[] = [];
      if (t.nextTrialId !== null && trialMap.has(t.nextTrialId)) {
        targets.push(t.nextTrialId);
      }
      if (t.branching) {
        if (t.branching.ifCorrect !== null && trialMap.has(t.branching.ifCorrect)) {
          targets.push(t.branching.ifCorrect);
        }
        if (t.branching.ifIncorrect !== null && trialMap.has(t.branching.ifIncorrect)) {
          targets.push(t.branching.ifIncorrect);
        }
      }

      for (const targetId of targets) {
        const state = visitState.get(targetId);
        if (state === 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Cycle detected in trial graph involving trial '${trialId}' to '${targetId}'`,
            path: ['trials'],
          });
          return true;
        }
        if (state === 0) {
          if (checkCycleDfs(targetId)) return true;
        }
      }
    }
    visitState.set(trialId, 2);
    return false;
  }

  for (const t of trials) {
    if (visitState.get(t.id) === 0) {
      if (checkCycleDfs(t.id)) {
        break;
      }
    }
  }

  // Non-branching sequential ordering check
  const hasAnyBranching = trials.some(
    (t) => t.branching !== null && t.branching !== undefined
  );

  if (!hasAnyBranching && trials.length > 0) {
    const sortedTrials = [...trials].sort((a, b) => a.orderIndex - b.orderIndex);
    for (let i = 0; i < sortedTrials.length; i++) {
      const current = sortedTrials[i]!;
      if (i < sortedTrials.length - 1) {
        const nextExpected = sortedTrials[i + 1]!;
        if (current.nextTrialId !== nextExpected.id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Non-branching experiment trials must progress in orderIndex order. Trial '${current.id}' (orderIndex ${current.orderIndex}) should have nextTrialId '${nextExpected.id}', but got '${current.nextTrialId}'`,
            path: ['trials'],
          });
          break;
        }
      } else {
        if (current.nextTrialId !== null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Last trial in non-branching experiment '${current.id}' must have nextTrialId === null`,
            path: ['trials'],
          });
        }
      }
    }
  }
}

/**
 * Publishing validation schema:
 * Enforces all requirements necessary to transition from DRAFT to PUBLISHED.
 */
export const publishValidationSchema = z
  .object({
    title: z.string().min(3).max(120),
    description: z.string().min(1),
    publicSlug: publicSlugSchema,
    config: experimentDisplayConfigSchema.optional(),
    trials: z
      .array(trialSchema)
      .min(1, 'An experiment must contain at least one trial to be published'),
  })
  .superRefine((val, ctx) => {
    validateTrialGraph(val.trials, ctx);
  });

export type CreateExperimentInput = z.infer<typeof createExperimentSchema>;
export type UpdateExperimentInput = z.infer<typeof updateExperimentSchema>;
