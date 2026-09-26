import { Router, type Request, type Response, type NextFunction } from 'express';
import { ResultsService } from '../../domain/results.service.js';
import {
  resultsQuerySchema,
  resultsSummaryQuerySchema,
} from '../../schemas/results.schema.js';
import { requireAuth } from '../middleware/auth.js';

export const resultsRouter = Router({ mergeParams: true });
const resultsService = new ResultsService();

// Researcher results endpoints require authentication
resultsRouter.use(requireAuth);

/**
 * GET /api/v1/experiments/:experimentId/results
 * Returns raw trial response records with optional filtering.
 */
resultsRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const experimentId = Array.isArray(req.params.experimentId)
        ? req.params.experimentId[0]!
        : req.params.experimentId!;
      const researcherId = req.researcher!.id;
      const query = resultsQuerySchema.parse(req.query);
      const data = await resultsService.getRawResults(experimentId, query, researcherId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/experiments/:experimentId/results/summary
 * Returns aggregated descriptive statistics at the experiment or trial level.
 */
resultsRouter.get(
  '/summary',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const experimentId = Array.isArray(req.params.experimentId)
        ? req.params.experimentId[0]!
        : req.params.experimentId!;
      const researcherId = req.researcher!.id;
      const query = resultsSummaryQuerySchema.parse(req.query);
      const summary = await resultsService.getSummary(experimentId, query, researcherId);
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/experiments/:experimentId/results/export.json
 * Generates and downloads a complete JSON results export.
 */
resultsRouter.get(
  '/export.json',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const experimentId = Array.isArray(req.params.experimentId)
        ? req.params.experimentId[0]!
        : req.params.experimentId!;
      const researcherId = req.researcher!.id;
      const query = resultsQuerySchema.parse(req.query);
      const exportData = await resultsService.exportJson(experimentId, query, researcherId);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="experiment_${experimentId}_results.json"`
      );
      res.status(200).json(exportData);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/experiments/:experimentId/results/export.csv
 * Generates and downloads a standard RFC 4180 CSV export.
 */
resultsRouter.get(
  '/export.csv',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const experimentId = Array.isArray(req.params.experimentId)
        ? req.params.experimentId[0]!
        : req.params.experimentId!;
      const researcherId = req.researcher!.id;
      const query = resultsQuerySchema.parse(req.query);
      const csvData = await resultsService.exportCsv(experimentId, query, researcherId);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="experiment_${experimentId}_results.csv"`
      );
      res.status(200).send(csvData);
    } catch (err) {
      next(err);
    }
  }
);
