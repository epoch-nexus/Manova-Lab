import { Router, type Request, type Response, type NextFunction } from 'express';
import { ExperimentService } from '../../domain/experiment.service.js';
import { requireAuth } from '../middleware/auth.js';

export const experimentRouter = Router();
const experimentService = new ExperimentService();

// Protect all researcher experiment routes with JWT authentication
experimentRouter.use(requireAuth);

/**
 * POST /experiments
 * Create a new draft experiment
 */
experimentRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const researcherId = req.researcher!.id;
      const result = await experimentService.createExperiment(req.body, researcherId);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /experiments
 * List all researcher experiments
 */
experimentRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const researcherId = req.researcher!.id;
      const result = await experimentService.listExperiments(researcherId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /experiments/:id
 * Retrieve single experiment by ID
 */
experimentRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const researcherId = req.researcher!.id;
      const result = await experimentService.getExperimentById(req.params.id as string, researcherId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /experiments/:id
 * Update an existing experiment
 */
experimentRouter.put(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const researcherId = req.researcher!.id;
      const result = await experimentService.updateExperiment(
        req.params.id as string,
        req.body,
        researcherId
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /experiments/:id
 * Delete an experiment
 */
experimentRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const researcherId = req.researcher!.id;
      await experimentService.deleteExperiment(req.params.id as string, researcherId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /experiments/:id/publish
 * Publish and freeze an experiment snapshot
 */
experimentRouter.post(
  '/:id/publish',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const researcherId = req.researcher!.id;
      const result = await experimentService.publishExperiment(req.params.id as string, researcherId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);
