/**
 * Manova Labs — Core TypeScript Type Definitions
 * 
 * Phase 1 Architecture Contract
 * Strictly type-only: contains no runtime code, classes, functions, or executable logic.
 */

// ==========================================
// 1. Common & Primitive Types
// ==========================================

export type UUID = string;
export type ISO8601Timestamp = string;

export type ExperimentStatus = 'DRAFT' | 'PUBLISHED';
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

// ==========================================
// 2. Stimulus Contracts
// ==========================================

export type StimulusType = 'text' | 'image' | 'audio' | 'video';

export interface BaseStimulus {
  id: UUID;
  type: StimulusType;
  metadata?: Record<string, unknown>;
}

export interface TextStimulusStyling {
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface TextStimulus extends BaseStimulus {
  type: 'text';
  content: string;
  styling?: TextStimulusStyling;
}

export interface ImageStimulusStyling {
  width?: string;
  height?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
  border?: string;
}

export interface ImageStimulus extends BaseStimulus {
  type: 'image';
  url: string;
  altText?: string;
  styling?: ImageStimulusStyling;
}

/**
 * Union discriminator for all stimulus variations.
 * Extensible for future AudioStimulus, VideoStimulus types.
 */
export type Stimulus = TextStimulus | ImageStimulus;

// ==========================================
// 3. Expected Response & Timing Configuration
// ==========================================

export type ResponseType = 'keypress' | 'button_click';
export type EvaluationMode = 'exact_match' | 'none';

export interface ExpectedKeypressResponse {
  type: 'keypress';
  allowedKeys: string[];
  correctResponse?: string;
  evaluationMode: EvaluationMode;
}

export interface ExpectedButtonClickResponse {
  type: 'button_click';
  allowedButtons: string[];
  correctResponse?: string;
  evaluationMode: EvaluationMode;
}

export type ExpectedResponse = ExpectedKeypressResponse | ExpectedButtonClickResponse;

export interface TrialTimingConfig {
  preStimulusDelayMs: number;
  stimulusDurationMs: number | null;
  responseTimeoutMs: number | null;
  allowEarlyResponse: boolean;
  waitForResponse: boolean;
}

export interface FixationConfig {
  enabled: boolean;
  durationMs: number;
  symbol: string;
  color?: string;
  fontSize?: string;
}

// ==========================================
// 4. Trial Progression & Branching Seam
// ==========================================

export interface BranchingCondition {
  operator: 'equals' | 'not_equals' | 'less_than' | 'greater_than';
  field: 'isCorrect' | 'reactionTimeMs' | 'submittedResponse';
  value: string | number | boolean;
  targetTrialId: UUID;
}

export interface TrialBranchingRule {
  conditions: BranchingCondition[];
  defaultNextTrialId: UUID | null;
}

export interface Trial {
  id: UUID;
  orderIndex: number;
  label?: string | null;
  instructions?: string | null;
  fixation?: FixationConfig | null;
  stimulus: Stimulus;
  timingConfig: TrialTimingConfig;
  expectedResponse: ExpectedResponse;
  nextTrialId: UUID | null;
  branching?: TrialBranchingRule | null;
}

// ==========================================
// 5. Experiment Entity
// ==========================================

export interface ExperimentDisplayConfig {
  displayMode: 'fullscreen' | 'windowed';
  backgroundColor: string;
  allowPause: boolean;
  showFeedback: boolean;
}

export interface Experiment {
  id: UUID;
  title: string;
  description: string;
  status: ExperimentStatus;
  version: number;
  ownerResearcherId: UUID;
  publicSlug: string;
  generalInstructions?: string | null;
  completionMessage?: string | null;
  config: ExperimentDisplayConfig;
  trials: Trial[];
  createdAt: ISO8601Timestamp;
  updatedAt: ISO8601Timestamp;
  publishedAt?: ISO8601Timestamp | null;
}

// ==========================================
// 6. Timing Measurement & Participant Response
// ==========================================

export type TimingMethod = 'requestAnimationFrame' | 'performanceNow' | 'fallback';

export interface HardwarePrecisionTelemetry {
  timingMethod: TimingMethod;
  displayRefreshRateEstimateHz: number | null;
  hiddenTabDetected: boolean;
  preStimulusActualDurationMs?: number;
}

export interface TimingMeasurement {
  stimulusOnsetTimestamp: number;
  responseTimestamp: number;
  calculatedLatencyMs: number;
  hardwarePrecision: HardwarePrecisionTelemetry;
}

export interface ClientDeviceMetadata {
  userAgent: string;
  screenResolution: string;
  viewportSize: string;
  devicePixelRatio: number;
}

export interface ParticipantResponse {
  id: UUID;
  sessionId: UUID;
  trialId: UUID;
  submittedResponse: string | null;
  isCorrect: boolean | null;
  reactionTimeMs: number | null;
  timedOut: boolean;
  timingMeasurement: TimingMeasurement | null;
  clientMetadata: ClientDeviceMetadata;
  submittedAt: ISO8601Timestamp;
}

// ==========================================
// 7. Session Entity
// ==========================================

export interface ClientEnvironmentSummary {
  browser: string;
  os: string;
  screenResolution: string;
  devicePixelRatio: number;
}

export interface Session {
  id: UUID;
  experimentId: UUID;
  experimentVersion: number;
  experimentSnapshotId: string;
  participantId: string;
  status: SessionStatus;
  currentTrialId: UUID | null;
  currentTrialIndex: number;
  totalTrials: number;
  startedAt: ISO8601Timestamp;
  completedAt?: ISO8601Timestamp | null;
  clientEnvironment: ClientEnvironmentSummary;
}

// ==========================================
// 8. API Error Shapes
// ==========================================

export type ApiErrorCode =
  | 'EXPERIMENT_NOT_FOUND'
  | 'INVALID_EXPERIMENT'
  | 'EXPERIMENT_NOT_PUBLISHED'
  | 'EXPERIMENT_ALREADY_PUBLISHED'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_ALREADY_COMPLETED'
  | 'INVALID_RESPONSE'
  | 'TRIAL_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_SERVER_ERROR';

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

// ==========================================
// 9. API Request/Response Payloads
// ==========================================

export interface CreateExperimentDto {
  title: string;
  description: string;
  publicSlug: string;
  generalInstructions?: string | null;
  completionMessage?: string | null;
  config?: Partial<ExperimentDisplayConfig>;
  trials?: Trial[];
}

export interface UpdateExperimentDto {
  title?: string;
  description?: string;
  publicSlug?: string;
  generalInstructions?: string | null;
  completionMessage?: string | null;
  config?: Partial<ExperimentDisplayConfig>;
  trials?: Trial[];
}

export interface PublishExperimentResponse {
  experimentId: UUID;
  version: number;
  publicSlug: string;
  publishedAt: ISO8601Timestamp;
  status: 'PUBLISHED';
}

export interface StartSessionDto {
  clientEnvironment: ClientEnvironmentSummary;
}

export interface StartSessionResponse {
  sessionId: UUID;
  experimentId: UUID;
  experimentTitle: string;
  generalInstructions?: string | null;
  totalTrials: number;
  firstTrial: Trial;
}

export interface SubmitResponseDto {
  submittedResponse: string | null;
  reactionTimeMs: number | null;
  timedOut: boolean;
  timingMeasurement: TimingMeasurement | null;
  clientMetadata: ClientDeviceMetadata;
}

export interface SubmitResponseResult {
  responseId: UUID;
  isCorrect: boolean | null;
  feedback?: string | null;
  sessionStatus: SessionStatus;
  nextTrial: Trial | null;
  isCompleted: boolean;
}
