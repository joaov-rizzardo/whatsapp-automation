import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { NotFoundError, NotPublishedError } from "../../shared/errors.js";
import {
  createAutomationsRepository,
  type AutomationRecord,
  type AutomationsRepository,
} from "./automations.repository.js";
import { AutomationsService } from "./automations.service.js";
import type { FlowDocument } from "./flow.schema.js";
import { createFlowRepository, type FlowRepository } from "./flow.repository.js";
import { createInitialDocument } from "./flow.service.js";

// --- Test doubles ------------------------------------------------------------

const ORG = "org-1";
const OTHER_ORG = "org-2";

type Draft = { version: number; document: FlowDocument; updatedAt: Date };

function baseRecord(overrides: Partial<AutomationRecord> = {}): AutomationRecord {
  return {
    id: "aut-1",
    organizationId: ORG,
    name: "Boas-vindas",
    isActive: false,
    trigger: { kind: "none" },
    blockCount: 1,
    publishedVersionNumber: null,
    publishedDraftVersion: null,
    publishedAt: null,
    updatedAt: new Date("2026-07-26T12:00:00.000Z"),
    draftVersion: 1,
    ...overrides,
  };
}

function createFakes(seed: AutomationRecord[] = [baseRecord()]) {
  const automations = new Map(seed.map((record) => [record.id, record]));
  const drafts = new Map<string, Draft>(
    seed.map((record) => [
      record.id,
      { version: record.draftVersion, document: createInitialDocument(), updatedAt: new Date() },
    ]),
  );
  let sequence = seed.length;

  const automationsRepository: AutomationsRepository = {
    async findMany(organizationId) {
      return [...automations.values()].filter((a) => a.organizationId === organizationId);
    },
    async findById(id, organizationId) {
      const found = automations.get(id);
      return found && found.organizationId === organizationId ? found : null;
    },
    async create({ organizationId, name, document, trigger, blockCount }) {
      sequence += 1;
      const created = baseRecord({
        id: `aut-${sequence}`,
        organizationId,
        name,
        trigger,
        blockCount,
      });
      automations.set(created.id, created);
      drafts.set(created.id, { version: 1, document, updatedAt: new Date() });
      return created;
    },
    async update(id, organizationId, input) {
      const found = automations.get(id);
      if (!found || found.organizationId !== organizationId) return null;
      const next = { ...found, ...input };
      automations.set(id, next);
      return next;
    },
    async delete(id, organizationId) {
      const found = automations.get(id);
      if (!found || found.organizationId !== organizationId) return false;
      automations.delete(id);
      drafts.delete(id);
      return true;
    },
  };

  const flowRepository: FlowRepository = {
    async findDraft(automationId) {
      return drafts.get(automationId) ?? null;
    },
    async saveDraft() {
      throw new Error("não usado por AutomationsService");
    },
    async publish() {
      throw new Error("não usado por AutomationsService");
    },
  };

  return {
    automations,
    drafts,
    service: new AutomationsService(automationsRepository, flowRepository),
  };
}

// --- create ------------------------------------------------------------------

describe("AutomationsService.create", () => {
  it("nasce rascunho, com um bloco e sem gatilho", async () => {
    const { service } = createFakes([]);

    const created = await service.create(ORG, { name: "Nova" });

    expect(created).toMatchObject({
      name: "Nova",
      status: "draft",
      blockCount: 1,
      trigger: { kind: "none" },
      hasUnpublishedChanges: false,
    });
  });

  it("cria o rascunho junto, com o nó de início dentro", async () => {
    const { service, drafts } = createFakes([]);

    const created = await service.create(ORG, { name: "Nova" });

    const draft = drafts.get(created.id);
    expect(draft?.version).toBe(1);
    expect(draft?.document.nodes[0].type).toBe("start");
  });
});

// --- ativar / pausar ---------------------------------------------------------

