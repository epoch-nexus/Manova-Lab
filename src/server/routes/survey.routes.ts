import { Router, type Request, type Response, type NextFunction } from 'express';
import { surveyService } from '../../domain/survey.service.js';

export const surveyRouter = Router({ mergeParams: true });

/**
 * POST /api/surveys
 * Create a new survey experiment assay
 */
surveyRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await surveyService.createSurvey(req.body);
      res.setHeader('Location', `/api/surveys/${result.id}`);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/surveys
 * List all surveys
 */
surveyRouter.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await surveyService.listSurveys();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/surveys/:id or /api/surveys/:surveyId
 * Fetch single survey by ID
 */
surveyRouter.get(
  ['/:id', '/:surveyId'],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const surveyId = (req.params.id || req.params.surveyId) as string;
      const result = await surveyService.getSurveyById(surveyId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/surveys/:id/submit or /api/surveys/:surveyId/submit
 * Submit participant survey responses with item-level dwell times
 */
surveyRouter.post(
  ['/:id/submit', '/:surveyId/submit'],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const surveyId = (req.params.id || req.params.surveyId) as string;
      const result = await surveyService.submitResponse(surveyId, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/surveys/:id/responses
 * Retrieve survey responses
 */
surveyRouter.get(
  ['/:id/responses', '/:surveyId/responses'],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const surveyId = (req.params.id || req.params.surveyId) as string;
      const result = await surveyService.getResponses(surveyId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/surveys/:id/export.csv
 * Export survey responses to standard RFC 4180 CSV
 */
surveyRouter.get(
  ['/:id/export.csv', '/:surveyId/export.csv'],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const surveyId = (req.params.id || req.params.surveyId) as string;
      const csv = await surveyService.exportCsv(surveyId);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="survey_${surveyId}_responses.csv"`);
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/surveys/:id/export.parquet
 * Export survey responses in Parquet-compatible columnar structure
 */
surveyRouter.get(
  ['/:id/export.parquet', '/:surveyId/export.parquet'],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const surveyId = (req.params.id || req.params.surveyId) as string;
      const data = await surveyService.exportParquetCompatible(surveyId);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="survey_${surveyId}_parquet.json"`);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
);
