-- Detection queries for potential duplicate rows before applying unique constraints:
-- 1. Check for duplicates in experiment_versions (experimentId, version):
--    SELECT "experimentId", "version", COUNT(*) FROM "experiment_versions" GROUP BY "experimentId", "version" HAVING COUNT(*) > 1;
-- 2. Check for duplicates in trials (experimentId, orderIndex):
--    SELECT "experimentId", "orderIndex", COUNT(*) FROM "trials" GROUP BY "experimentId", "orderIndex" HAVING COUNT(*) > 1;

-- CreateIndex
CREATE INDEX "experiments_ownerResearcherId_idx" ON "experiments"("ownerResearcherId");

-- CreateIndex
CREATE INDEX "trials_experimentId_idx" ON "trials"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "trials_experimentId_orderIndex_key" ON "trials"("experimentId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_versions_experimentId_version_key" ON "experiment_versions"("experimentId", "version");

-- CreateIndex
CREATE INDEX "sessions_experimentId_idx" ON "sessions"("experimentId");

-- CreateIndex
CREATE INDEX "sessions_experimentSnapshotId_idx" ON "sessions"("experimentSnapshotId");
