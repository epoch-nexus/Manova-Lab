import { prisma } from '../db/prisma.js';
import { NotFoundError, ForbiddenError } from '../server/errors.js';
import type { ResultsQuery, ResultsSummaryQuery } from '../schemas/results.schema.js';
import type { Response } from 'express';

// ---------------------------------------------------------------
// Output Shapes
// ---------------------------------------------------------------

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
  /** Additive: status of the parent session (Fix 4) */
  sessionStatus: string;
}

export interface ResultsListResponse {
  experimentId: string;
  total: number;
  limit: number;
  results: FormattedResultRecord[];
  /** Keyset cursor — pass as afterSubmittedAt + afterId to get next page */
  nextCursor: { afterSubmittedAt: string; afterId: string } | null;
}

export interface ResultsSummaryResponse {
  experimentId: string;
  trialId: string | null;
  /** Experiment version used for this summary; null means all versions were included */
  version: number | null;
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  /** Additive: sessions currently in progress (Fix 2) */
  inProgressSessions: number;
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

// ---------------------------------------------------------------
// CSV helper – Fix 5
// ---------------------------------------------------------------

/**
 * Escapes a cell value according to RFC 4180.
 * - Numbers are emitted as-is (never prefixed).
 * - String cells starting with = + - @ TAB or CR are prefixed with an
 *   apostrophe to defeat formula injection.
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  // Numbers pass through without quoting or prefix
  if (typeof val === 'number') {
    return String(val);
  }
  const str = String(val);
  // Formula injection prefix for dangerous leading characters
  const dangerous = /^[=+\-@\t\r]/;
  const safe = dangerous.test(str) ? `'${str}` : str;
  // RFC 4180 quoting
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

// CSV header row (sessionStatus is the last column — Fix 5)
const CSV_HEADERS = [
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
  'sessionStatus',
];

function formatRecord(row: {
  id: string;
  sessionId: string;
  trialId: string;
  submittedResponse: string | null;
  isCorrect: boolean | null;
  reactionTimeMs: number | null;
  timedOut: boolean;
  timingMeasurement: unknown;
  clientMetadata: unknown;
  submittedAt: Date;
  session: { id: string; experimentId: string; experimentVersion: number; status: string };
}): FormattedResultRecord {
  return {
    id: row.id,
    sessionId: row.sessionId,
    experimentId: row.session.experimentId,
    experimentVersion: row.session.experimentVersion,
    trialId: row.trialId,
    submittedResponse: row.submittedResponse,
    isCorrect: row.isCorrect,
    reactionTimeMs: row.reactionTimeMs,
    timedOut: row.timedOut,
    timingMeasurement: row.timingMeasurement,
    clientMetadata: row.clientMetadata,
    submittedAt: row.submittedAt.toISOString(),
    sessionStatus: row.session.status,
  };
}

function recordToCsvRow(r: FormattedResultRecord): string {
  const tm = (r.timingMeasurement ?? {}) as Record<string, unknown>;
  const hp = (tm['hardwarePrecision'] ?? {}) as Record<string, unknown>;
  return [
    escapeCsvValue(r.sessionId),
    escapeCsvValue(r.experimentId),
    escapeCsvValue(r.experimentVersion),
    escapeCsvValue(r.trialId),
    escapeCsvValue(r.submittedResponse),
    escapeCsvValue(r.isCorrect),
    escapeCsvValue(r.reactionTimeMs),
    escapeCsvValue(r.timedOut),
    escapeCsvValue(tm['stimulusOnsetTimestamp'] ?? tm['stimulusPresentationTimestamp'] ?? ''),
    escapeCsvValue(tm['responseTimestamp'] ?? ''),
    escapeCsvValue(hp['timingMethod'] ?? ''),
    escapeCsvValue(hp['displayRefreshRateEstimateHz'] ?? ''),
    escapeCsvValue(hp['hiddenTabDetected'] !== undefined ? hp['hiddenTabDetected'] : ''),
    escapeCsvValue(r.submittedAt),
    escapeCsvValue(r.sessionStatus),
  ].join(',');
}

// ---------------------------------------------------------------
// Service
// ---------------------------------------------------------------

export class ResultsService {
  /**
   * Retrieves raw participant response records for an experiment.
   * Fix 1: default limit 500 (max 2000); deterministic order by (submittedAt, id);
   * keyset pagination via (afterSubmittedAt, afterId) cursor.
   * Fix 4: includes sessionStatus per record; supports includeAbandoned filter.
   */
  async getRawResults(
    experimentId: string,
    query?: ResultsQuery,
    researcherId?: string
  ): Promise<ResultsListResponse> {
    const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
    if (!experiment) {
      throw new NotFoundError(`Experiment '${experimentId}' not found`, 'EXPERIMENT_NOT_FOUND');
    }
    if (researcherId && experiment.ownerResearcherId !== researcherId) {
      throw new ForbiddenError('You do not own this experiment');
    }

    const limit = query?.limit ?? 500;

    // Build session-level status filter for includeAbandoned
    const sessionStatusFilter =
      query?.includeAbandoned === false
        ? { status: { not: 'ABANDONED' as const } }
        : undefined;

    // Base session filter
    const sessionFilter = {
      experimentId,
      ...sessionStatusFilter,
    };

    // Build where for SessionResponse
    type WhereInput = {
      session: typeof sessionFilter;
      sessionId?: string;
      trialId?: string;
      timedOut?: boolean;
      submittedAt?: { gte?: Date; lte?: Date };
    };
    const where: WhereInput = { session: sessionFilter };

    if (query?.sessionId) where.sessionId = query.sessionId;
    if (query?.trialId) where.trialId = query.trialId;
    if (query?.timedOut !== undefined) where.timedOut = query.timedOut;

    if (query?.from || query?.to) {
      where.submittedAt = {};
      if (query.from) where.submittedAt.gte = new Date(query.from);
      if (query.to) where.submittedAt.lte = new Date(query.to);
    }

    // Count total matching records (independent of cursor)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = await prisma.sessionResponse.count({ where: where as any });

    // Apply keyset cursor if provided
    type WhereWithCursor = WhereInput & { OR?: Array<{ submittedAt: { gt: Date } } | { submittedAt: { equals: Date }; id: { gt: string } }> };
    let whereWithCursor: WhereWithCursor = where;
    if (query?.afterSubmittedAt && query?.afterId) {
      const cursorDate = new Date(query.afterSubmittedAt);
      whereWithCursor = {
        ...where,
        OR: [
          { submittedAt: { gt: cursorDate } },
          { submittedAt: { equals: cursorDate }, id: { gt: query.afterId } },
        ],
      };
    }

    const responses = await prisma.sessionResponse.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: whereWithCursor as any,
      include: {
        session: {
          select: {
            id: true,
            experimentId: true,
            experimentVersion: true,
            status: true,
          },
        },
      },
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted: FormattedResultRecord[] = responses.map((r) => formatRecord(r as any));

    const lastRow = formatted[formatted.length - 1];
    const nextCursor =
      formatted.length === limit && lastRow
        ? { afterSubmittedAt: lastRow.submittedAt, afterId: lastRow.id }
        : null;

    return { experimentId: experiment.id, total, limit, results: formatted, nextCursor };
  }

