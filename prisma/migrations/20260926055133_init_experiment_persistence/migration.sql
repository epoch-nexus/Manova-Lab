-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "experiments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "ownerResearcherId" TEXT NOT NULL DEFAULT 'res_anonymous_researcher',
    "publicSlug" TEXT NOT NULL,
    "generalInstructions" TEXT,
    "completionMessage" TEXT,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trials" (
    "id" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "label" TEXT,
    "instructions" TEXT,
    "fixation" JSONB,
    "timingConfig" JSONB NOT NULL,
    "nextTrialId" TEXT,
    "branching" JSONB,
    "experimentId" TEXT NOT NULL,

    CONSTRAINT "trials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stimuli" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "altText" TEXT,
    "styling" JSONB,
    "metadata" JSONB,
    "trialId" TEXT NOT NULL,

    CONSTRAINT "stimuli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expected_responses" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "allowedKeys" TEXT[],
    "allowedButtons" TEXT[],
    "correctResponse" TEXT,
    "evaluationMode" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,

    CONSTRAINT "expected_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_versions" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "publicSlug" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotData" JSONB NOT NULL,
    "experimentId" TEXT NOT NULL,

    CONSTRAINT "experiment_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "experiments_publicSlug_key" ON "experiments"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "stimuli_trialId_key" ON "stimuli"("trialId");

-- CreateIndex
CREATE UNIQUE INDEX "expected_responses_trialId_key" ON "expected_responses"("trialId");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_versions_snapshotId_key" ON "experiment_versions"("snapshotId");

-- AddForeignKey
ALTER TABLE "trials" ADD CONSTRAINT "trials_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stimuli" ADD CONSTRAINT "stimuli_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expected_responses" ADD CONSTRAINT "expected_responses_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "trials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_versions" ADD CONSTRAINT "experiment_versions_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
