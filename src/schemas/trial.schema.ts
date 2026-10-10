import { z } from 'zod';
import { stimulusSchema, cssColorSchema, cssSizeSchema } from './stimulus.schema.js';

export const fixationConfigSchema = z
  .object({
    enabled: z.boolean(),
    durationMs: z.number().nonnegative('Fixation duration must be non-negative'),
    symbol: z.string().min(1, 'Fixation symbol must not be empty').max(10),
    color: cssColorSchema.optional(),
    fontSize: cssSizeSchema.optional(),
  })
  .nullable()
  .optional();

export const trialTimingConfigSchema = z
  .object({
    preStimulusDelayMs: z.number().nonnegative('preStimulusDelayMs must be non-negative'),
    stimulusDurationMs: z.number().positive('stimulusDurationMs must be positive').nullable(),
    responseTimeoutMs: z.number().positive('responseTimeoutMs must be positive').nullable(),
    allowEarlyResponse: z.boolean(),
    waitForResponse: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (!val.waitForResponse && (val.responseTimeoutMs === null || val.responseTimeoutMs === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'responseTimeoutMs is required when waitForResponse is false',
        path: ['responseTimeoutMs'],
      });
    }
  });

export const expectedKeypressResponseSchema = z.object({
  type: z.literal('keypress'),
  allowedKeys: z.array(z.string().min(1)).min(1, 'allowedKeys must contain at least one key'),
  correctResponse: z.string().nullable().optional(),
  evaluationMode: z.enum(['exact_match', 'none']),
});

export const expectedButtonClickResponseSchema = z.object({
  type: z.literal('button_click'),
  allowedButtons: z.array(z.string().min(1)).min(1, 'allowedButtons must contain at least one button'),
  correctResponse: z.string().nullable().optional(),
  evaluationMode: z.enum(['exact_match', 'none']),
});

export const expectedResponseSchema = z
  .discriminatedUnion('type', [
    expectedKeypressResponseSchema,
    expectedButtonClickResponseSchema,
  ])
  .superRefine((val, ctx) => {
    if (val.evaluationMode === 'exact_match') {
      if (!val.correctResponse || val.correctResponse.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "correctResponse is required when evaluationMode is 'exact_match'",
          path: ['correctResponse'],
        });
      }
    }

    if (val.type === 'keypress') {
      if (val.correctResponse && !val.allowedKeys.includes(val.correctResponse)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `correctResponse '${val.correctResponse}' must be included in allowedKeys [${val.allowedKeys.join(', ')}]`,
          path: ['correctResponse'],
        });
      }
    } else if (val.type === 'button_click') {
      if (val.correctResponse && !val.allowedButtons.includes(val.correctResponse)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `correctResponse '${val.correctResponse}' must be included in allowedButtons [${val.allowedButtons.join(', ')}]`,
          path: ['correctResponse'],
        });
      }
    }
  });

export const correctnessBranchingSchema = z.object({
  ifCorrect: z.string().uuid('ifCorrect must be a valid trial UUID').nullable(),
  ifIncorrect: z.string().uuid('ifIncorrect must be a valid trial UUID').nullable(),
});

export const trialBranchingRuleSchema = correctnessBranchingSchema.nullable().optional();

export const trialSchema = z
  .object({
    id: z.string().uuid('Trial id must be a valid UUID'),
    orderIndex: z.number().int().min(0, 'orderIndex must be a non-negative integer'),
    label: z.string().max(200, 'label must be at most 200 characters').nullable().optional(),
    instructions: z.string().max(5000, 'instructions must be at most 5000 characters').nullable().optional(),
    fixation: fixationConfigSchema,
    stimulus: stimulusSchema,
    timingConfig: trialTimingConfigSchema,
    expectedResponse: expectedResponseSchema,
    nextTrialId: z.string().uuid().nullable(),
    branching: trialBranchingRuleSchema,
  })
  .superRefine((val, ctx) => {
    if (val.branching !== null && val.branching !== undefined) {
      if (val.expectedResponse.evaluationMode !== 'exact_match') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A trial with branching must have expectedResponse.evaluationMode='exact_match'",
          path: ['expectedResponse', 'evaluationMode'],
        });
      }
      if (!val.expectedResponse.correctResponse || val.expectedResponse.correctResponse.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A trial with branching must have a non-empty correctResponse',
          path: ['expectedResponse', 'correctResponse'],
        });
      }
    }
  });

export type TrialInput = z.infer<typeof trialSchema>;
