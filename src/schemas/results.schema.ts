import { z } from 'zod';

export const resultsQuerySchema = z
  .object({
    sessionId: z.string().optional(),
    trialId: z.string().optional(),
    timedOut: z
      .enum(['true', 'false'])
      .transform((val) => val === 'true')
      .optional(),
    // Fix 3: datetime({ offset: true }) so "+05:30" timestamps are accepted
    from: z
      .string()
      .datetime({ offset: true, message: "'from' must be a valid ISO 8601 timestamp" })
      .optional(),
    to: z
      .string()
      .datetime({ offset: true, message: "'to' must be a valid ISO 8601 timestamp" })
      .optional(),
    // Fix 3: strict integer parsing — reject "10abc"
    limit: z
      .string()
      .refine((val) => /^\d+$/.test(val), { message: "'limit' must be a strict integer" })
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0 && val <= 2000, {
        message: "'limit' must be an integer between 1 and 2000",
      })
      .optional(),
    offset: z
      .string()
      .refine((val) => /^\d+$/.test(val), { message: "'offset' must be a strict integer" })
      .transform((val) => parseInt(val, 10))
      .refine((val) => val >= 0, {
        message: "'offset' must be a non-negative integer",
      })
      .optional(),
    // Fix 4: optional includeAbandoned filter (default true)
    includeAbandoned: z
      .enum(['true', 'false'])
      .transform((val) => val === 'true')
      .default('true'),
    // Keyset pagination cursor fields (opaque – treated as strings)
    afterSubmittedAt: z.string().optional(),
    afterId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    { message: "'from' must be less than or equal to 'to'", path: ['from'] }
  );

export const resultsSummaryQuerySchema = z.object({
  trialId: z.string().optional(),
  // Fix 2: optional version filter; omit for latest-version-only default
  version: z
    .string()
    .refine((val) => /^\d+$/.test(val), { message: "'version' must be a strict integer" })
    .transform((val) => parseInt(val, 10))
    .optional(),
});

export type ResultsQuery = z.infer<typeof resultsQuerySchema>;
export type ResultsSummaryQuery = z.infer<typeof resultsSummaryQuerySchema>;
