-- CreateTable
CREATE TABLE "whatsapp_connection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'connecting',
    "method" TEXT NOT NULL DEFAULT 'qrcode',
    "qrCode" TEXT,
    "pairingCode" TEXT,
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connection_organizationId_key" ON "whatsapp_connection"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connection_instanceName_key" ON "whatsapp_connection"("instanceName");
