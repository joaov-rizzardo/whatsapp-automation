import type { PrismaClient } from "../../generated/prisma/client.js";
import type { AutomationTrigger } from "./blocks/start/start.block.js";
import type { FlowDocument } from "./flow.schema.js";

/**
 * A automação como o resto do módulo a enxerga — nunca uma linha crua do
 * Prisma. `draftVersion` vem junto porque é metade da resposta "há alterações
 * não publicadas?", e buscá-lo depois seria uma consulta por automação da lista.
 */
export interface AutomationRecord {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  blockCount: number;
  publishedVersionNumber: number | null;
  publishedDraftVersion: number | null;
  publishedAt: Date | null;
  updatedAt: Date;
  draftVersion: number;
}

export interface CreateAutomationRecord {
  organizationId: string;
  name: string;
  /** A automação nunca existe sem rascunho: os dois nascem na mesma transação. */
  document: FlowDocument;
  trigger: AutomationTrigger;
  blockCount: number;
}

export interface UpdateAutomationRecord {
  name?: string;
  isActive?: boolean;
}

export interface AutomationsRepository {
  findMany(organizationId: string): Promise<AutomationRecord[]>;
  /**
   * Sempre com a organização. Não existe um `findById(id)` neste módulo de
   * propósito: buscar um recurso aninhado sem o filtro é o bug de segurança
   * clássico desta feature.
   */
  findById(id: string, organizationId: string): Promise<AutomationRecord | null>;
  create(input: CreateAutomationRecord): Promise<AutomationRecord>;
  update(
    id: string,
    organizationId: string,
    input: UpdateAutomationRecord,
  ): Promise<AutomationRecord | null>;
  delete(id: string, organizationId: string): Promise<boolean>;
}

/** Compartilhado com o flow.repository: os dois devolvem AutomationRecord. */
export const automationSelect = {
  id: true,
  organizationId: true,
  name: true,
  isActive: true,
  trigger: true,
  blockCount: true,
  publishedVersionNumber: true,
  publishedDraftVersion: true,
  publishedAt: true,
  updatedAt: true,
  draft: { select: { version: true } },
} as const;

export type AutomationRow = {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  trigger: unknown;
  blockCount: number;
  publishedVersionNumber: number | null;
  publishedDraftVersion: number | null;
  publishedAt: Date | null;
  updatedAt: Date;
  draft: { version: number } | null;
};

export function toAutomationRecord(row: AutomationRow): AutomationRecord {
  const { draft, trigger, ...rest } = row;
  return {
    ...rest,
    trigger: trigger as AutomationTrigger,
    // O rascunho nasce com a automação; `1` só cobriria uma linha órfã.
    draftVersion: draft?.version ?? 1,
  };
}

export function createAutomationsRepository(
  prisma: PrismaClient,
): AutomationsRepository {
  return {
    async findMany(organizationId) {
      const rows = await prisma.automation.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        select: automationSelect,
      });
      return rows.map(toAutomationRecord);
    },

    async findById(id, organizationId) {
      const row = await prisma.automation.findFirst({
        where: { id, organizationId },
        select: automationSelect,
      });
      return row ? toAutomationRecord(row) : null;
    },

    async create({ organizationId, name, document, trigger, blockCount }) {
      const row = await prisma.automation.create({
        data: {
          organizationId,
          name,
          trigger,
          blockCount,
          draft: { create: { document } },
        },
        select: automationSelect,
      });
      return toAutomationRecord(row);
    },

    async update(id, organizationId, input) {
      // updateMany, e não update: é o que permite filtrar por organização na
      // mesma escrita, em vez de confiar numa leitura feita antes.
      const { count } = await prisma.automation.updateMany({
        where: { id, organizationId },
        data: input,
      });
      if (count === 0) return null;

      const row = await prisma.automation.findFirst({
        where: { id, organizationId },
        select: automationSelect,
      });
      return row ? toAutomationRecord(row) : null;
    },

    async delete(id, organizationId) {
      const { count } = await prisma.automation.deleteMany({
        where: { id, organizationId },
      });
      return count > 0;
    },
  };
}
