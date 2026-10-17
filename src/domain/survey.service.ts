import { prisma } from '../db/prisma.js';
import {
  createSurveySchema,
  submitSurveyResponseSchema,
  type SurveyAnswerItem,
} from '../schemas/survey.schema.js';
import { NotFoundError, AppError } from '../server/errors.js';
import { buildZodErrorPayload } from '../server/middleware/errorHandler.js';
import { randomUUID } from 'crypto';

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  // Formula injection defense
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class SurveyService {
  /**
   * Creates a new survey protocol with questions.
   */
  async createSurvey(input: unknown) {
    const parsed = createSurveySchema.safeParse(input);
    if (!parsed.success) {
      const errPayload = buildZodErrorPayload(parsed.error, 'VALIDATION_ERROR');
      throw new AppError(400, 'VALIDATION_ERROR', errPayload.message, errPayload.details, errPayload.fieldErrors);
    }
    const validated = parsed.data;
    const surveyId = validated.id || randomUUID();

    const questionCreates = (validated.questions || []).map((q: any, idx: number) => ({
      id: q.id || randomUUID(),
      orderIndex: idx,
      type: q.type,
      prompt: q.prompt,
      description: q.description || null,
      required: q.required ?? true,
      options: q.options ? q.options : null,
      scaleMin: q.scaleMin ?? (q.type === 'likert' ? 1 : null),
      scaleMax: q.scaleMax ?? (q.type === 'likert' ? 7 : null),
      minLabel: q.minLabel || null,
      midLabel: q.midLabel || null,
      maxLabel: q.maxLabel || null,
      rows: q.rows ? q.rows : null,
      columns: q.columns ? q.columns : null,
      validation: q.validation ? q.validation : null,
    }));

    const created = await prisma.survey.create({
      data: {
        id: surveyId,
        title: validated.title,
        description: validated.description || '',
        preset: validated.preset || 'Survey',
        config: (validated.config || {}) as any,
        questions: validated.questions as any,
        surveyQuestions: {
          create: questionCreates,
        },
      },
      include: {
        surveyQuestions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return {
      id: created.id,
      title: created.title,
      description: created.description,
      preset: created.preset,
      config: created.config,
      questions: created.questions || created.surveyQuestions,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieves single survey by ID.
   */
  async getSurveyById(id: string) {
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        surveyQuestions: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: { responses: true },
        },
      },
    });

    if (!survey) {
      throw new NotFoundError(`Survey '${id}' not found`, 'SURVEY_NOT_FOUND');
    }

    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      preset: survey.preset,
      config: survey.config,
      questions: survey.questions || survey.surveyQuestions,
      surveyQuestions: survey.surveyQuestions,
      responseCount: survey._count?.responses ?? 0,
      createdAt: survey.createdAt.toISOString(),
      updatedAt: survey.updatedAt.toISOString(),
    };
  }

  /**
   * Lists all registered survey protocols.
   */
  async listSurveys() {
    const surveys = await prisma.survey.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { responses: true },
        },
      },
    });

    return {
      surveys: surveys.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        preset: s.preset,
        responseCount: s._count?.responses ?? 0,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      total: surveys.length,
    };
  }

  /**
   * Records a respondent's survey answers with item-level dwell deltas.
   */
  async submitResponse(surveyId: string, input: unknown) {
    // Verify survey existence
    await this.getSurveyById(surveyId);

    const parsed = submitSurveyResponseSchema.safeParse(input);
    if (!parsed.success) {
      const errPayload = buildZodErrorPayload(parsed.error, 'VALIDATION_ERROR');
      throw new AppError(400, 'VALIDATION_ERROR', errPayload.message, errPayload.details, errPayload.fieldErrors);
    }
    const validated = parsed.data;
    const responseId = randomUUID();
    const respondentToken = validated.respondentToken || validated.participantId || randomUUID();

    const created = await prisma.surveyResponse.create({
      data: {
        id: responseId,
        surveyId,
        respondentToken,
        participantId: validated.participantId || respondentToken,
        answers: validated.answers as any,
        totalDurationMs: validated.totalDurationMs,
        clientMetadata: (validated.clientMetadata || {}) as any,
      },
    });

    return {
      id: created.id,
      surveyId: created.surveyId,
      participantId: created.participantId,
      respondentToken: created.respondentToken,
      status: 'RECORDED',
      totalDurationMs: created.totalDurationMs,
      itemCount: (validated.answers || []).length,
      submittedAt: created.submittedAt.toISOString(),
    };
  }

  /**
   * Retrieves all responses for a survey.
   */
  async getResponses(surveyId: string) {
    const survey = await this.getSurveyById(surveyId);
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      surveyId: survey.id,
      surveyTitle: survey.title,
      totalResponses: responses.length,
      responses: responses.map((r) => ({
        id: r.id,
        participantId: r.participantId,
        respondentToken: r.respondentToken || r.participantId,
        answers: r.answers,
        totalDurationMs: r.totalDurationMs,
        clientMetadata: r.clientMetadata,
        submittedAt: r.submittedAt.toISOString(),
      })),
    };
  }

  /**
   * Generates standard RFC 4180 CSV export of item-level answers and dwell times.
   */
  async exportCsv(surveyId: string): Promise<string> {
    const { surveyTitle, responses } = await this.getResponses(surveyId);

    const headers = [
      'responseId',
      'surveyId',
      'surveyTitle',
      'respondentToken',
      'participantId',
      'questionId',
      'questionType',
      'response',
      'dwellTimeMs',
      'startedAtMs',
      'submittedAtMs',
      'totalDurationMs',
      'submittedAt',
    ];

    const lines: string[] = ['\uFEFF' + headers.join(',')];

    for (const r of responses) {
      const answers = (Array.isArray(r.answers) ? r.answers : []) as SurveyAnswerItem[];
      for (const a of answers) {
        if (!a) continue;
        lines.push(
          [
            escapeCsvField(r.id),
            escapeCsvField(surveyId),
            escapeCsvField(surveyTitle),
            escapeCsvField(r.respondentToken || r.participantId),
            escapeCsvField(r.participantId),
            escapeCsvField(a.questionId),
            escapeCsvField(a.questionType),
            escapeCsvField(a.response),
            escapeCsvField(a.dwellTimeMs),
            escapeCsvField(a.startedAtMs ?? ''),
            escapeCsvField(a.submittedAtMs ?? ''),
            escapeCsvField(r.totalDurationMs),
            escapeCsvField(r.submittedAt),
          ].join(',')
        );
      }
    }

    return lines.join('\r\n');
  }

  /**
   * Generates Parquet-compatible columnar representation of survey responses.
   */
  async exportParquetCompatible(surveyId: string) {
    const { surveyTitle, responses } = await this.getResponses(surveyId);

    const responseId: string[] = [];
    const respondentToken: string[] = [];
    const participantId: string[] = [];
    const questionId: string[] = [];
    const questionType: string[] = [];
    const responseValue: string[] = [];
    const dwellTimeMs: number[] = [];
    const totalDurationMs: number[] = [];
    const submittedAt: string[] = [];

    for (const r of responses) {
      const answers = (Array.isArray(r.answers) ? r.answers : []) as SurveyAnswerItem[];
      for (const a of answers) {
        if (!a) continue;
        responseId.push(r.id);
        respondentToken.push(r.respondentToken || r.participantId || '');
        participantId.push(r.participantId || '');
        questionId.push(a.questionId || '');
        questionType.push(a.questionType || '');
        responseValue.push(typeof a.response === 'object' ? JSON.stringify(a.response) : String(a.response ?? ''));
        dwellTimeMs.push(typeof a.dwellTimeMs === 'number' ? a.dwellTimeMs : 0);
        totalDurationMs.push(r.totalDurationMs || 0);
        submittedAt.push(r.submittedAt);
      }
    }

    return {
      schema: {
        specification: 'PARQUET_COMPATIBLE_COLUMNAR_v1',
        surveyId,
        surveyTitle,
        columns: [
          { name: 'responseId', type: 'UTF8' },
          { name: 'respondentToken', type: 'UTF8' },
          { name: 'participantId', type: 'UTF8' },
          { name: 'questionId', type: 'UTF8' },
          { name: 'questionType', type: 'UTF8' },
          { name: 'responseValue', type: 'UTF8' },
          { name: 'dwellTimeMs', type: 'FLOAT' },
          { name: 'totalDurationMs', type: 'FLOAT' },
          { name: 'submittedAt', type: 'TIMESTAMP_MILLIS' },
        ],
      },
      numRows: responseId.length,
      columns: {
        responseId,
        respondentToken,
        participantId,
        questionId,
        questionType,
        responseValue,
        dwellTimeMs,
        totalDurationMs,
        submittedAt,
      },
    };
  }
}

export const surveyService = new SurveyService();
