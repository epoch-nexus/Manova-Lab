import cors, { type CorsOptions } from 'cors';
import type { RequestHandler } from 'express';

/**
 * Creates environment-aware CORS middleware.
 * In production: strictly enforces allowed origins from CORS_ORIGIN environment variable.
 * In development/test: allows all origins for developer convenience.
 */
export function createCorsMiddleware(): RequestHandler {
  const isProd = process.env.NODE_ENV === 'production';
  const corsOriginEnv = process.env.CORS_ORIGIN;

  if (isProd) {
    const allowedOrigins = corsOriginEnv
      ? corsOriginEnv.split(',').map((o) => o.trim()).filter(Boolean)
      : [];

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
    origin: corsOriginEnv && corsOriginEnv !== '*'
      ? corsOriginEnv.split(',').map((o) => o.trim()).filter(Boolean)
      : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });
}
