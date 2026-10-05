import cors, { type CorsOptions } from 'cors';
import type { RequestHandler } from 'express';
import { config } from '../../config/env.js';

/**
 * Creates environment-aware CORS middleware.
 * In production: strictly enforces allowed origins from CORS_ORIGIN config.
 * In development/test: allows all origins or configured origin for developer convenience.
 */
export function createCorsMiddleware(): RequestHandler {
  // Read from validated config with process.env fallback/override for dynamic test suites
  const isProd = (process.env.NODE_ENV ?? config.NODE_ENV) === 'production';
  const corsOrigin = process.env.CORS_ORIGIN ?? config.CORS_ORIGIN;

  if (isProd) {
    if (!corsOrigin || corsOrigin.trim() === '' || corsOrigin.trim() === '*') {
      throw new Error('SECURITY ERROR: Production requires a specific CORS_ORIGIN (cannot be empty or "*").');
    }

    const allowedOrigins = corsOrigin
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    const corsOptions: CorsOptions = {
      origin: (origin, callback) => {
        // Requests with no origin (like curl, automated healthchecks, or server-to-server) are permitted
        if (!origin) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false, // Stateless Bearer token architecture; no cookie credentials
    };

    return cors(corsOptions);
  }

  // Development/Test mode
  return cors({
    origin: corsOrigin && corsOrigin !== '*'
      ? corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
      : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });
}
