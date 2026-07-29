import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";

import {
  FlowInvalidError,
  NotFoundError,
  UnknownBlockTypeError,
  ValidationError,
  VersionConflictError,
} from "../../shared/errors.js";
import {
  createAutomationsRepository,
  type AutomationRecord,
  type AutomationsRepository,
} from "./automations.repository.js";
import type { AutomationTrigger } from "./blocks/start/start.block.js";
import {
  createFlowRepository,
  type FlowRepository,
  type PublishRecord,
  type PublishedVersion,
} from "./flow.repository.js";
import type { FlowDocument, FlowEdgeDocument, FlowNodeDocument } from "./flow.schema.js";
import {
  BLOCK_NOT_EXECUTABLE_MESSAGE,
  countBlocks,
  createInitialDocument,
  deriveTrigger,
  FlowService,
} from "./flow.service.js";

// --- Test doubles ------------------------------------------------------------

const ORG = "org-1";
const OTHER_ORG = "org-2";
const AUTOMATION_ID = "aut-1";

type Draft = { version: number; document: FlowDocument; updatedAt: Date };

/**
 * Os dois repositories juntos, porque a automação e o fluxo são um agregado só:
 * salvar o rascunho também move os derivados da automação, e é isso que os
 * testes de derivação precisam enxergar.
 */
