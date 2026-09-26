import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import { createCorsMiddleware } from './middleware/cors.js';
import { experimentRouter } from './routes/experiment.routes.js';
import { participantRouter } from './routes/participant.routes.js';
import { resultsRouter } from './routes/results.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Application {
  const app = express();

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

  // JSON Body Parser
  app.use(express.json({ limit: '10mb' }));

  // Operational Healthcheck Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'manova-labs-backend' });
  });

  // Serve static assets (including Phase 4 Timing PoC)
  app.use(express.static('public'));
  app.get('/timing-poc', (_req: Request, res: Response) => {
    res.sendFile('timing-poc.html', { root: 'public' });
  });

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

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
