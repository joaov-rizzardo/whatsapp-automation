-- CreateTable
CREATE TABLE "automation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "trigger" JSONB NOT NULL DEFAULT '{"kind":"none"}',
    "blockCount" INTEGER NOT NULL DEFAULT 1,
    "publishedVersionNumber" INTEGER,
    "publishedDraftVersion" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_draft" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flow_draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_version" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "document" JSONB NOT NULL,
    "trigger" JSONB NOT NULL,
    "draftVersion" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flow_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_organizationId_idx" ON "automation"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "flow_draft_automationId_key" ON "flow_draft"("automationId");

-- CreateIndex
CREATE UNIQUE INDEX "flow_version_automationId_number_key" ON "flow_version"("automationId", "number");

-- AddForeignKey
ALTER TABLE "flow_draft" ADD CONSTRAINT "flow_draft_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_version" ADD CONSTRAINT "flow_version_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
