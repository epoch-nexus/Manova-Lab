import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import path from 'path';
import { createCorsMiddleware } from './middleware/cors.js';
import { experimentRouter } from './routes/experiment.routes.js';
import { participantRouter } from './routes/participant.routes.js';
import { resultsRouter } from './routes/results.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { prisma } from '../db/prisma.js';
import { config } from '../config/env.js';

// Resolve static/sendFile paths from the file location, not the working directory
const publicDir = typeof __dirname !== 'undefined'
  ? path.resolve(__dirname, '../../public')
  : path.resolve(process.cwd(), 'public');

export function createApp(): Application {
  const app = express();

  // Apply trust proxy if configured
  if (config.TRUST_PROXY !== undefined) {
    app.set('trust proxy', config.TRUST_PROXY);
  }

  // Standard Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Environment-aware CORS Configuration
  app.use(createCorsMiddleware());

  // Conditional 10mb JSON parser for POST/PUT on experiments routes
  const largeJsonParser = express.json({ limit: '10mb' });
  const defaultJsonParser = express.json({ limit: '100kb' });

  app.use((req, res, next) => {
    const isExperimentRoute =
      req.path.startsWith('/api/v1/experiments') || req.path.startsWith('/experiments');
    const isPostOrPut = req.method === 'POST' || req.method === 'PUT';

    if (isExperimentRoute && isPostOrPut) {
      return largeJsonParser(req, res, next);
    }
    return next();
  });

  // Default body parser with 100kb limit (body-parser skips requests already parsed)
  app.use(defaultJsonParser);

  // Operational Healthcheck Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'manova-labs-backend' });
  });

  // Readiness Probe Endpoint (SELECT 1 via prisma)
  app.get('/ready', async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ready', database: 'connected' });
    } catch (err) {
      res.status(503).json({
        status: 'not_ready',
        database: 'disconnected',
        error: err instanceof Error ? err.message : 'Database error',
      });
    }
  });

  // Serve static assets and PoC (disabled when NODE_ENV === 'production')
  const isProd = (process.env.NODE_ENV ?? config.NODE_ENV) === 'production';
  if (!isProd) {
    app.use(express.static(publicDir));
    app.get('/timing-poc', (_req: Request, res: Response) => {
      res.sendFile(path.join(publicDir, 'timing-poc.html'));
    });
  }

  // Mount Researcher Auth Router
  app.use('/api/v1/auth', authRouter);
  app.use('/auth', authRouter);

  // Mount Researcher Experiments Router (both versioned and direct root paths)
  app.use('/api/v1/experiments', experimentRouter);
  app.use('/experiments', experimentRouter);

  // Mount Participant Execution Router (both versioned and direct root paths)
  app.use('/api/v1/participant', participantRouter);
  app.use('/participant', participantRouter);

  // Mount Researcher Results Analytics & Export Router
  app.use('/api/v1/experiments/:experimentId/results', resultsRouter);
  app.use('/experiments/:experimentId/results', resultsRouter);

  // JSON 404 handler for unknown routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