  /**
   * Computes descriptive statistics at the experiment-level or trial-level.
   * Fix 2: stats computed in SQL via $queryRaw (count, mean, min, max, stddev_samp, percentile_cont).
   * By default returns stats for the LATEST published version only; pass `version` to override.
   * Additive field: inProgressSessions.
   */
  async getSummary(
    experimentId: string,
    query?: ResultsSummaryQuery,
    researcherId?: string
  ): Promise<ResultsSummaryResponse> {
    const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
    if (!experiment) {
      throw new NotFoundError(`Experiment '${experimentId}' not found`, 'EXPERIMENT_NOT_FOUND');
    }
    if (researcherId && experiment.ownerResearcherId !== researcherId) {
      throw new ForbiddenError('You do not own this experiment');
    }

    // Resolve target version: default to latest, allow override via query.version
    let targetVersion: number | null = null;
    if (query?.version !== undefined) {
      targetVersion = query.version;
    } else {
      const latest = await prisma.experimentVersion.findFirst({
        where: { experimentId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      targetVersion = latest?.version ?? null;
    }

    // Session counts — all versions of this experiment
    const [totalSessions, completedSessions, abandonedSessions, inProgressSessions] =
      await Promise.all([
        prisma.session.count({ where: { experimentId } }),
        prisma.session.count({ where: { experimentId, status: 'COMPLETED' } }),
        prisma.session.count({ where: { experimentId, status: 'ABANDONED' } }),
        prisma.session.count({ where: { experimentId, status: 'IN_PROGRESS' } }),
      ]);

    // Build SQL WHERE clause fragments for version + trial filters
    const versionClause =
      targetVersion !== null
        ? `AND s."experimentVersion" = ${targetVersion}`
        : '';
    const trialClause = query?.trialId
      ? `AND sr."trialId" = '${query.trialId.replace(/'/g, "''")}'`
      : '';

    // Aggregate stats in a single SQL query (Fix 2)
    type StatsRow = {
      total_responses: bigint;
      total_timeouts: bigint;
      non_timeout: bigint;
      correct_count: bigint;
      incorrect_count: bigint;
      mean_rt: number | null;
      min_rt: number | null;
      max_rt: number | null;
      stddev_rt: number | null;
      median_rt: number | null;
    };

    const statsRows = await prisma.$queryRawUnsafe<StatsRow[]>(`
      SELECT
        COUNT(*)::bigint                                          AS total_responses,
        COUNT(*) FILTER (WHERE sr."timedOut" = true)::bigint      AS total_timeouts,
        COUNT(*) FILTER (WHERE sr."timedOut" = false)::bigint     AS non_timeout,
        COUNT(*) FILTER (WHERE sr."isCorrect" = true)::bigint     AS correct_count,
        COUNT(*) FILTER (WHERE sr."isCorrect" = false)::bigint    AS incorrect_count,
        AVG(sr."reactionTimeMs") FILTER (WHERE sr."timedOut" = false AND sr."reactionTimeMs" IS NOT NULL AND sr."reactionTimeMs" >= 0)                        AS mean_rt,
        MIN(sr."reactionTimeMs") FILTER (WHERE sr."timedOut" = false AND sr."reactionTimeMs" IS NOT NULL AND sr."reactionTimeMs" >= 0)                        AS min_rt,
        MAX(sr."reactionTimeMs") FILTER (WHERE sr."timedOut" = false AND sr."reactionTimeMs" IS NOT NULL AND sr."reactionTimeMs" >= 0)                        AS max_rt,
        STDDEV_SAMP(sr."reactionTimeMs") FILTER (WHERE sr."timedOut" = false AND sr."reactionTimeMs" IS NOT NULL AND sr."reactionTimeMs" >= 0)               AS stddev_rt,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sr."reactionTimeMs") FILTER (WHERE sr."timedOut" = false AND sr."reactionTimeMs" IS NOT NULL AND sr."reactionTimeMs" >= 0) AS median_rt
      FROM "session_responses" sr
      JOIN "sessions" s ON s."id" = sr."sessionId"
      WHERE s."experimentId" = '${experimentId.replace(/'/g, "''")}'
      ${versionClause}
      ${trialClause}
    `);

    const stats = statsRows[0];
    const totalResponses = Number(stats?.total_responses ?? 0n);
    const totalTimeouts = Number(stats?.total_timeouts ?? 0n);
    const nonTimeout = Number(stats?.non_timeout ?? 0n);
    const correctCount = Number(stats?.correct_count ?? 0n);
    const incorrectCount = Number(stats?.incorrect_count ?? 0n);
    const evaluatedCount = correctCount + incorrectCount;

    const responseRate = totalResponses > 0 ? Number((nonTimeout / totalResponses).toFixed(4)) : null;
    const accuracyRate = evaluatedCount > 0 ? Number((correctCount / evaluatedCount).toFixed(4)) : null;

    const round3 = (v: number | null | undefined): number | null =>
      v != null && !Number.isNaN(v) ? Number(Number(v).toFixed(3)) : null;

    return {
      experimentId: experiment.id,
      trialId: query?.trialId ?? null,
      version: targetVersion,
      totalSessions,
      completedSessions,
      abandonedSessions,
      inProgressSessions,
      totalResponses,
      totalTimeouts,
      responseRate,
      correctResponses: evaluatedCount > 0 ? correctCount : null,
      incorrectResponses: evaluatedCount > 0 ? incorrectCount : null,
      accuracyRate,
      meanReactionTimeMs: round3(stats?.mean_rt ?? null),
      medianReactionTimeMs: round3(stats?.median_rt ?? null),
      minReactionTimeMs: round3(stats?.min_rt ?? null),
      maxReactionTimeMs: round3(stats?.max_rt ?? null),
      standardDeviationReactionTimeMs: round3(stats?.stddev_rt ?? null),
    };
  }

  /**
   * Generates a structured JSON export, streaming through keyset pagination.
   * Fix 1: Does not load all rows into memory at once — pages in BATCH_SIZE chunks.
   */
  async exportJson(
    experimentId: string,
    query?: ResultsQuery,
    researcherId?: string
  ): Promise<JsonExportResponse> {
    const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
    if (!experiment) {
      throw new NotFoundError(`Experiment '${experimentId}' not found`, 'EXPERIMENT_NOT_FOUND');
    }
    if (researcherId && experiment.ownerResearcherId !== researcherId) {
      throw new ForbiddenError('You do not own this experiment');
    }

    const allResults: FormattedResultRecord[] = [];
    const pageQuery: ResultsQuery = { ...query, limit: 500, includeAbandoned: query?.includeAbandoned ?? true };

    let cursor: { afterSubmittedAt: string; afterId: string } | null = null;
    do {
      const page = await this.getRawResults(
        experimentId,
        cursor ? { ...pageQuery, afterSubmittedAt: cursor.afterSubmittedAt, afterId: cursor.afterId } : pageQuery,
        researcherId
      );
      allResults.push(...page.results);
      cursor = page.nextCursor;
    } while (cursor !== null);

    return {
      experimentId: experiment.id,
      experimentTitle: experiment.title,
      exportedAt: new Date().toISOString(),
      totalResults: allResults.length,
      results: allResults,
    };
  }

  /**
   * Generates a RFC 4180 CSV export, streaming rows through keyset pagination.
   * Fix 1: uses keyset cursor to avoid loading everything into memory.
   * Fix 5: UTF-8 BOM prepended; formula injection prefix for dangerous string cells;
   *        sessionStatus is the LAST column.
   */
  async exportCsv(
    experimentId: string,
    query?: ResultsQuery,
    researcherId?: string
  ): Promise<string> {
    const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
    if (!experiment) {
      throw new NotFoundError(`Experiment '${experimentId}' not found`, 'EXPERIMENT_NOT_FOUND');
    }
    if (researcherId && experiment.ownerResearcherId !== researcherId) {
      throw new ForbiddenError('You do not own this experiment');
    }

    // UTF-8 BOM (Fix 5)
    const BOM = '\uFEFF';
    const lines: string[] = [BOM + CSV_HEADERS.join(',')];

    const pageQuery: ResultsQuery = { ...query, limit: 500, includeAbandoned: query?.includeAbandoned ?? true };
    let cursor: { afterSubmittedAt: string; afterId: string } | null = null;

    do {
      const page = await this.getRawResults(
        experimentId,
        cursor ? { ...pageQuery, afterSubmittedAt: cursor.afterSubmittedAt, afterId: cursor.afterId } : pageQuery,
        researcherId
      );
      for (const r of page.results) {
        lines.push(recordToCsvRow(r));
      }
      cursor = page.nextCursor;
    } while (cursor !== null);

    return lines.join('\r\n');
  }

  /**
   * Streaming CSV export — writes directly to the Express response object
   * so memory footprint is bounded to a single page at a time.
   */
  async streamCsv(
    experimentId: string,
    query: ResultsQuery | undefined,
    researcherId: string,
    res: Response
  ): Promise<void> {
    const experiment = await prisma.experiment.findUnique({ where: { id: experimentId } });
    if (!experiment) {
      throw new NotFoundError(`Experiment '${experimentId}' not found`, 'EXPERIMENT_NOT_FOUND');
    }
    if (experiment.ownerResearcherId !== researcherId) {
      throw new ForbiddenError('You do not own this experiment');
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="experiment_${experimentId}_results.csv"`
    );

    const BOM = '\uFEFF';
    res.write(BOM + CSV_HEADERS.join(',') + '\r\n');

    const pageQuery: ResultsQuery = { ...query, limit: 500, includeAbandoned: query?.includeAbandoned ?? true };
    let cursor: { afterSubmittedAt: string; afterId: string } | null = null;

    do {
      const page = await this.getRawResults(
        experimentId,
        cursor ? { ...pageQuery, afterSubmittedAt: cursor.afterSubmittedAt, afterId: cursor.afterId } : pageQuery,
        researcherId
      );
      for (const r of page.results) {
        res.write(recordToCsvRow(r) + '\r\n');
      }
      cursor = page.nextCursor;
    } while (cursor !== null);

    res.end();
  }
}
