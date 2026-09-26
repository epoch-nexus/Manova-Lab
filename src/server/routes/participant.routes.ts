import { Router, type Request, type Response, type NextFunction } from 'express';
import { SessionService } from '../../domain/session.service.js';

export const participantRouter = Router();
const sessionService = new SessionService();

/**
 * POST /experiments/:publicSlug/sessions
 * Initialize an anonymous participant session locked to the published snapshot
 */
participantRouter.post(
  '/experiments/:publicSlug/sessions',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await sessionService.startSession(
        req.params.publicSlug as string,
        req.body
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /sessions/:sessionId
 * Get current execution step for participant
 */
participantRouter.get(
  '/sessions/:sessionId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await sessionService.getCurrentStep(req.params.sessionId as string);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /sessions/:sessionId/current-step
 * Alias endpoint for get current execution step
 */
participantRouter.get(
  '/sessions/:sessionId/current-step',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await sessionService.getCurrentStep(req.params.sessionId as string);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /sessions/:sessionId/trials/:trialId/response
 * Submit participant response and advance linear state machine
 */
participantRouter.post(
  '/sessions/:sessionId/trials/:trialId/response',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await sessionService.submitResponse(
        req.params.sessionId as string,
        req.params.trialId as string,
        req.body
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /sessions/:sessionId/abandon
 * Explicitly abandon session
 */
participantRouter.post(
  '/sessions/:sessionId/abandon',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await sessionService.abandonSession(req.params.sessionId as string);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);
