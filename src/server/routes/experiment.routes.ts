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
      res.setHeader('Location', `/api/v1/experiments/${result.id}`);
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
      const queryTarget =
        (req.query.user_id as string) ||
        (req.query.email as string) ||
        (req.query.researcherId as string);
      const researcherId = queryTarget || req.researcher!.id || req.researcher!.email;
      const result = await experimentService.listExperiments(researcherId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /experiments/:id or /experiments/:experiment_id
 * Retrieve single experiment by ID or publicSlug
 */
experimentRouter.get(
  ['/:id', '/:experiment_id'],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const expId = (req.params.id || req.params.experiment_id || req.params.experimentId) as string;
      const researcherId = req.researcher!.id;
      const result = await experimentService.getExperimentById(expId, researcherId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /experiments/:id or /experiments/:experiment_id
 * Update an existing experiment
 */
experimentRouter.put(
  ['/:id', '/:experiment_id'],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const expId = (req.params.id || req.params.experiment_id || req.params.experimentId) as string;
      const researcherId = req.researcher!.id;
      const result = await experimentService.updateExperiment(
        expId,
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
 * DELETE /experiments/:id or /experiments/:experiment_id
 * Delete an experiment
 */
experimentRouter.delete(
  ['/:id', '/:experiment_id'],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const expId = (req.params.id || req.params.experiment_id || req.params.experimentId) as string;
      const researcherId = req.researcher!.id;
      const force = req.query.force === 'true';
      await experimentService.deleteExperiment(expId, researcherId, force);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /experiments/:id/publish or /experiments/:experiment_id/publish
 * Publish and freeze an experiment snapshot
 */
experimentRouter.post(
  ['/:id/publish', '/:experiment_id/publish'],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const expId = (req.params.id || req.params.experiment_id || req.params.experimentId) as string;
      const researcherId = req.researcher!.id;
      const result = await experimentService.publishExperiment(expId, researcherId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);
