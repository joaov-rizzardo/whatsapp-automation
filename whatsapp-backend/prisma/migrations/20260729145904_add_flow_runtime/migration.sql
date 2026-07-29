-- CreateTable
CREATE TABLE "whatsapp_contact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "pushName" TEXT,
    "activeExecutionId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_execution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "flowVersionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentNodeId" TEXT,
    "waitToken" INTEGER NOT NULL DEFAULT 0,
    "stepCount" INTEGER NOT NULL DEFAULT 0,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "flow_execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_message" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT,
    "externalId" TEXT,
    "nodeId" TEXT,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contact_activeExecutionId_key" ON "whatsapp_contact"("activeExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contact_organizationId_jid_key" ON "whatsapp_contact"("organizationId", "jid");

-- CreateIndex
CREATE INDEX "flow_execution_organizationId_status_idx" ON "flow_execution"("organizationId", "status");

-- CreateIndex
CREATE INDEX "flow_execution_contactId_idx" ON "flow_execution"("contactId");

-- CreateIndex
CREATE INDEX "flow_execution_status_expiresAt_idx" ON "flow_execution"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "execution_message_executionId_createdAt_idx" ON "execution_message"("executionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "execution_message_executionId_externalId_key" ON "execution_message"("executionId", "externalId");

-- AddForeignKey
ALTER TABLE "flow_execution" ADD CONSTRAINT "flow_execution_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "whatsapp_contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_message" ADD CONSTRAINT "execution_message_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "flow_execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