function createFakeRepositories(automation?: Partial<AutomationRecord>) {
  const record: AutomationRecord = {
    id: AUTOMATION_ID,
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
    ...automation,
  };

  const automations = new Map<string, AutomationRecord>([[record.id, record]]);
  const drafts = new Map<string, Draft>([
    [
      record.id,
      {
        version: record.draftVersion,
        document: createInitialDocument(),
        updatedAt: new Date("2026-07-26T12:00:00.000Z"),
      },
    ],
  ]);
  const published: PublishRecord[] = [];

  const automationsRepository: AutomationsRepository = {
    async findMany(organizationId) {
      return [...automations.values()].filter((a) => a.organizationId === organizationId);
    },
    async findById(id, organizationId) {
      const found = automations.get(id);
      return found && found.organizationId === organizationId ? found : null;
    },
    async create({ organizationId, name, document, trigger, blockCount }) {
      const created: AutomationRecord = {
        ...record,
        id: `aut-${automations.size + 1}`,
        organizationId,
        name,
        trigger,
        blockCount,
        isActive: false,
        publishedVersionNumber: null,
        publishedDraftVersion: null,
        publishedAt: null,
        draftVersion: 1,
      };
      automations.set(created.id, created);
      drafts.set(created.id, { version: 1, document, updatedAt: new Date() });
      return created;
    },
    async update(id, organizationId, input) {
      const found = automations.get(id);
      if (!found || found.organizationId !== organizationId) return null;
      const next = { ...found, ...input, updatedAt: new Date() };
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
    // Consultas do motor (spec 008): exercitadas em flow-runtime, contra o
    // Postgres real. A FlowService não as chama.
    async findTriggerCandidates() {
      throw new Error("não usado por FlowService");
    },
    async findVersionDocument() {
      throw new Error("não usado por FlowService");
    },
    async saveDraft({ automationId, expectedVersion, document, trigger, blockCount }) {
      const draft = drafts.get(automationId);
      const found = automations.get(automationId);
      if (!draft || !found) return null;
      if (draft.version !== expectedVersion) return null;

      const next: Draft = {
        version: draft.version + 1,
        document,
        updatedAt: new Date(),
      };
      drafts.set(automationId, next);

      const updated: AutomationRecord = {
        ...found,
        trigger,
        blockCount,
        draftVersion: next.version,
        updatedAt: next.updatedAt,
      };
      automations.set(automationId, updated);

      return { version: next.version, updatedAt: next.updatedAt, automation: updated };
    },
    async publish(input): Promise<PublishedVersion> {
      published.push(input);
      const found = automations.get(input.automationId);
      if (!found) throw new Error("automação inexistente no teste");
      const number = published.length;
      const publishedAt = new Date();
      const updated: AutomationRecord = {
        ...found,
        publishedVersionNumber: number,
        publishedDraftVersion: input.draftVersion,
        publishedAt,
      };
      automations.set(input.automationId, updated);
      return { number, publishedAt, automation: updated };
    },
  };

  return { automations, drafts, published, automationsRepository, flowRepository };
}

function createService(automation?: Partial<AutomationRecord>) {
  const fakes = createFakeRepositories(automation);
  return {
    ...fakes,
    service: new FlowService(fakes.automationsRepository, fakes.flowRepository),
  };
}

// --- Document builders -------------------------------------------------------

function startNode(
  trigger: AutomationTrigger = { kind: "none" },
  id = "start-a1",
): FlowNodeDocument {
  return { id, type: "start", position: { x: 0, y: 0 }, data: { trigger } };
}

function textNode(id = "text-b2", text = "Olá!"): FlowNodeDocument {
  return {
    id,
    type: "text",
    position: { x: 320, y: 0 },
    data: { text, typingSeconds: 0 },
  };
}

function waitReplyNode(
  data: Record<string, unknown> = {},
  id = "wait-reply-e5",
): FlowNodeDocument {
  return {
    id,
    type: "waitReply",
    position: { x: 320, y: 400 },
    data: { variableId: null, timeout: { value: 5, unit: "minutes" }, ...data },
  };
}

type ComparisonInput = {
  variableId: string;
  operator: string;
  right: unknown;
};

function conditionNode(
  comparisons: ComparisonInput[],
  id = "condition-d4",
): FlowNodeDocument {
  return {
    id,
    type: "condition",
    position: { x: 320, y: 200 },
    data: {
      logic: "and",
      comparisons: comparisons.map((comparison, index) => ({
        id: `cmp-${index}`,
        ...comparison,
      })),
    },
  };
}

function randomizerNode(id = "randomizer-c3"): FlowNodeDocument {
  return {
    id,
    type: "randomizer",
    position: { x: 640, y: 0 },
    data: {
      branches: [
        { id: "branch-a", label: "Saída A", percentage: 50 },
        { id: "branch-b", label: "Saída B", percentage: 50 },
      ],
    },
  };
}

function edge(
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle = "in",
  id = `e-${source}-${sourceHandle}`,
): FlowEdgeDocument {
  return { id, source, sourceHandle, target, targetHandle };
}

function document(partial: Partial<FlowDocument> = {}): FlowDocument {
  return {
    schemaVersion: 1,
    nodes: [startNode()],
    edges: [],
    variables: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    ...partial,
  };
}

// --- createInitialDocument ---------------------------------------------------

describe("createInitialDocument", () => {
  it("nasce com o nó de início, sem gatilho e sem mais nada", () => {
    const initial = createInitialDocument();

    expect(initial.schemaVersion).toBe(1);
    expect(initial.nodes).toHaveLength(1);
    expect(initial.nodes[0].type).toBe("start");
    expect(initial.nodes[0].data).toEqual({ trigger: { kind: "none" } });
    expect(initial.edges).toEqual([]);
    expect(initial.variables).toEqual([]);
  });

  it("gera um id de nó diferente a cada automação", () => {
    expect(createInitialDocument().nodes[0].id).not.toBe(
      createInitialDocument().nodes[0].id,
    );
  });
});

describe("deriveTrigger e countBlocks", () => {
  it("tiram o gatilho do nó de início e o total de nós", () => {
    const doc = document({
      nodes: [
        startNode({ kind: "keyword", keywords: ["oi", "olá"] }),
        textNode(),
      ],
    });

    expect(deriveTrigger(doc)).toEqual({ kind: "keyword", keywords: ["oi", "olá"] });
    expect(countBlocks(doc)).toBe(2);
  });
});

// --- saveDraft: o que a validação estrutural recusa --------------------------

describe("FlowService.saveDraft recusa lixo estrutural", () => {
  async function save(doc: FlowDocument) {
    const { service } = createService();
    return service.saveDraft(AUTOMATION_ID, ORG, { version: 1, document: doc });
  }

  it("tipo de bloco desconhecido", async () => {
    const doc = document({
      nodes: [
        startNode(),
        { id: "x-1", type: "carrossel", position: { x: 0, y: 0 }, data: {} },
      ],
    });

    await expect(save(doc)).rejects.toBeInstanceOf(UnknownBlockTypeError);
  });

  it("id de nó repetido", async () => {
    const doc = document({
      nodes: [startNode(), textNode("dup"), textNode("dup")],
    });

    await expect(save(doc)).rejects.toBeInstanceOf(ValidationError);
  });

  it("aresta apontando para um nó que não existe", async () => {
    const doc = document({
      nodes: [startNode(), textNode()],
      edges: [edge("start-a1", "out", "fantasma")],
    });

    await expect(save(doc)).rejects.toBeInstanceOf(ValidationError);
  });

  it("sourceHandle que o tipo não declara", async () => {
    const doc = document({
      nodes: [startNode(), textNode()],
      edges: [edge("start-a1", "saida-inventada", "text-b2")],
    });

    await expect(save(doc)).rejects.toBeInstanceOf(ValidationError);
  });

  it("data fora do schema do tipo", async () => {
    const doc = document({
      nodes: [
        startNode(),
        {
          id: "text-b2",
          type: "text",
          position: { x: 0, y: 0 },
          data: { text: "oi", typingSeconds: "muito" },
        },
      ],
    });

    await expect(save(doc)).rejects.toBeInstanceOf(ValidationError);
  });

  it("agrupamento de mensagens acima do teto", async () => {
    const doc = document({
      nodes: [startNode(), waitReplyNode({ groupingSeconds: 120 })],
    });

    await expect(save(doc)).rejects.toBeInstanceOf(ValidationError);
  });

  it("agrupamento de mensagens negativo", async () => {
    const doc = document({
      nodes: [startNode(), waitReplyNode({ groupingSeconds: -1 })],
    });

    await expect(save(doc)).rejects.toBeInstanceOf(ValidationError);
  });

  it("schemaVersion maior do que o backend conhece", async () => {
    await expect(save(document({ schemaVersion: 2 }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("zero nós de início", async () => {
    await expect(save(document({ nodes: [textNode()] }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("dois nós de início", async () => {
    const doc = document({ nodes: [startNode(), startNode({ kind: "none" }, "start-b2")] });

    await expect(save(doc)).rejects.toBeInstanceOf(ValidationError);
  });

  it("nomes de variável repetidos", async () => {
    const doc = document({
      variables: [
        { id: "var-1", name: "nome", type: "text", initialValue: "" },
        { id: "var-2", name: "nome", type: "text", initialValue: "" },
      ],
    });

    await expect(save(doc)).rejects.toBeInstanceOf(ValidationError);
  });

  it("ids de variável repetidos", async () => {
    const doc = document({
      variables: [
        { id: "var-1", name: "nome", type: "text", initialValue: "" },
        { id: "var-1", name: "idade", type: "number", initialValue: "0" },
      ],
    });

    await expect(save(doc)).rejects.toBeInstanceOf(ValidationError);
  });
});

// --- saveDraft: o que ele aceita, e é o que o autosave depende ---------------

describe("FlowService.saveDraft aceita um rascunho incompleto", () => {
  it("mensagem vazia, gatilho none e randomizador fora de 100%", async () => {
    const { service } = createService();
    const doc = document({
      nodes: [
        startNode({ kind: "none" }),
        textNode("text-b2", ""),
        {
          id: "randomizer-c3",
          type: "randomizer",
          position: { x: 0, y: 0 },
          data: {
            branches: [
              { id: "branch-a", label: "A", percentage: 40 },
              { id: "branch-b", label: "B", percentage: 40 },
            ],
          },
        },
      ],
    });

    const saved = await service.saveDraft(AUTOMATION_ID, ORG, {
      version: 1,
      document: doc,
    });

    expect(saved.version).toBe(2);
  });

  it("um bloco solto, sem nenhuma conexão", async () => {
    const { service } = createService();
    const doc = document({ nodes: [startNode(), textNode()] });

    await expect(
      service.saveDraft(AUTOMATION_ID, ORG, { version: 1, document: doc }),
    ).resolves.toMatchObject({ version: 2 });
  });

  it("um aguardar resposta com o agrupamento de mensagens configurado", async () => {
    const { service } = createService();
    const doc = document({
      nodes: [startNode(), waitReplyNode({ groupingSeconds: 5 })],
    });

    await expect(
      service.saveDraft(AUTOMATION_ID, ORG, { version: 1, document: doc }),
    ).resolves.toMatchObject({ version: 2 });
  });

  // O campo nasceu depois dos primeiros fluxos: um rascunho gravado sem ele
  // precisa continuar salvando, senão o editor quebra ao abrir um fluxo antigo.
  it("um aguardar resposta gravado antes do agrupamento existir", async () => {
    const { service } = createService();
    const doc = document({ nodes: [startNode(), waitReplyNode()] });

    await expect(
      service.saveDraft(AUTOMATION_ID, ORG, { version: 1, document: doc }),
    ).resolves.toMatchObject({ version: 2 });
  });

  it("as saídas configuradas de um randomizador", async () => {
    const { service } = createService();
    const doc = document({
      nodes: [startNode(), randomizerNode(), textNode()],
      edges: [
        edge("start-a1", "out", "randomizer-c3"),
        edge("randomizer-c3", "branch-a", "text-b2"),
      ],
    });

    await expect(
      service.saveDraft(AUTOMATION_ID, ORG, { version: 1, document: doc }),
    ).resolves.toMatchObject({ version: 2 });
  });
});

// --- saveDraft: derivação, trava de versão e organização ---------------------

describe("FlowService.saveDraft", () => {
  it("deriva trigger e blockCount para a automação", async () => {
    const { service, automations } = createService();
    const doc = document({
      nodes: [startNode({ kind: "keyword", keywords: ["oi"] }), textNode()],
    });

    const saved = await service.saveDraft(AUTOMATION_ID, ORG, {
      version: 1,
      document: doc,
    });

    expect(saved.automation.trigger).toEqual({ kind: "keyword", keywords: ["oi"] });
    expect(saved.automation.blockCount).toBe(2);
    expect(automations.get(AUTOMATION_ID)?.trigger).toEqual({
      kind: "keyword",
      keywords: ["oi"],
    });
  });

  it("sobe a versão a cada salvamento aceito", async () => {
    const { service } = createService();

    const first = await service.saveDraft(AUTOMATION_ID, ORG, {
      version: 1,
      document: document(),
    });
    expect(first.version).toBe(2);

    const second = await service.saveDraft(AUTOMATION_ID, ORG, {
      version: first.version,
      document: document({ nodes: [startNode(), textNode()] }),
    });
    expect(second.version).toBe(3);
  });

  it("recusa uma versão velha com VersionConflictError, sem escrever nada", async () => {
    const { service, drafts } = createService();
    await service.saveDraft(AUTOMATION_ID, ORG, { version: 1, document: document() });

    await expect(
      service.saveDraft(AUTOMATION_ID, ORG, {
        version: 1,
        document: document({ nodes: [startNode(), textNode()] }),
      }),
    ).rejects.toBeInstanceOf(VersionConflictError);

    expect(drafts.get(AUTOMATION_ID)?.document.nodes).toHaveLength(1);
  });

  it("não enxerga a automação de outra organização", async () => {
    const { service } = createService();

    await expect(
      service.saveDraft(AUTOMATION_ID, OTHER_ORG, { version: 1, document: document() }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("FlowService.getFlow", () => {
  it("devolve documento, versão e a automação", async () => {
    const { service } = createService();

    const flow = await service.getFlow(AUTOMATION_ID, ORG);

    expect(flow.version).toBe(1);
    expect(flow.document.nodes[0].type).toBe("start");
    expect(flow.automation.name).toBe("Boas-vindas");
  });

  it("404 para a automação de outra organização", async () => {
    const { service } = createService();

    await expect(service.getFlow(AUTOMATION_ID, OTHER_ORG)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

// --- publish -----------------------------------------------------------------

describe("FlowService.publish", () => {
  async function saveAndPublish(doc: FlowDocument, automation?: Partial<AutomationRecord>) {
    const context = createService(automation);
    await context.service.saveDraft(AUTOMATION_ID, ORG, { version: 1, document: doc });
    return context;
  }

  it("recusa um fluxo sem gatilho, com o nó no problema", async () => {
    const context = await saveAndPublish(
      document({ nodes: [startNode(), textNode()] }),
    );

    const error = await context.service
      .publish(AUTOMATION_ID, ORG)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(FlowInvalidError);
    expect((error as FlowInvalidError).issues).toEqual([
      { nodeId: "start-a1", message: "Defina o gatilho do fluxo" },
    ]);
  });

  it("junta os problemas de vários blocos numa lista só", async () => {
    const context = await saveAndPublish(
      document({
        nodes: [
          startNode({ kind: "keyword", keywords: ["oi"] }),
          textNode("text-b2", "   "),
          {
            id: "randomizer-c3",
            type: "randomizer",
            position: { x: 0, y: 0 },
            data: {
              branches: [
                { id: "branch-a", label: "A", percentage: 40 },
                { id: "branch-b", label: "B", percentage: 40 },
              ],
            },
          },
        ],
      }),
    );

    const error = await context.service
      .publish(AUTOMATION_ID, ORG)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(FlowInvalidError);
    expect((error as FlowInvalidError).issues).toEqual([
      { nodeId: "text-b2", message: "Sem mensagem" },
      // O randomizador ainda não tem `execute` (spec 008 §4.10), e o problema
      // do próprio bloco continua aparecendo junto: quando o `execute` chegar,
      // o usuário não descobre um problema novo escondido atrás do primeiro.
      { nodeId: "randomizer-c3", message: BLOCK_NOT_EXECUTABLE_MESSAGE },
      { nodeId: "randomizer-c3", message: "As saídas somam 80%" },
    ]);
  });

  it("recusa publicar um bloco que o motor ainda não sabe rodar", async () => {
    const context = await saveAndPublish(
      document({
        nodes: [
          startNode({ kind: "anyMessage" }),
          conditionNode([
            {
              variableId: "sys:hora",
              operator: "between",
              right: { kind: "range", from: "08:00", to: "18:00" },
            },
          ]),
        ],
      }),
    );

    const error = await context.service
      .publish(AUTOMATION_ID, ORG)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(FlowInvalidError);
    expect((error as FlowInvalidError).issues).toEqual([
      { nodeId: "condition-d4", message: BLOCK_NOT_EXECUTABLE_MESSAGE },
    ]);
  });

  it("aceita {{variavel}} do sistema numa mensagem", async () => {
    const context = await saveAndPublish(
      document({
        nodes: [
          startNode({ kind: "anyMessage" }),
          textNode("text-b2", "Olá {{nome}}, hoje é {{dia_semana}}!"),
        ],
      }),
    );

    await expect(context.service.publish(AUTOMATION_ID, ORG)).resolves.toMatchObject({
      versionNumber: 1,
    });
  });

  it("recusa {{variavel}} que não existe", async () => {
    const context = await saveAndPublish(
      document({
        nodes: [
          startNode({ kind: "anyMessage" }),
          textNode("text-b2", "Olá {{nome_cliente}}!"),
        ],
      }),
    );

    const error = await context.service
      .publish(AUTOMATION_ID, ORG)
      .catch((caught: unknown) => caught);

    expect((error as FlowInvalidError).issues).toEqual([
      { nodeId: "text-b2", message: "A variável {{nome_cliente}} não existe" },
    ]);
  });

  it("não bloqueia por nó inalcançável a partir do início", async () => {
    const context = await saveAndPublish(
      document({
        nodes: [startNode({ kind: "anyMessage" }), textNode("text-b2", "solto")],
      }),
    );

    await expect(context.service.publish(AUTOMATION_ID, ORG)).resolves.toMatchObject({
      versionNumber: 1,
    });
  });

  it("cria a versão, copia o gatilho e guarda de qual rascunho saiu", async () => {
    const context = await saveAndPublish(
      document({ nodes: [startNode({ kind: "keyword", keywords: ["oi"] })] }),
    );

    const result = await context.service.publish(AUTOMATION_ID, ORG);

    expect(result.versionNumber).toBe(1);
    expect(context.published[0]).toMatchObject({
      trigger: { kind: "keyword", keywords: ["oi"] },
      draftVersion: 2,
    });
  });

  it("publicar não ativa a automação", async () => {
    const context = await saveAndPublish(
      document({ nodes: [startNode({ kind: "anyMessage" })] }),
    );

    const result = await context.service.publish(AUTOMATION_ID, ORG);

    // Publicada e inativa é "pausada" — ativar é o switch da lista, uma
    // decisão à parte.
    expect(result.automation.status).toBe("paused");
  });

  it("404 para a automação de outra organização", async () => {
    const { service } = createService();

    await expect(service.publish(AUTOMATION_ID, OTHER_ORG)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

// --- Condições sobre variáveis de sistema ------------------------------------

/**
 * Os tipos especiais (hora, data, mês, dia da semana) só existem em variáveis
 * do sistema, e são a razão de o lado direito de uma comparação ter forma
 * variável: faixa para hora e data, conjunto para mês e dia da semana.
 *
 * A publicação é onde o formato do valor é cobrado — o rascunho salva uma faixa
 * pela metade, porque é isso que o editor grava enquanto o usuário escolhe.
 */
describe("FlowService.publish, condições sobre variáveis do sistema", () => {
  async function publishWith(comparisons: ComparisonInput[]) {
    const { service } = createService();
    await service.saveDraft(AUTOMATION_ID, ORG, {
      version: 1,
      document: document({
        nodes: [startNode({ kind: "anyMessage" }), conditionNode(comparisons)],
      }),
    });
    return service.publish(AUTOMATION_ID, ORG).catch((caught: unknown) => caught);
  }

  /**
   * Só os problemas que a validação da CONDIÇÃO produz.
   *
   * Desde a spec 008 um fluxo com `comparação` também não publica por o bloco
   * ainda não ter `execute` — problema de outra regra, testada em "recusa
   * publicar um bloco que o motor ainda não sabe rodar". Filtrar aqui é o que
   * mantém estes testes falando sobre o que eles falam: operadores, faixas,
   * conjuntos e formatos dos tipos especiais. Quando `comparação` ganhar o seu
   * `execute`, o filtro simplesmente para de tirar alguma coisa.
   */
  async function issuesOf(comparisons: ComparisonInput[]) {
    const result = await publishWith(comparisons);
    expect(result).toBeInstanceOf(FlowInvalidError);
    return (result as FlowInvalidError).issues.filter(
      (issue) => issue.message !== BLOCK_NOT_EXECUTABLE_MESSAGE,
    );
  }

  /** O equivalente de "publicaria" enquanto o bloco não é executável. */
  async function expectNoConditionIssue(comparisons: ComparisonInput[]) {
    expect(await issuesOf(comparisons)).toEqual([]);
  }

  it("aceita uma faixa de horas", async () => {
    await expectNoConditionIssue([
        {
          variableId: "sys:hora",
          operator: "between",
          right: { kind: "range", from: "08:00", to: "18:00" },
        },
      ]);
  });

  it("aceita a faixa que atravessa a meia-noite", async () => {
    await expectNoConditionIssue([
        {
          variableId: "sys:hora",
          operator: "between",
          right: { kind: "range", from: "22:00", to: "06:00" },
        },
      ]);
  });

  it("aceita um conjunto de dias da semana", async () => {
    await expectNoConditionIssue([
        {
          variableId: "sys:dia_semana",
          operator: "in",
          right: { kind: "set", values: ["1", "2", "3", "4", "5"] },
        },
      ]);
  });

  it("aceita um operador sem lado direito", async () => {
    await expectNoConditionIssue([
        {
          variableId: "sys:dia_semana",
          operator: "is_weekend",
          right: { kind: "literal", value: "" },
        },
      ]);
  });

  it("aceita uma faixa de datas", async () => {
    await expectNoConditionIssue([
        {
          variableId: "sys:data",
          operator: "between",
          right: { kind: "range", from: "2026-12-01", to: "2026-12-31" },
        },
      ]);
  });

  it("recusa um operador que não vale para o tipo", async () => {
    expect(
      await issuesOf([
        {
          variableId: "sys:dia_semana",
          operator: "gt",
          right: { kind: "literal", value: "3" },
        },
      ]),
    ).toEqual([
      { nodeId: "condition-d4", message: "O operador não vale para dia_semana" },
    ]);
  });

  it("recusa uma faixa pela metade", async () => {
    expect(
      await issuesOf([
        {
          variableId: "sys:hora",
          operator: "between",
          right: { kind: "range", from: "08:00", to: "" },
        },
      ]),
    ).toEqual([
      { nodeId: "condition-d4", message: "Uma condição está sem valor de comparação" },
    ]);
  });

  it("recusa um conjunto vazio", async () => {
    expect(
      await issuesOf([
        { variableId: "sys:mes", operator: "in", right: { kind: "set", values: [] } },
      ]),
    ).toEqual([
      { nodeId: "condition-d4", message: "Uma condição está sem valor de comparação" },
    ]);
  });

  it("recusa uma forma de valor que o operador não pede", async () => {
    expect(
      await issuesOf([
        {
          variableId: "sys:hora",
          operator: "between",
          right: { kind: "literal", value: "08:00" },
        },
      ]),
    ).toEqual([
      { nodeId: "condition-d4", message: "Uma condição está sem valor de comparação" },
    ]);
  });

  it("recusa uma hora fora do formato", async () => {
    expect(
      await issuesOf([
        {
          variableId: "sys:hora",
          operator: "after",
          right: { kind: "literal", value: "25:99" },
        },
      ]),
    ).toEqual([
      { nodeId: "condition-d4", message: "Valor inválido para hora: 25:99" },
    ]);
  });

  it("recusa um mês fora de 1..12", async () => {
    expect(
      await issuesOf([
        {
          variableId: "sys:mes",
          operator: "in",
          right: { kind: "set", values: ["1", "13"] },
        },
      ]),
    ).toEqual([{ nodeId: "condition-d4", message: "Valor inválido para mes: 13" }]);
  });

  it("recusa comparar um tipo especial com outra variável", async () => {
    expect(
      await issuesOf([
        {
          variableId: "sys:hora",
          operator: "after",
          right: { kind: "variable", variableId: "sys:data" },
        },
      ]),
    ).toEqual([
      {
        nodeId: "condition-d4",
        message: "hora só pode ser comparada com um valor fixo",
      },
    ]);
  });

  it("recusa uma faixa gravada num definir variável", async () => {
    // O bloco `definir variável` não oferece faixa nem conjunto; um documento
    // adulterado que trouxesse uma chegaria ao motor numa forma que ele não lê.
    const { service } = createService();
    await service.saveDraft(AUTOMATION_ID, ORG, {
      version: 1,
      document: document({
        nodes: [
          startNode({ kind: "anyMessage" }),
          {
            id: "set-e5",
            type: "setVariable",
            position: { x: 0, y: 400 },
            data: {
              variableId: "var-1",
              operation: "set",
              value: { kind: "range", from: "08:00", to: "18:00" },
            },
          },
        ],
        variables: [{ id: "var-1", name: "faixa", type: "text", initialValue: "" }],
      }),
    });

    const error = await service
      .publish(AUTOMATION_ID, ORG)
      .catch((caught: unknown) => caught);

    expect((error as FlowInvalidError).issues).toEqual([
      { nodeId: "set-e5", message: BLOCK_NOT_EXECUTABLE_MESSAGE },
      { nodeId: "set-e5", message: "Informe o valor" },
    ]);
  });

  it("segue aceitando texto comparado com outra variável", async () => {
    const { service } = createService();
    await service.saveDraft(AUTOMATION_ID, ORG, {
      version: 1,
      document: document({
        nodes: [
          startNode({ kind: "anyMessage" }),
          conditionNode([
            {
              variableId: "sys:primeiro_nome",
              operator: "eq",
              right: { kind: "variable", variableId: "var-1" },
            },
          ]),
        ],
        variables: [
          { id: "var-1", name: "esperado", type: "text", initialValue: "" },
        ],
      }),
    });

    const error = await service
      .publish(AUTOMATION_ID, ORG)
      .catch((caught: unknown) => caught);

    // Nenhum problema da condição — só o do bloco que ainda não roda.
    expect((error as FlowInvalidError).issues).toEqual([
      { nodeId: "condition-d4", message: BLOCK_NOT_EXECUTABLE_MESSAGE },
    ]);
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

async function seedAutomation(organizationId: string) {
  return createAutomationsRepository(app.prisma).create({
    organizationId,
    name: "Fluxo de teste",
    document: createInitialDocument(),
    trigger: { kind: "none" },
    blockCount: 1,
  });
}

describe("FlowRepository", () => {
  it("a trava otimista não escreve nada quando a versão não bate", async () => {
    const flows = createFlowRepository(app.prisma);
    const automations = createAutomationsRepository(app.prisma);
    const organizationId = orgId();
    const automation = await seedAutomation(organizationId);

    try {
      const changed = document({ nodes: [startNode(), textNode()] });

      const stale = await flows.saveDraft({
        automationId: automation.id,
        expectedVersion: 99,
        document: changed,
        trigger: { kind: "anyMessage" },
        blockCount: 2,
      });

      expect(stale).toBeNull();
      const draft = await flows.findDraft(automation.id);
      expect(draft?.version).toBe(1);
      expect(draft?.document.nodes).toHaveLength(1);
    } finally {
      await automations.delete(automation.id, organizationId);
    }
  });

  it("salvar sobe a versão e move os derivados da automação na mesma transação", async () => {
    const flows = createFlowRepository(app.prisma);
    const automations = createAutomationsRepository(app.prisma);
    const organizationId = orgId();
    const automation = await seedAutomation(organizationId);

    try {
      const saved = await flows.saveDraft({
        automationId: automation.id,
        expectedVersion: 1,
        document: document({
          nodes: [startNode({ kind: "keyword", keywords: ["oi"] }), textNode()],
        }),
        trigger: { kind: "keyword", keywords: ["oi"] },
        blockCount: 2,
      });

      expect(saved?.version).toBe(2);
      expect(saved?.automation).toMatchObject({
        trigger: { kind: "keyword", keywords: ["oi"] },
        blockCount: 2,
        draftVersion: 2,
      });
    } finally {
      await automations.delete(automation.id, organizationId);
    }
  });

  it("publicar deixa os três ponteiros coerentes e numera a partir de 1", async () => {
    const flows = createFlowRepository(app.prisma);
    const automations = createAutomationsRepository(app.prisma);
    const organizationId = orgId();
    const automation = await seedAutomation(organizationId);

    try {
      const first = await flows.publish({
        automationId: automation.id,
        document: createInitialDocument(),
        trigger: { kind: "anyMessage" },
        draftVersion: 1,
      });
      const second = await flows.publish({
        automationId: automation.id,
        document: createInitialDocument(),
        trigger: { kind: "firstContact" },
        draftVersion: 3,
      });

      expect(first.number).toBe(1);
      expect(second.number).toBe(2);
      expect(second.automation).toMatchObject({
        publishedVersionNumber: 2,
        publishedDraftVersion: 3,
      });
      expect(second.automation.publishedAt).toEqual(second.publishedAt);
    } finally {
      await automations.delete(automation.id, organizationId);
    }
  });

  it("o banco impede duas versões com o mesmo número", async () => {
    const automations = createAutomationsRepository(app.prisma);
    const organizationId = orgId();
    const automation = await seedAutomation(organizationId);

    try {
      // Escrita crua de propósito: o repository nunca repete um número, então
      // o que está sob teste aqui é a garantia do banco, não a nossa.
      const data = {
        automationId: automation.id,
        number: 1,
        document: JSON.parse(JSON.stringify(createInitialDocument())) as object,
        trigger: { kind: "anyMessage" },
        draftVersion: 1,
      };
      await app.prisma.flowVersion.create({ data });

      await expect(app.prisma.flowVersion.create({ data })).rejects.toThrow();
    } finally {
      await automations.delete(automation.id, organizationId);
    }
  });
});

// --- Rotas -------------------------------------------------------------------

/** Fastify devolve set-cookie como array; as requisições querem um header. */
function cookieOf(response: { headers: Record<string, unknown> }): string {
  const cookie = response.headers["set-cookie"];
  if (!cookie) throw new Error("esperava um cookie de sessão");
  return Array.isArray(cookie) ? cookie.join("; ") : String(cookie);
}

/** Pela superfície HTTP de propósito — nunca escrevendo nas tabelas do Better Auth. */
async function signUpWithOrg(): Promise<string> {
  const email = `flow-${crypto.randomUUID()}@example.com`;
  const signUp = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    payload: { name: "Flow Tester", email, password: "senha-super-secreta" },
  });
  const firstCookie = cookieOf(signUp);

  await app.inject({
    method: "POST",
    url: "/api/auth/organization/create",
    headers: { cookie: firstCookie },
    payload: { name: "Org", slug: `org-${crypto.randomUUID().slice(0, 12)}` },
  });

  // Uma organização só é ativada na criação da sessão: entrar de novo é o que
  // preenche activeOrganizationId.
  const signIn = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    payload: { email, password: "senha-super-secreta" },
  });
  return cookieOf(signIn);
}

async function createAutomation(cookie: string, name = "Teste"): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/automations",
    headers: { cookie },
    payload: { name },
  });
  expect(response.statusCode).toBe(201);
  return response.json().id as string;
}

describe("rotas de automação e fluxo", () => {
  it("401 sem sessão", async () => {
    const list = await app.inject({ method: "GET", url: "/api/automations" });
    expect(list.statusCode).toBe(401);

    const flow = await app.inject({ method: "GET", url: "/api/automations/x/flow" });
    expect(flow.statusCode).toBe(401);
  });

  it("403 ORGANIZATION_REQUIRED autenticado sem organização ativa", async () => {
    const signUp = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        name: "Sem Org",
        email: `no-org-${crypto.randomUUID()}@example.com`,
        password: "senha-super-secreta",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/automations",
      headers: { cookie: cookieOf(signUp) },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "ORGANIZATION_REQUIRED" });
  });

  it("cria a automação com rascunho e devolve o fluxo por id", async () => {
    const cookie = await signUpWithOrg();
    const id = await createAutomation(cookie, "Boas-vindas");

    const response = await app.inject({
      method: "GET",
      url: `/api/automations/${id}/flow`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      version: 1,
      automation: { name: "Boas-vindas", status: "draft", blockCount: 1 },
    });
    expect(response.json().document.nodes[0].type).toBe("start");
  });

  it("salva o documento inteiro e o devolve sem podar nada", async () => {
    const cookie = await signUpWithOrg();
    const id = await createAutomation(cookie);

    const saved = document({
      nodes: [
        startNode({ kind: "keyword", keywords: ["oi"] }),
        randomizerNode(),
        textNode("text-b2", "Olá {{nome_cliente}}!"),
      ],
      edges: [
        edge("start-a1", "out", "randomizer-c3"),
        edge("randomizer-c3", "branch-a", "text-b2"),
      ],
      variables: [
        { id: "var-a1", name: "nome_cliente", type: "text", initialValue: "" },
      ],
      viewport: { x: 12, y: -30, zoom: 1.25 },
    });

    const put = await app.inject({
      method: "PUT",
      url: `/api/automations/${id}/flow`,
      headers: { cookie },
      payload: { version: 1, document: saved },
    });

    expect(put.statusCode).toBe(200);
    expect(put.json()).toMatchObject({
      version: 2,
      automation: { trigger: { kind: "keyword", keywords: ["oi"] }, blockCount: 3 },
    });

    const get = await app.inject({
      method: "GET",
      url: `/api/automations/${id}/flow`,
      headers: { cookie },
    });

    // O `data` de cada bloco é opaco para o banco: o que voltar diferente do
    // que entrou é perda silenciosa, e é exatamente o que este teste pega.
    expect(get.json().document).toEqual(saved);
  });

  it("409 FLOW_VERSION_CONFLICT quando a versão está velha", async () => {
    const cookie = await signUpWithOrg();
    const id = await createAutomation(cookie);
    const payload = { version: 1, document: document() };

    const first = await app.inject({
      method: "PUT",
      url: `/api/automations/${id}/flow`,
      headers: { cookie },
      payload,
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "PUT",
      url: `/api/automations/${id}/flow`,
      headers: { cookie },
      payload,
    });

    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({ code: "FLOW_VERSION_CONFLICT" });
  });

  it("400 UNKNOWN_BLOCK_TYPE para um tipo que o backend não conhece", async () => {
    const cookie = await signUpWithOrg();
    const id = await createAutomation(cookie);

    const response = await app.inject({
      method: "PUT",
      url: `/api/automations/${id}/flow`,
      headers: { cookie },
      payload: {
        version: 1,
        document: document({
          nodes: [
            startNode(),
            { id: "x-1", type: "carrossel", position: { x: 0, y: 0 }, data: {} },
          ],
        }),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "UNKNOWN_BLOCK_TYPE" });
  });

  it("422 FLOW_INVALID, com a lista de problemas, ao publicar um fluxo incompleto", async () => {
    const cookie = await signUpWithOrg();
    const id = await createAutomation(cookie);

    await app.inject({
      method: "PUT",
      url: `/api/automations/${id}/flow`,
      headers: { cookie },
      payload: {
        version: 1,
        document: document({
          nodes: [startNode({ kind: "anyMessage" }), textNode("text-b2", "")],
        }),
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/automations/${id}/flow/publish`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      code: "FLOW_INVALID",
      issues: [{ nodeId: "text-b2", message: "Sem mensagem" }],
    });
  });

  it("publicar libera ativar; antes disso, 409 NOT_PUBLISHED", async () => {
    const cookie = await signUpWithOrg();
    const id = await createAutomation(cookie);

    const tooEarly = await app.inject({
      method: "PATCH",
      url: `/api/automations/${id}`,
      headers: { cookie },
      payload: { isActive: true },
    });
    expect(tooEarly.statusCode).toBe(409);
    expect(tooEarly.json()).toMatchObject({ code: "NOT_PUBLISHED" });

    await app.inject({
      method: "PUT",
      url: `/api/automations/${id}/flow`,
      headers: { cookie },
      payload: {
        version: 1,
        document: document({ nodes: [startNode({ kind: "anyMessage" })] }),
      },
    });

    const publish = await app.inject({
      method: "POST",
      url: `/api/automations/${id}/flow/publish`,
      headers: { cookie },
    });
    expect(publish.statusCode).toBe(200);
    expect(publish.json()).toMatchObject({
      versionNumber: 1,
      automation: { status: "paused", hasUnpublishedChanges: false },
    });

    const activate = await app.inject({
      method: "PATCH",
      url: `/api/automations/${id}`,
      headers: { cookie },
      payload: { isActive: true },
    });
    expect(activate.statusCode).toBe(200);
    expect(activate.json()).toMatchObject({ status: "active" });
  });

  it("alterar depois de publicar acende hasUnpublishedChanges", async () => {
    const cookie = await signUpWithOrg();
    const id = await createAutomation(cookie);

    await app.inject({
      method: "PUT",
      url: `/api/automations/${id}/flow`,
      headers: { cookie },
      payload: {
        version: 1,
        document: document({ nodes: [startNode({ kind: "anyMessage" })] }),
      },
    });
    await app.inject({
      method: "POST",
      url: `/api/automations/${id}/flow/publish`,
      headers: { cookie },
    });

    const changed = await app.inject({
      method: "PUT",
      url: `/api/automations/${id}/flow`,
      headers: { cookie },
      payload: {
        version: 2,
        document: document({
          nodes: [startNode({ kind: "anyMessage" }), textNode()],
        }),
      },
    });

    expect(changed.json().automation.hasUnpublishedChanges).toBe(true);
  });

  it("duplicar copia o rascunho e nasce rascunho", async () => {
    const cookie = await signUpWithOrg();
    const id = await createAutomation(cookie, "Original");

    await app.inject({
      method: "PUT",
      url: `/api/automations/${id}/flow`,
      headers: { cookie },
      payload: {
        version: 1,
        document: document({
          nodes: [startNode({ kind: "anyMessage" }), textNode()],
        }),
      },
    });

    const copy = await app.inject({
      method: "POST",
      url: `/api/automations/${id}/duplicate`,
      headers: { cookie },
    });

    expect(copy.statusCode).toBe(201);
    expect(copy.json()).toMatchObject({
      name: "Original (cópia)",
      status: "draft",
      blockCount: 2,
      trigger: { kind: "anyMessage" },
    });

    const copiedFlow = await app.inject({
      method: "GET",
      url: `/api/automations/${copy.json().id}/flow`,
      headers: { cookie },
    });
    expect(copiedFlow.json().document.nodes).toHaveLength(2);
  });

  it("excluir tira da lista", async () => {
    const cookie = await signUpWithOrg();
    const id = await createAutomation(cookie);

    const removed = await app.inject({
      method: "DELETE",
      url: `/api/automations/${id}`,
      headers: { cookie },
    });
    expect(removed.statusCode).toBe(204);

    const list = await app.inject({
      method: "GET",
      url: "/api/automations",
      headers: { cookie },
    });
    expect(list.json()).toEqual([]);
  });

  it("a automação de outra organização é 404 em TODAS as rotas de :id", async () => {
    const owner = await signUpWithOrg();
    const stranger = await signUpWithOrg();
    const id = await createAutomation(owner, "Secreta");

    const requests = [
      { method: "GET" as const, url: `/api/automations/${id}` },
      { method: "PATCH" as const, url: `/api/automations/${id}`, payload: { name: "x" } },
      { method: "DELETE" as const, url: `/api/automations/${id}` },
      { method: "POST" as const, url: `/api/automations/${id}/duplicate` },
      { method: "GET" as const, url: `/api/automations/${id}/flow` },
      {
        method: "PUT" as const,
        url: `/api/automations/${id}/flow`,
        payload: { version: 1, document: document() },
      },
      { method: "POST" as const, url: `/api/automations/${id}/flow/publish` },
    ];

    for (const request of requests) {
      const response = await app.inject({
        ...request,
        headers: { cookie: stranger },
      });
      // 404, nunca 403: um 403 confirmaria que o recurso existe.
      expect(response.statusCode, `${request.method} ${request.url}`).toBe(404);
    }

    // E a lista de uma organização não enxerga a da outra.
    const strangerList = await app.inject({
      method: "GET",
      url: "/api/automations",
      headers: { cookie: stranger },
    });
    expect(strangerList.json()).toEqual([]);
  });
});
