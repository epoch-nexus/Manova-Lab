import { z } from 'zod';

const timingMeasurementSchema = z
  .object({
    stimulusOnsetTimestamp: z.number(),
    responseTimestamp: z.number(),
    calculatedLatencyMs: z.number(),
    hardwarePrecision: z.object({
      timingMethod: z.enum(['requestAnimationFrame', 'performanceNow', 'fallback']),
      displayRefreshRateEstimateHz: z.number().nullable(),
      hiddenTabDetected: z.boolean(),
      preStimulusActualDurationMs: z.number().optional(),
    }),
  })
  .nullable()
  .optional();

// ~4 KB cap: a record of primitive values with capped string lengths
const clientMetadataSchema = z
  .record(z.union([z.string().max(500), z.number(), z.boolean(), z.null()]))
  .optional()
  .refine(
    (val) => {
      if (!val) return true;
      return JSON.stringify(val).length <= 4096;
    },
    { message: 'clientMetadata exceeds maximum size of 4096 bytes' }
  );

export const startSessionSchema = z.object({
  clientEnvironment: z
    .object({
      browser: z.string().max(200).optional(),
      os: z.string().max(200).optional(),
      screenResolution: z.string().max(50).optional(),
      devicePixelRatio: z.number().optional(),
    })
    .optional(),
});

export const submitResponseSchema = z
  .object({
    submittedResponse: z.string().nullable().optional(),
    reactionTimeMs: z.number().nullable().optional(),
    timedOut: z.boolean().optional().default(false),
    timingMeasurement: timingMeasurementSchema,
    clientMetadata: clientMetadataSchema,
  })
  .superRefine((val, ctx) => {
    const timedOut = val.timedOut ?? false;

    if (timedOut) {
      // timedOut=true => submittedResponse and reactionTimeMs must be null/absent
      if (val.submittedResponse !== null && val.submittedResponse !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'submittedResponse must be null when timedOut is true',
          path: ['submittedResponse'],
        });
      }
      if (val.reactionTimeMs !== null && val.reactionTimeMs !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'reactionTimeMs must be null when timedOut is true',
          path: ['reactionTimeMs'],
        });
      }
    } else {
      // timedOut=false => submittedResponse non-null and reactionTimeMs finite >= 0
      if (!val.submittedResponse) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'submittedResponse is required when timedOut is false',
          path: ['submittedResponse'],
        });
      }
      if (val.reactionTimeMs === null || val.reactionTimeMs === undefined || val.reactionTimeMs < 0 || !isFinite(val.reactionTimeMs)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'reactionTimeMs must be a finite number >= 0 when timedOut is false',
          path: ['reactionTimeMs'],
        });
      }
    }
  });

export const abandonSessionSchema = z.object({
  reason: z.string().optional(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
