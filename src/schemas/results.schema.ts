import { z } from 'zod';

export const resultsQuerySchema = z.object({
  sessionId: z.string().optional(),
  trialId: z.string().optional(),
  timedOut: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  from: z
    .string()
    .datetime({ message: "'from' must be a valid ISO 8601 timestamp" })
    .optional(),
  to: z
    .string()
    .datetime({ message: "'to' must be a valid ISO 8601 timestamp" })
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 2000, {
      message: "'limit' must be an integer between 1 and 2000",
    })
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "'offset' must be a non-negative integer",
    })
    .optional(),
});

export const resultsSummaryQuerySchema = z.object({
  trialId: z.string().optional(),
});

export type ResultsQuery = z.infer<typeof resultsQuerySchema>;
export type ResultsSummaryQuery = z.infer<typeof resultsSummaryQuerySchema>;
