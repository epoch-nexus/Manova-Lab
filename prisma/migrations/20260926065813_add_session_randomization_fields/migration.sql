-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "randomizationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "randomizationSeed" TEXT,
ADD COLUMN     "trialOrder" JSONB;
