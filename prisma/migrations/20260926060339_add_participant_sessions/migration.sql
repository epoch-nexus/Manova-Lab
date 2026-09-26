-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ExecutionState" AS ENUM ('INSTRUCTION', 'TRIAL', 'STIMULUS', 'AWAITING_RESPONSE', 'RECORDED', 'NEXT_TRIAL', 'COMPLETE');

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "executionState" "ExecutionState" NOT NULL DEFAULT 'AWAITING_RESPONSE',
    "currentTrialId" TEXT,
    "currentTrialIndex" INTEGER NOT NULL DEFAULT 0,
    "totalTrials" INTEGER NOT NULL,
    "clientEnvironment" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "experimentId" TEXT NOT NULL,
    "experimentVersion" INTEGER NOT NULL,
    "experimentSnapshotId" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_responses" (
    "id" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,
    "submittedResponse" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "session_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_responses_sessionId_trialId_key" ON "session_responses"("sessionId", "trialId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_experimentSnapshotId_fkey" FOREIGN KEY ("experimentSnapshotId") REFERENCES "experiment_versions"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_responses" ADD CONSTRAINT "session_responses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
