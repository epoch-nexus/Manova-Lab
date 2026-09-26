import { prisma } from '../db/prisma.js';
import { NotFoundError } from '../server/errors.js';
import type { ResultsQuery, ResultsSummaryQuery } from '../schemas/results.schema.js';
import type { Prisma } from '@prisma/client';

export interface FormattedResultRecord {
  id: string;
  sessionId: string;
  experimentId: string;
  experimentVersion: number;
  trialId: string;
  submittedResponse: string | null;
  isCorrect: boolean | null;
  reactionTimeMs: number | null;
  timedOut: boolean;
  timingMeasurement: unknown;
  clientMetadata: unknown;
  submittedAt: string;
}

export interface ResultsListResponse {
  experimentId: string;
  total: number;
  results: FormattedResultRecord[];
}

export interface ResultsSummaryResponse {
  experimentId: string;
  trialId: string | null;
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  totalResponses: number;
  totalTimeouts: number;
  responseRate: number | null;
  correctResponses: number | null;
  incorrectResponses: number | null;
  accuracyRate: number | null;
  meanReactionTimeMs: number | null;
  medianReactionTimeMs: number | null;
  minReactionTimeMs: number | null;
  maxReactionTimeMs: number | null;
  standardDeviationReactionTimeMs: number | null;
}

export interface JsonExportResponse {
  experimentId: string;
  experimentTitle: string;
  exportedAt: string;
  totalResults: number;
  results: FormattedResultRecord[];
}

