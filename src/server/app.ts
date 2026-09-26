import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import { experimentRouter } from './routes/experiment.routes.js';
import { participantRouter } from './routes/participant.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Application {
  const app = express();

  // Permissive CORS for development (allowing custom frontend ports / origins)
  const allowedOrigin = process.env.CORS_ORIGIN ?? '*';
  app.use(
    cors({
      origin: allowedOrigin === '*' ? true : allowedOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // JSON Body Parser
  app.use(express.json({ limit: '10mb' }));

  // Operational Healthcheck Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'manova-labs-backend' });
  });

  // Mount Researcher Experiments Router (both versioned and direct root paths)
  app.use('/api/v1/experiments', experimentRouter);
  app.use('/experiments', experimentRouter);

  // Mount Participant Execution Router (both versioned and direct root paths)
  app.use('/api/v1/participant', participantRouter);
  app.use('/participant', participantRouter);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
