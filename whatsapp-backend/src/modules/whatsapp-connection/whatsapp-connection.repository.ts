import type { PrismaClient } from "../../generated/prisma/client.js";
import type {
  ConnectionMethod,
  ConnectionStatus,
} from "./whatsapp-connection.schema.js";

/** The domain shape returned by the repository — never a raw Prisma row. */
export interface WhatsappConnectionRecord {
  organizationId: string;
  instanceName: string;
  status: ConnectionStatus;
  method: ConnectionMethod;
  qrCode: string | null;
  pairingCode: string | null;
  phoneNumber: string | null;
}

/**
 * Full-row upsert keyed by `organizationId` (unique). The service always reads
 * the current row first and passes the complete next state, so partial updates
 * live in the service, not here.
 */
export interface UpsertConnectionInput {
  organizationId: string;
  instanceName: string;
  status: ConnectionStatus;
  method: ConnectionMethod;
  qrCode: string | null;
  pairingCode: string | null;
  phoneNumber: string | null;
}

export interface WhatsappConnectionRepository {
  findByOrganizationId(
    organizationId: string,
  ): Promise<WhatsappConnectionRecord | null>;
  findByInstanceName(
    instanceName: string,
  ): Promise<WhatsappConnectionRecord | null>;
  upsert(input: UpsertConnectionInput): Promise<WhatsappConnectionRecord>;
  delete(organizationId: string): Promise<void>;
}

const SELECT = {
  organizationId: true,
  instanceName: true,
  status: true,
  method: true,
  qrCode: true,
  pairingCode: true,
  phoneNumber: true,
} as const;

/** Narrows the strings Prisma returns back onto our unions. */
function toRecord(row: {
  organizationId: string;
  instanceName: string;
  status: string;
  method: string;
  qrCode: string | null;
  pairingCode: string | null;
  phoneNumber: string | null;
}): WhatsappConnectionRecord {
  return {
    ...row,
    status: row.status as ConnectionStatus,
    method: row.method as ConnectionMethod,
  };
}

export function createWhatsappConnectionRepository(
  prisma: PrismaClient,
): WhatsappConnectionRepository {
  return {
    async findByOrganizationId(organizationId) {
      const row = await prisma.whatsappConnection.findUnique({
        where: { organizationId },
        select: SELECT,
      });
      return row ? toRecord(row) : null;
    },

    async findByInstanceName(instanceName) {
      const row = await prisma.whatsappConnection.findUnique({
        where: { instanceName },
        select: SELECT,
      });
      return row ? toRecord(row) : null;
    },

    async upsert(input) {
      const { organizationId, ...rest } = input;
      const row = await prisma.whatsappConnection.upsert({
        where: { organizationId },
        create: { organizationId, ...rest },
        update: rest,
        select: SELECT,
      });
      return toRecord(row);
    },

    async delete(organizationId) {
      await prisma.whatsappConnection.delete({ where: { organizationId } });
    },
  };
}
