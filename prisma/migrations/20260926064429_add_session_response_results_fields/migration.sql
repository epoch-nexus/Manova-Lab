-- AlterTable
ALTER TABLE "session_responses" ADD COLUMN     "clientMetadata" JSONB,
ADD COLUMN     "isCorrect" BOOLEAN,
ADD COLUMN     "reactionTimeMs" DOUBLE PRECISION,
ADD COLUMN     "timedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timingMeasurement" JSONB;

-- CreateIndex
CREATE INDEX "session_responses_sessionId_idx" ON "session_responses"("sessionId");

-- CreateIndex
CREATE INDEX "session_responses_trialId_idx" ON "session_responses"("trialId");

-- CreateIndex
CREATE INDEX "session_responses_submittedAt_idx" ON "session_responses"("submittedAt");
