import { z } from 'zod';
import { stimulusSchema } from './stimulus.schema.js';

export const fixationConfigSchema = z.object({
  enabled: z.boolean(),
  durationMs: z.number().nonnegative('Fixation duration must be non-negative'),
  symbol: z.string().min(1, 'Fixation symbol must not be empty'),
  color: z.string().optional(),
  fontSize: z.string().optional(),
}).nullable().optional();

export const trialTimingConfigSchema = z.object({
  preStimulusDelayMs: z.number().nonnegative('preStimulusDelayMs must be non-negative'),
  stimulusDurationMs: z.number().positive('stimulusDurationMs must be positive').nullable(),
  responseTimeoutMs: z.number().positive('responseTimeoutMs must be positive').nullable(),
  allowEarlyResponse: z.boolean(),
  waitForResponse: z.boolean(),
});

export const expectedKeypressResponseSchema = z.object({
  type: z.literal('keypress'),
  allowedKeys: z.array(z.string().min(1)).min(1, 'allowedKeys must contain at least one key'),
  correctResponse: z.string().optional().nullable(),
  evaluationMode: z.enum(['exact_match', 'none']),
});

export const expectedButtonClickResponseSchema = z.object({
  type: z.literal('button_click'),
  allowedButtons: z.array(z.string().min(1)).min(1, 'allowedButtons must contain at least one button'),
  correctResponse: z.string().optional().nullable(),
  evaluationMode: z.enum(['exact_match', 'none']),
});

export const expectedResponseSchema = z.discriminatedUnion('type', [
  expectedKeypressResponseSchema,
  expectedButtonClickResponseSchema,
]).superRefine((val, ctx) => {
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

export const branchingConditionSchema = z.object({
  operator: z.enum(['equals', 'not_equals', 'less_than', 'greater_than']),
  field: z.enum(['isCorrect', 'reactionTimeMs', 'submittedResponse']),
  value: z.union([z.string(), z.number(), z.boolean()]),
  targetTrialId: z.string().uuid(),
});

export const trialBranchingRuleSchema = z.object({
  conditions: z.array(branchingConditionSchema),
  defaultNextTrialId: z.string().uuid().nullable(),
}).nullable().optional();

export const trialSchema = z.object({
  id: z.string().uuid('Trial id must be a valid UUID'),
  orderIndex: z.number().int().positive('orderIndex must be a positive integer'),
  label: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  fixation: fixationConfigSchema,
  stimulus: stimulusSchema,
  timingConfig: trialTimingConfigSchema,
  expectedResponse: expectedResponseSchema,
  nextTrialId: z.string().uuid().nullable(),
  branching: trialBranchingRuleSchema,
});

export type TrialInput = z.infer<typeof trialSchema>;