describe("AutomationsService.update", () => {
  it("recusa ativar uma automação sem versão publicada", async () => {
    const { service } = createFakes();

    await expect(service.update("aut-1", ORG, { isActive: true })).rejects.toBeInstanceOf(
      NotPublishedError,
    );
  });

  it("ativa quando há versão publicada", async () => {
    const { service } = createFakes([
      baseRecord({ publishedVersionNumber: 1, publishedDraftVersion: 1 }),
    ]);

    const updated = await service.update("aut-1", ORG, { isActive: true });

    expect(updated.status).toBe("active");
  });

  it("desativar é sempre permitido", async () => {
    const { service } = createFakes([
      baseRecord({ isActive: true, publishedVersionNumber: 1, publishedDraftVersion: 1 }),
    ]);

    const updated = await service.update("aut-1", ORG, { isActive: false });

    expect(updated.status).toBe("paused");
  });

  it("renomeia", async () => {
    const { service } = createFakes();

    const updated = await service.update("aut-1", ORG, { name: "Outro nome" });

    expect(updated.name).toBe("Outro nome");
  });

  it("404 para a automação de outra organização", async () => {
    const { service } = createFakes();

    await expect(
      service.update("aut-1", OTHER_ORG, { name: "Invadida" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// --- duplicar ----------------------------------------------------------------

describe("AutomationsService.duplicate", () => {
  it("copia o rascunho e os derivados, mas nasce rascunho e inativa", async () => {
    const { service, drafts } = createFakes([
      baseRecord({
        name: "Boas-vindas",
        isActive: true,
        trigger: { kind: "keyword", keywords: ["oi"] },
        blockCount: 4,
        publishedVersionNumber: 3,
        publishedDraftVersion: 7,
        publishedAt: new Date(),
        draftVersion: 7,
      }),
    ]);

    // Os derivados da cópia saem do documento copiado, não das colunas da
    // original — é o que garante que gatilho e contagem não mintam.
    const source = drafts.get("aut-1");
    if (!source) throw new Error("rascunho de origem ausente no teste");
    source.version = 7;
    source.document = {
      ...source.document,
      nodes: [
        {
          id: "start-a1",
          type: "start",
          position: { x: 0, y: 0 },
          data: { trigger: { kind: "keyword", keywords: ["oi"] } },
        },
        ...[1, 2, 3].map((index) => ({
          id: `text-${index}`,
          type: "text",
          position: { x: index * 300, y: 0 },
          data: { text: `Mensagem ${index}`, typingSeconds: 0 },
        })),
      ],
    };

    const copy = await service.duplicate("aut-1", ORG);

    expect(copy).toMatchObject({
      name: "Boas-vindas (cópia)",
      status: "draft",
      trigger: { kind: "keyword", keywords: ["oi"] },
      blockCount: 4,
      hasUnpublishedChanges: false,
    });
    expect(copy.id).not.toBe("aut-1");
    expect(drafts.get(copy.id)?.document).toEqual(drafts.get("aut-1")?.document);
    expect(drafts.get(copy.id)?.version).toBe(1);
  });

  it("404 para a automação de outra organização", async () => {
    const { service } = createFakes();

    await expect(service.duplicate("aut-1", OTHER_ORG)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

// --- listar, buscar e remover ------------------------------------------------

describe("AutomationsService.list", () => {
  it("só devolve as da organização, já derivadas", async () => {
    const { service } = createFakes([
      baseRecord({ id: "aut-1" }),
      baseRecord({
        id: "aut-2",
        organizationId: OTHER_ORG,
        name: "De outra org",
      }),
      baseRecord({
        id: "aut-3",
        isActive: true,
        publishedVersionNumber: 2,
        publishedDraftVersion: 4,
        draftVersion: 5,
      }),
    ]);

    const list = await service.list(ORG);

    expect(list.map((item) => item.id)).toEqual(["aut-1", "aut-3"]);
    expect(list[0].status).toBe("draft");
    expect(list[1]).toMatchObject({ status: "active", hasUnpublishedChanges: true });
  });
});

describe("AutomationsService.remove", () => {
  it("apaga a automação da organização", async () => {
    const { service, automations } = createFakes();

    await service.remove("aut-1", ORG);

    expect(automations.has("aut-1")).toBe(false);
  });

  it("404 para a automação de outra organização", async () => {
    const { service, automations } = createFakes();

    await expect(service.remove("aut-1", OTHER_ORG)).rejects.toBeInstanceOf(NotFoundError);
    expect(automations.has("aut-1")).toBe(true);
  });
});

// --- Repository (PostgreSQL real) --------------------------------------------

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function orgId(): string {
  return `org-${crypto.randomUUID()}`;
}

describe("AutomationsRepository", () => {
  it("não acha a automação de outra organização", async () => {
    const repository = createAutomationsRepository(app.prisma);
    const organizationId = orgId();
    const document = createInitialDocument();

    const created = await repository.create({
      organizationId,
      name: "Isolada",
      document,
      trigger: { kind: "none" },
      blockCount: 1,
    });

    try {
      expect(await repository.findById(created.id, organizationId)).not.toBeNull();
      expect(await repository.findById(created.id, orgId())).toBeNull();
      expect(await repository.findMany(orgId())).toEqual([]);
    } finally {
      await repository.delete(created.id, organizationId);
    }
  });

  it("cria a automação e o rascunho juntos, na versão 1", async () => {
    const repository = createAutomationsRepository(app.prisma);
    const flows = createFlowRepository(app.prisma);
    const organizationId = orgId();

    const created = await repository.create({
      organizationId,
      name: "Com rascunho",
      document: createInitialDocument(),
      trigger: { kind: "none" },
      blockCount: 1,
    });

    try {
      const draft = await flows.findDraft(created.id);
      expect(draft?.version).toBe(1);
      expect(draft?.document.nodes[0].type).toBe("start");
      expect(created.draftVersion).toBe(1);
    } finally {
      await repository.delete(created.id, organizationId);
    }
  });

  it("recusa apagar por id de outra organização", async () => {
    const repository = createAutomationsRepository(app.prisma);
    const organizationId = orgId();

    const created = await repository.create({
      organizationId,
      name: "Não apague",
      document: createInitialDocument(),
      trigger: { kind: "none" },
      blockCount: 1,
    });

    try {
      expect(await repository.delete(created.id, orgId())).toBe(false);
      expect(await repository.findById(created.id, organizationId)).not.toBeNull();
    } finally {
      await repository.delete(created.id, organizationId);
    }
  });

  it("apagar a automação leva rascunho e versões (cascade)", async () => {
    const repository = createAutomationsRepository(app.prisma);
    const flows = createFlowRepository(app.prisma);
    const organizationId = orgId();

    const created = await repository.create({
      organizationId,
      name: "Some tudo",
      document: createInitialDocument(),
      trigger: { kind: "none" },
      blockCount: 1,
    });
    await flows.publish({
      automationId: created.id,
      document: createInitialDocument(),
      trigger: { kind: "anyMessage" },
      draftVersion: 1,
    });

    await repository.delete(created.id, organizationId);

    expect(await app.prisma.flowDraft.count({ where: { automationId: created.id } })).toBe(0);
    expect(await app.prisma.flowVersion.count({ where: { automationId: created.id } })).toBe(0);
  });
});
