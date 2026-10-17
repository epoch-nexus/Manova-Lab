import { z } from 'zod';

export const surveyQuestionTypeSchema = z.enum([
  'multiple_choice',
  'likert',
  'matrix',
  'open_text',
]);

export type SurveyQuestionType = z.infer<typeof surveyQuestionTypeSchema>;

export const multipleChoiceOptionSchema = z.union([
  z.string().min(1),
  z.object({
    value: z.string().min(1),
    label: z.string().min(1),
  }),
]);

export const surveyQuestionSchema = z.object({
  id: z.string().min(1),
  type: surveyQuestionTypeSchema,
  prompt: z.string().min(1, 'Question prompt is required'),
  description: z.string().optional(),
  required: z.boolean().default(true),
  // Multiple Choice specific
  options: z.array(multipleChoiceOptionSchema).optional(),
  allowMultiple: z.boolean().optional().default(false),
  // Likert (1-7) specific
  scaleMin: z.number().int().default(1),
  scaleMax: z.number().int().default(7),
  minLabel: z.string().optional().default('Strongly Disagree'),
  midLabel: z.string().optional().default('Neutral'),
  maxLabel: z.string().optional().default('Strongly Agree'),
  labels: z.array(z.string()).optional(),
  // Matrix specific
  rows: z.array(z.string().min(1)).optional(),
  columns: z.array(z.string().min(1)).optional(),
  // Open text specific
  placeholder: z.string().optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),
});

export type SurveyQuestion = z.infer<typeof surveyQuestionSchema>;

export const createSurveySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3, 'Survey title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional().default(''),
  preset: z.string().optional().default('Survey'),
  config: z.record(z.any()).optional().default({}),
  questions: z.array(surveyQuestionSchema).min(1, 'Survey must contain at least one question'),
});

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;

export const surveyAnswerItemSchema = z.object({
  questionId: z.string().min(1),
  questionType: surveyQuestionTypeSchema,
  response: z.any(),
  dwellTimeMs: z.number().nonnegative(),
  startedAtMs: z.number().optional(),
  submittedAtMs: z.number().optional(),
});

export type SurveyAnswerItem = z.infer<typeof surveyAnswerItemSchema>;

export const submitSurveyResponseSchema = z.object({
  respondentToken: z.string().optional(),
  participantId: z.string().optional(),
  answers: z.array(surveyAnswerItemSchema).min(1, 'At least one answer is required'),
  totalDurationMs: z.number().nonnegative(),
  clientMetadata: z.record(z.any()).optional().default({}),
});

export type SubmitSurveyResponseInput = z.infer<typeof submitSurveyResponseSchema>;
