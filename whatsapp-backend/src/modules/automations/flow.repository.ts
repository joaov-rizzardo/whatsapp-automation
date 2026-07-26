import type { PrismaClient } from "../../generated/prisma/client.js";
import {
  automationSelect,
  toAutomationRecord,
  type AutomationRecord,
} from "./automations.repository.js";
import type { AutomationTrigger } from "./blocks/start/start.block.js";
import type { FlowDocument } from "./flow.schema.js";

export interface FlowDraftRecord {
  version: number;
  document: FlowDocument;
  updatedAt: Date;
}

export interface SaveDraftRecord {
  automationId: string;
  /** A versão que o cliente carregou. Não bater não escreve nada. */
  expectedVersion: number;
  document: FlowDocument;
  /** Derivados do documento pela service e gravados na mesma transação. */
  trigger: AutomationTrigger;
  blockCount: number;
}

export interface SavedDraft {
  version: number;
  updatedAt: Date;
  automation: AutomationRecord;
}

export interface PublishRecord {
  automationId: string;
  document: FlowDocument;
  trigger: AutomationTrigger;
  draftVersion: number;
}

export interface PublishedVersion {
  number: number;
  publishedAt: Date;
  automation: AutomationRecord;
}

export interface FlowRepository {
  findDraft(automationId: string): Promise<FlowDraftRecord | null>;
  /** `null` = a versão não bate; ninguém sobrescreveu nada. */
  saveDraft(input: SaveDraftRecord): Promise<SavedDraft | null>;
  publish(input: PublishRecord): Promise<PublishedVersion>;
}

export function createFlowRepository(prisma: PrismaClient): FlowRepository {
  return {
    async findDraft(automationId) {
      const row = await prisma.flowDraft.findUnique({
        where: { automationId },
        select: { version: true, document: true, updatedAt: true },
      });
      if (!row) return null;
      return {
        version: row.version,
        document: row.document as FlowDocument,
        updatedAt: row.updatedAt,
      };
    },

    async saveDraft({ automationId, expectedVersion, document, trigger, blockCount }) {
      return prisma.$transaction(async (tx) => {
        // A trava otimista é esta cláusula: a versão faz parte do WHERE, então
        // duas abas concorrentes não se sobrescrevem — a segunda não acha linha.
        const { count } = await tx.flowDraft.updateMany({
          where: { automationId, version: expectedVersion },
          data: { document, version: { increment: 1 } },
        });
        if (count === 0) return null;

        const draft = await tx.flowDraft.findUniqueOrThrow({
          where: { automationId },
          select: { version: true, updatedAt: true },
        });

        // Os derivados na mesma transação: a lista nunca vê um gatilho de uma
        // versão do documento que já mudou.
        const automation = await tx.automation.update({
          where: { id: automationId },
          data: { trigger, blockCount },
          select: automationSelect,
        });

        return {
          version: draft.version,
          updatedAt: draft.updatedAt,
          automation: toAutomationRecord(automation),
        };
      });
    },

    async publish({ automationId, document, trigger, draftVersion }) {
      return prisma.$transaction(async (tx) => {
        const last = await tx.flowVersion.findFirst({
          where: { automationId },
          orderBy: { number: "desc" },
          select: { number: true },
        });
        const number = (last?.number ?? 0) + 1;

        // INSERT, nunca UPDATE: uma versão publicada é imutável, e é isso que
        // vai deixar uma conversa em andamento terminar na versão em que
        // começou. @@unique([automationId, number]) é a rede de segurança.
        const version = await tx.flowVersion.create({
          data: { automationId, number, document, trigger, draftVersion },
          select: { number: true, publishedAt: true },
        });

        const automation = await tx.automation.update({
          where: { id: automationId },
          data: {
            publishedVersionNumber: version.number,
            publishedDraftVersion: draftVersion,
            publishedAt: version.publishedAt,
          },
          select: automationSelect,
        });

        return {
          number: version.number,
          publishedAt: version.publishedAt,
          automation: toAutomationRecord(automation),
        };
      });
    },
  };
}
