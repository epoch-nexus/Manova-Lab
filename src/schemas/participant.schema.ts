import { z } from 'zod';

export const startSessionSchema = z.object({
  clientEnvironment: z
    .object({
      browser: z.string().optional(),
      os: z.string().optional(),
      screenResolution: z.string().optional(),
      devicePixelRatio: z.number().optional(),
    })
    .optional(),
});

export const submitResponseSchema = z.object({
  submittedResponse: z.string().nullable().optional(),
  reactionTimeMs: z.number().nullable().optional(),
  timedOut: z.boolean().optional().default(false),
  timingMeasurement: z.unknown().nullable().optional(),
  clientMetadata: z.unknown().optional(),
});

export const abandonSessionSchema = z.object({
  reason: z.string().optional(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
