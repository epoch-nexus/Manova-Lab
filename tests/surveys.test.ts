import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/db/prisma.js';

const app = createApp();

describe('Survey Experiments & Timing Telemetry Module', () => {
  beforeEach(async () => {
    await prisma.surveyResponse.deleteMany();
    await prisma.surveyQuestion.deleteMany();
    await prisma.survey.deleteMany();
  });

  afterAll(async () => {
    await prisma.surveyResponse.deleteMany();
    await prisma.surveyQuestion.deleteMany();
    await prisma.survey.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/surveys (Create Survey)', () => {
    it('should create a survey assay with multiple_choice, likert (1-7), matrix, and open_text questions', async () => {
      const payload = {
        title: 'Cognitive Workload & Usability Battery',
        description: 'Multi-paradigm survey assay assessing task load and interface friction.',
        preset: 'Survey',
        questions: [
          {
            id: 'q_likert_1',
            type: 'likert',
            prompt: 'How mentally demanding was the cognitive assay?',
            scaleMin: 1,
            scaleMax: 7,
            minLabel: 'Very Low',
            midLabel: 'Moderate',
            maxLabel: 'Very High',
            required: true,
          },
          {
            id: 'q_mc_2',
            type: 'multiple_choice',
            prompt: 'Which response modality was most intuitive?',
            options: ['Keyboard (Space/Keys)', 'Mouse Clicks', 'Touch Display'],
            allowMultiple: false,
            required: true,
          },
          {
            id: 'q_matrix_3',
            type: 'matrix',
            prompt: 'Rate the following interface aspects:',
            rows: ['Visual clarity', 'Responsiveness', 'Instruction completeness'],
            columns: ['Poor', 'Fair', 'Good', 'Excellent'],
            required: true,
          },
          {
            id: 'q_open_4',
            type: 'open_text',
            prompt: 'Please provide any qualitative observations or feedback:',
            placeholder: 'Type your feedback here...',
            required: false,
          },
        ],
      };

      const res = await request(app).post('/api/surveys').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(typeof res.body.id).toBe('string');
      expect(res.body.title).toBe(payload.title);
      expect(res.body.questions).toHaveLength(4);
      expect(res.headers.location).toBe(`/api/surveys/${res.body.id}`);
    });

    it('should reject survey creation with invalid or empty questions', async () => {
      const res = await request(app).post('/api/surveys').send({
        title: 'Empty Survey',
        questions: [],
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/surveys/:id (Fetch Survey)', () => {
    it('should retrieve single survey by dynamic path ID', async () => {
      const createRes = await request(app).post('/api/surveys').send({
        title: 'Post-Task NASA-TLX Survey',
        description: 'Task load index evaluation.',
        questions: [
          {
            id: 'tlx_mental',
            type: 'likert',
            prompt: 'Mental Demand (1 = Low, 7 = High)',
            scaleMin: 1,
            scaleMax: 7,
            required: true,
          },
        ],
      });

      const surveyId = createRes.body.id;
      const getRes = await request(app).get(`/api/surveys/${surveyId}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(surveyId);
      expect(getRes.body.title).toBe('Post-Task NASA-TLX Survey');
      expect(getRes.body.questions[0].id).toBe('tlx_mental');
    });

    it('should return 404 when survey ID does not exist', async () => {
      const nonexistent = '00000000-0000-0000-0000-000000000000';
      const res = await request(app).get(`/api/surveys/${nonexistent}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SURVEY_NOT_FOUND');
    });
  });

  describe('POST /api/surveys/:id/submit & Data Export (CSV & Parquet)', () => {
    it('should record respondent answers with item-level dwell deltas with millisecond precision', async () => {
      const surveyRes = await request(app).post('/api/surveys').send({
        title: 'Usability Evaluation Survey',
        questions: [
          {
            id: 'q_likert',
            type: 'likert',
            prompt: 'Rate overall satisfaction (1-7):',
            scaleMin: 1,
            scaleMax: 7,
            required: true,
          },
          {
            id: 'q_open',
            type: 'open_text',
            prompt: 'Additional comments:',
            required: false,
          },
        ],
      });

      const surveyId = surveyRes.body.id;

      // Submit responses with item-level dwell times measured via performance.now()
      const submission = {
        participantId: 'part_anon_8821',
        answers: [
          {
            questionId: 'q_likert',
            questionType: 'likert',
            response: 6,
            dwellTimeMs: 2450.85,
            startedAtMs: 100.25,
            submittedAtMs: 2551.1,
          },
          {
            questionId: 'q_open',
            questionType: 'open_text',
            response: 'Clean interface with fluid transitions.',
            dwellTimeMs: 5120.4,
            startedAtMs: 2551.1,
            submittedAtMs: 7671.5,
          },
        ],
        totalDurationMs: 7571.25,
        clientMetadata: {
          browser: 'Chrome 122',
          screenResolution: '2560x1440',
        },
      };

      const submitRes = await request(app)
        .post(`/api/surveys/${surveyId}/submit`)
        .send(submission);

      expect(submitRes.status).toBe(201);
      expect(submitRes.body.status).toBe('RECORDED');
      expect(submitRes.body.surveyId).toBe(surveyId);
      expect(submitRes.body.itemCount).toBe(2);
      expect(submitRes.body.totalDurationMs).toBe(7571.25);

      // Verify responses retrieval
      const getResponsesRes = await request(app).get(`/api/surveys/${surveyId}/responses`);
      expect(getResponsesRes.status).toBe(200);
      expect(getResponsesRes.body.totalResponses).toBe(1);
      expect(getResponsesRes.body.responses[0].answers).toHaveLength(2);
      expect(getResponsesRes.body.responses[0].answers[0].dwellTimeMs).toBe(2450.85);

      // Verify CSV Export
      const csvRes = await request(app).get(`/api/surveys/${surveyId}/export.csv`);
      expect(csvRes.status).toBe(200);
      expect(csvRes.headers['content-type']).toContain('text/csv');
      expect(csvRes.text).toContain('q_likert');
      expect(csvRes.text).toContain('2450.85');
      expect(csvRes.text).toContain('Clean interface with fluid transitions');

      // Verify Parquet-compatible columnar export
      const parquetRes = await request(app).get(`/api/surveys/${surveyId}/export.parquet`);
      expect(parquetRes.status).toBe(200);
      expect(parquetRes.body.schema.specification).toBe('PARQUET_COMPATIBLE_COLUMNAR_v1');
      expect(parquetRes.body.columns.questionId).toContain('q_likert');
      expect(parquetRes.body.columns.dwellTimeMs).toContain(2450.85);
      expect(parquetRes.body.numRows).toBe(2);
    });
  });
});
