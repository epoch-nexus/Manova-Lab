import { z } from 'zod';

export const DEV_DEFAULT_JWT_SECRET = 'manova-labs-dev-secret-do-not-use-in-production-32bytes';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().default(DEV_DEFAULT_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('24h'),
  CORS_ORIGIN: z.string().optional().default('*'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20), // 20 requests per window
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateConfig(rawEnv: NodeJS.ProcessEnv = process.env): EnvConfig {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    throw new Error(`Environment configuration validation failed: ${parsed.error.message}`);
  }

  const config = parsed.data;

  // Strict production guards
  if (config.NODE_ENV === 'production') {
    if (!config.JWT_SECRET || config.JWT_SECRET === DEV_DEFAULT_JWT_SECRET) {
      throw new Error(
        'SECURITY ERROR: Production deployment cannot use the default development JWT_SECRET. Set a strong JWT_SECRET with at least 32 characters in production.'
      );
    }
    if (config.JWT_SECRET.length < 32) {
      throw new Error(
        'SECURITY ERROR: Production JWT_SECRET must be at least 32 characters long.'
      );
    }
    if (!config.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in production.');
    }
  }

  return config;
}

// Cached config for runtime usage
export const config = validateConfig();
