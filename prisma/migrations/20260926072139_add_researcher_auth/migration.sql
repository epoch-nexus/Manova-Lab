-- AlterTable
ALTER TABLE "experiments" ALTER COLUMN "ownerResearcherId" DROP DEFAULT;

-- CreateTable
CREATE TABLE "researchers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "researchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "researchers_email_key" ON "researchers"("email");

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_ownerResearcherId_fkey" FOREIGN KEY ("ownerResearcherId") REFERENCES "researchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
