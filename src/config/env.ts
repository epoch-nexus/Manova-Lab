import { z } from 'zod';
import { randomBytes } from 'crypto';

export const TEST_JWT_SECRET = 'manova-labs-test-fixed-secret-key-32bytes!!';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('24h'),
  CORS_ORIGIN: z.string().optional().default('*'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20), // 20 requests per window
  TRUST_PROXY: z.string().optional(),
});

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  AUTH_RATE_LIMIT_WINDOW_MS: number;
  AUTH_RATE_LIMIT_MAX: number;
  TRUST_PROXY?: boolean | number | string;
}

export function validateConfig(rawEnv: NodeJS.ProcessEnv = process.env): EnvConfig {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    throw new Error(`Environment configuration validation failed: ${parsed.error.message}`);
  }

  const raw = parsed.data;
  const nodeEnv = raw.NODE_ENV || 'development';

  // Do not default NODE_ENV silently; log the resolved env at boot
  console.log(`[Config] Resolved NODE_ENV: ${nodeEnv}`);

  let jwtSecret = raw.JWT_SECRET;

  if (nodeEnv === 'test') {
    jwtSecret = jwtSecret || TEST_JWT_SECRET;
  } else if (nodeEnv === 'production') {
    if (!jwtSecret) {
      throw new Error('SECURITY ERROR: JWT_SECRET is required in production.');
    }
    if (jwtSecret.length < 32) {
      throw new Error('SECURITY ERROR: Production JWT_SECRET must be at least 32 characters long.');
    }
    if (!raw.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in production.');
    }
    if (!raw.CORS_ORIGIN || raw.CORS_ORIGIN.trim() === '' || raw.CORS_ORIGIN.trim() === '*') {
      throw new Error('SECURITY ERROR: Production requires a specific CORS_ORIGIN (cannot be empty or "*").');
    }
  } else {
    // development / other
    if (jwtSecret) {
      if (jwtSecret.length < 32) {
        throw new Error('SECURITY ERROR: JWT_SECRET must be at least 32 characters long.');
      }
    } else {
      jwtSecret = randomBytes(32).toString('hex');
      console.warn(
        '⚠️ [SECURITY WARNING] No JWT_SECRET configured in environment. Generated an ephemeral secret at boot. Tokens will become invalid on restart. Set JWT_SECRET (>= 32 chars) in production.'
      );
    }
  }

  let trustProxy: boolean | number | string | undefined;
  if (raw.TRUST_PROXY !== undefined && raw.TRUST_PROXY !== '') {
    if (raw.TRUST_PROXY.toLowerCase() === 'true') {
      trustProxy = true;
    } else if (raw.TRUST_PROXY.toLowerCase() === 'false') {
      trustProxy = false;
    } else {
      const num = Number(raw.TRUST_PROXY);
      trustProxy = !Number.isNaN(num) ? num : raw.TRUST_PROXY;
    }
  }

  return {
    NODE_ENV: nodeEnv,
    DATABASE_URL: raw.DATABASE_URL,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: raw.JWT_EXPIRES_IN,
    CORS_ORIGIN: raw.CORS_ORIGIN ?? '*',
    AUTH_RATE_LIMIT_WINDOW_MS: raw.AUTH_RATE_LIMIT_WINDOW_MS,
    AUTH_RATE_LIMIT_MAX: raw.AUTH_RATE_LIMIT_MAX,
    TRUST_PROXY: trustProxy,
  };
}

// Cached config for runtime usage
export const config = validateConfig();