/**
 * Escapes a cell according to standard RFC 4180 CSV specifications.
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class ResultsService {
  /**
   * Retrieves raw participant response records for an experiment.
   */
  async getRawResults(
    experimentId: string,
    query?: ResultsQuery
  ): Promise<ResultsListResponse> {
    // 1. Verify experiment exists
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new NotFoundError(
        `Experiment '${experimentId}' not found`,
        'EXPERIMENT_NOT_FOUND'
      );
    }

    // 2. Build where filter
    const where: Prisma.SessionResponseWhereInput = {
      session: {
        experimentId,
      },
    };

    if (query?.sessionId) {
      where.sessionId = query.sessionId;
    }

    if (query?.trialId) {
      where.trialId = query.trialId;
    }

    if (query?.timedOut !== undefined) {
      where.timedOut = query.timedOut;
    }

    if (query?.from || query?.to) {
      where.submittedAt = {};
      if (query.from) {
        where.submittedAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.submittedAt.lte = new Date(query.to);
      }
    }

    // 3. Query responses with session metadata
    const [total, responses] = await Promise.all([
      prisma.sessionResponse.count({ where }),
      prisma.sessionResponse.findMany({
        where,
        include: {
          session: {
            select: {
              id: true,
              experimentId: true,
              experimentVersion: true,
            },
          },
        },
        orderBy: { submittedAt: 'asc' },
        skip: query?.offset,
        take: query?.limit,
      }),
    ]);

    const formatted: FormattedResultRecord[] = responses.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      experimentId: r.session.experimentId,
      experimentVersion: r.session.experimentVersion,
      trialId: r.trialId,
      submittedResponse: r.submittedResponse,
      isCorrect: r.isCorrect,
      reactionTimeMs: r.reactionTimeMs,
      timedOut: r.timedOut,
      timingMeasurement: r.timingMeasurement,
      clientMetadata: r.clientMetadata,
      submittedAt: r.submittedAt.toISOString(),
    }));

    return {
      experimentId: experiment.id,
      total,
      results: formatted,
    };
  }

  /**
   * Computes descriptive statistics at the experiment-level or trial-level.
   */
  async getSummary(
    experimentId: string,
    query?: ResultsSummaryQuery
  ): Promise<ResultsSummaryResponse> {
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new NotFoundError(
        `Experiment '${experimentId}' not found`,
        'EXPERIMENT_NOT_FOUND'
      );
    }

    // 1. Session counts
    const [totalSessions, completedSessions, abandonedSessions] = await Promise.all([
      prisma.session.count({ where: { experimentId } }),
      prisma.session.count({ where: { experimentId, status: 'COMPLETED' } }),
      prisma.session.count({ where: { experimentId, status: 'ABANDONED' } }),
    ]);

    // 2. Fetch responses for aggregation
    const responseWhere: Prisma.SessionResponseWhereInput = {
      session: { experimentId },
    };

    if (query?.trialId) {
      responseWhere.trialId = query.trialId;
    }

    const responses = await prisma.sessionResponse.findMany({
      where: responseWhere,
      select: {
        reactionTimeMs: true,
        isCorrect: true,
        timedOut: true,
      },
    });

    const totalResponses = responses.length;
    let totalTimeouts = 0;
    let nonTimeoutCount = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let evaluatedCount = 0;

    const validRTs: number[] = [];

    for (const r of responses) {
      if (r.timedOut) {
        totalTimeouts++;
      } else {
        nonTimeoutCount++;
      }

      if (r.isCorrect === true) {
        correctCount++;
        evaluatedCount++;
      } else if (r.isCorrect === false) {
        incorrectCount++;
        evaluatedCount++;
      }

      // Valid reaction time: not timed out, non-null, and non-negative
      if (!r.timedOut && r.reactionTimeMs !== null && r.reactionTimeMs !== undefined && r.reactionTimeMs >= 0) {
        validRTs.push(r.reactionTimeMs);
      }
    }

    // Response rate definition: non-timeout responses / total response records
    const responseRate =
      totalResponses > 0
        ? Number((nonTimeoutCount / totalResponses).toFixed(4))
        : null;

    // Accuracy rate: correct / (correct + incorrect)
    const accuracyRate =
      evaluatedCount > 0
        ? Number((correctCount / evaluatedCount).toFixed(4))
        : null;

    // Reaction time statistical metrics
    let meanRT: number | null = null;
    let medianRT: number | null = null;
    let minRT: number | null = null;
    let maxRT: number | null = null;
    let stdDevRT: number | null = null;

    if (validRTs.length > 0) {
      validRTs.sort((a, b) => a - b);
      minRT = Number(validRTs[0]!.toFixed(3));
      maxRT = Number(validRTs[validRTs.length - 1]!.toFixed(3));

      const sum = validRTs.reduce((acc, v) => acc + v, 0);
      const mean = sum / validRTs.length;
      meanRT = Number(mean.toFixed(3));

      // Median
      const mid = Math.floor(validRTs.length / 2);
      const median =
        validRTs.length % 2 !== 0
          ? validRTs[mid]!
          : (validRTs[mid - 1]! + validRTs[mid]!) / 2;
      medianRT = Number(median.toFixed(3));

      // Sample Standard Deviation: sqrt(sum((x - mean)^2) / (N - 1))
      if (validRTs.length > 1) {
        const sumSquareDiffs = validRTs.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
        const sampleVariance = sumSquareDiffs / (validRTs.length - 1);
        stdDevRT = Number(Math.sqrt(sampleVariance).toFixed(3));
      } else {
        stdDevRT = 0;
      }
    }

    return {
      experimentId: experiment.id,
      trialId: query?.trialId ?? null,
      totalSessions,
      completedSessions,
      abandonedSessions,
      totalResponses,
      totalTimeouts,
      responseRate,
      correctResponses: evaluatedCount > 0 ? correctCount : null,
      incorrectResponses: evaluatedCount > 0 ? incorrectCount : null,
      accuracyRate,
      meanReactionTimeMs: meanRT,
      medianReactionTimeMs: medianRT,
      minReactionTimeMs: minRT,
      maxReactionTimeMs: maxRT,
      standardDeviationReactionTimeMs: stdDevRT,
    };
  }

  /**
   * Generates a structured JSON export of all trial responses.
   */
  async exportJson(
    experimentId: string,
    query?: ResultsQuery
  ): Promise<JsonExportResponse> {
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new NotFoundError(
        `Experiment '${experimentId}' not found`,
        'EXPERIMENT_NOT_FOUND'
      );
    }

    const raw = await this.getRawResults(experimentId, query);

    return {
      experimentId: experiment.id,
      experimentTitle: experiment.title,
      exportedAt: new Date().toISOString(),
      totalResults: raw.results.length,
      results: raw.results,
    };
  }

  /**
   * Generates a RFC 4180 compliant CSV string of all trial responses.
   * Excludes participantId per privacy guidelines.
   */
  async exportCsv(
    experimentId: string,
    query?: ResultsQuery
  ): Promise<string> {
    const raw = await this.getRawResults(experimentId, query);

    const headers = [
      'sessionId',
      'experimentId',
      'experimentVersion',
      'trialId',
      'submittedResponse',
      'isCorrect',
      'reactionTimeMs',
      'timedOut',
      'stimulusOnsetTimestamp',
      'responseTimestamp',
      'timingMethod',
      'displayRefreshRateEstimateHz',
      'hiddenTabDetected',
      'submittedAt',
    ];

    const lines: string[] = [headers.join(',')];

    for (const r of raw.results) {
      const tm = (r.timingMeasurement ?? {}) as Record<string, any>;
      const hp = (tm.hardwarePrecision ?? {}) as Record<string, any>;

      const stimulusOnsetTimestamp = tm.stimulusOnsetTimestamp ?? tm.stimulusPresentationTimestamp ?? '';
      const responseTimestamp = tm.responseTimestamp ?? '';
      const timingMethod = hp.timingMethod ?? '';
      const displayRefreshRateEstimateHz = hp.displayRefreshRateEstimateHz ?? '';
      const hiddenTabDetected = hp.hiddenTabDetected !== undefined ? hp.hiddenTabDetected : '';

      const row = [
        escapeCsvValue(r.sessionId),
        escapeCsvValue(r.experimentId),
        escapeCsvValue(r.experimentVersion),
        escapeCsvValue(r.trialId),
        escapeCsvValue(r.submittedResponse),
        escapeCsvValue(r.isCorrect),
        escapeCsvValue(r.reactionTimeMs),
        escapeCsvValue(r.timedOut),
        escapeCsvValue(stimulusOnsetTimestamp),
        escapeCsvValue(responseTimestamp),
        escapeCsvValue(timingMethod),
        escapeCsvValue(displayRefreshRateEstimateHz),
        escapeCsvValue(hiddenTabDetected),
        escapeCsvValue(r.submittedAt),
      ];

      lines.push(row.join(','));
    }

    return lines.join('\r\n');
  }
}
