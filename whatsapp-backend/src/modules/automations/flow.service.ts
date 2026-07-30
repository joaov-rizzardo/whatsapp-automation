import {
  FlowInvalidError,
  NotFoundError,
  UnknownBlockTypeError,
  ValidationError,
  VersionConflictError,
  type ValidationIssue,
} from "../../shared/errors.js";
import type {
  AutomationRecord,
  AutomationsRepository,
} from "./automations.repository.js";
import {
  toAutomationView,
  type AutomationView,
} from "./automations.schema.js";
import type {
  BlockDefinition,
  FlowValidationContext,
  FlowValidationVariable,
} from "./blocks/block-definition.js";
import {
  getBlock,
  isExecutable,
  resolveBlockHandles,
  START_BLOCK_TYPE,
  validateBlockData,
} from "./blocks/registry.js";
import { NO_TRIGGER, type AutomationTrigger } from "./blocks/start/start.block.js";
import { systemVariables } from "./blocks/system-variables.js";
import type { FlowRepository } from "./flow.repository.js";
import {
  SUPPORTED_SCHEMA_VERSION,
  type FlowDocument,
  type SaveDraftInput,
} from "./flow.schema.js";

/**
 * O fluxo de uma automação: carregar, salvar o rascunho e publicar.
 *
 * A divisão que sustenta o autosave (decisão 7 da spec): **salvar valida a
 * forma, publicar valida o sentido.** O autosave dispara enquanto o usuário
 * digita, então tem que aceitar um fluxo incompleto — o que ele não aceita é
 * lixo estrutural, que o motor não conseguiria percorrer.
 */

const NODE_ID_PATTERN = /^[\w:-]{1,120}$/;
const VARIABLE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

function shortId(): string {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * O documento com que toda automação nasce: só a âncora, sem gatilho. Os dados
 * vêm do `createData` do bloco de início — é por isso que ele é o único bloco
 * do backend que precisa saber criar os próprios dados.
 */
export function createInitialDocument(): FlowDocument {
  const start = getBlock(START_BLOCK_TYPE);
  if (!start?.createData) {
    throw new Error("O bloco de início precisa de createData no registry.");
  }

  return {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    nodes: [
      {
        id: `${START_BLOCK_TYPE}-${shortId()}`,
        type: START_BLOCK_TYPE,
        position: { x: 0, y: 0 },
        data: start.createData() as Record<string, unknown>,
      },
    ],
    edges: [],
    variables: [],
    // Sem viewport: um documento novo não tem enquadramento nenhum a
    // restaurar, e é a ausência dele que faz o editor enquadrar o canvas
    // sozinho na primeira abertura.
  };
}

/**
 * O gatilho de um documento. A fonte da verdade é o nó de início; a coluna
 * `automation.trigger` é uma cópia derivada dele a cada salvamento, e é dela
 * que a lista vive.
 */
export function deriveTrigger(document: FlowDocument): AutomationTrigger {
  const start = document.nodes.find((node) => node.type === START_BLOCK_TYPE);
  const trigger = (start?.data as { trigger?: AutomationTrigger } | undefined)?.trigger;
  return trigger ?? NO_TRIGGER;
}

export function countBlocks(document: FlowDocument): number {
  return document.nodes.length;
}

/** As variáveis que uma regra semântica enxerga: as do fluxo mais as do sistema. */
function validationContext(document: FlowDocument): FlowValidationContext {
  const custom: FlowValidationVariable[] = document.variables.map((variable) => ({
    ...variable,
    origin: "custom",
  }));
  return { variables: [...custom, ...systemVariables] };
}

/**
 * O que o motor precisa para percorrer o documento sem tropeçar: ids únicos,
 * tipos conhecidos, `data` na forma do tipo, um início só, e toda aresta ligada
 * a handles que existem *para aqueles dados*.
 *
 * Devolve uma lista em vez de lançar porque os dois caminhos a usam de jeitos
 * diferentes: o salvamento aborta no primeiro problema, a publicação junta tudo
 * com o que as regras semânticas acharem.
 */
function collectStructuralIssues(document: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (nodeId: string, message: string) => issues.push({ nodeId, message });

  if (document.schemaVersion > SUPPORTED_SCHEMA_VERSION) {
    push(
      "",
      `Este fluxo foi salvo por uma versão mais nova do app (formato ${document.schemaVersion}).`,
    );
    // Não dá para conferir mais nada: as regras abaixo são as do formato atual.
    return issues;
  }

  const nodeIds = new Set<string>();
  for (const node of document.nodes) {
    if (!NODE_ID_PATTERN.test(node.id)) {
      push(node.id, "Id de bloco inválido");
      continue;
    }
    if (nodeIds.has(node.id)) {
      push(node.id, "Há dois blocos com o mesmo id");
      continue;
    }
    nodeIds.add(node.id);

    const dataProblem = validateBlockData(node.type, node.data);
    if (dataProblem) push(node.id, dataProblem);
  }

  const startNodes = document.nodes.filter((node) => node.type === START_BLOCK_TYPE);
  if (startNodes.length === 0) {
    push("", "O fluxo precisa de um bloco de início");
  } else if (startNodes.length > 1) {
    push(startNodes[1].id, "O fluxo só pode ter um bloco de início");
  }

  const edgeIds = new Set<string>();
  const byId = new Map(document.nodes.map((node) => [node.id, node]));

  for (const edge of document.edges) {
    if (edgeIds.has(edge.id)) {
      push(edge.source, "Há duas conexões com o mesmo id");
      continue;
    }
    edgeIds.add(edge.id);

    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source) {
      push(edge.source, "Uma conexão sai de um bloco que não existe");
      continue;
    }
    if (!target) {
      push(edge.source, "Uma conexão aponta para um bloco que não existe");
      continue;
    }

    // Os handles são função dos *dados* — é o que faz o randomizador de N
    // saídas ser conferido sem nenhum caso especial aqui.
    const sourceDefinition = getBlock(source.type);
    const targetDefinition = getBlock(target.type);
    if (!sourceDefinition || !targetDefinition) continue; // já reportado acima

    if (!resolveBlockHandles(sourceDefinition, source.data).outputs.includes(edge.sourceHandle)) {
      push(source.id, `A conexão sai de uma saída que não existe (${edge.sourceHandle})`);
    }
    if (!resolveBlockHandles(targetDefinition, target.data).inputs.includes(edge.targetHandle)) {
      push(target.id, `A conexão chega numa entrada que não existe (${edge.targetHandle})`);
    }
  }

  const variableIds = new Set<string>();
  const variableNames = new Set<string>();
  for (const variable of document.variables) {
    if (!VARIABLE_NAME_PATTERN.test(variable.name)) {
      push("", `Nome de variável inválido: ${variable.name}`);
    }
    if (variableIds.has(variable.id)) {
      push("", `Há duas variáveis com o mesmo id: ${variable.id}`);
    }
    if (variableNames.has(variable.name)) {
      push("", `Há duas variáveis chamadas ${variable.name}`);
    }
    variableIds.add(variable.id);
    variableNames.add(variable.name);
  }

  return issues;
}

/**
 * O caminho do salvamento: um problema estrutural é 400, não uma lista. Tipo
 * desconhecido ganha o próprio código porque o cliente faz outra coisa com ele.
 */
function assertStructurallyValid(document: FlowDocument): void {
  const unknownType = document.nodes.find((node) => !getBlock(node.type));
  if (unknownType) throw new UnknownBlockTypeError(unknownType.type);

  const [problem] = collectStructuralIssues(document);
  if (!problem) return;

  throw new ValidationError(
    problem.nodeId ? `${problem.message} (bloco ${problem.nodeId})` : problem.message,
  );
}

/**
 * O que o editor mostra no nó de um bloco que o motor ainda não sabe rodar.
 *
 * A alternativa era publicar um fluxo que morre no meio da conversa, sem tela
 * nenhuma para contar o que houve (spec 008 §4.10).
 *
 * **Hoje nenhum bloco do editor cai aqui**: a spec 009 fechou os três que
 * faltavam, e a barreira parou de acusar sem que uma linha deste arquivo
 * mudasse — que era exatamente a aposta. A regra fica de pé para o próximo
 * bloco que nascer sem `execute` (mídia, botões).
 */
export const BLOCK_NOT_EXECUTABLE_MESSAGE = "Este bloco ainda não pode ser executado";

/** As regras de cada bloco, que só valem na publicação. */
function collectSemanticIssues(document: FlowDocument): ValidationIssue[] {
  const context = validationContext(document);
  const issues: ValidationIssue[] = [];

  for (const node of document.nodes) {
    // "Tem `execute`" e "é publicável" são a mesma frase, perguntada ao mesmo
    // registry que o motor consulta — então não existe uma segunda lista de
    // tipos executáveis para esquecer de atualizar.
    if (!isExecutable(node.type)) {
      issues.push({ nodeId: node.id, message: BLOCK_NOT_EXECUTABLE_MESSAGE });
    }

    const definition: BlockDefinition | undefined = getBlock(node.type);
    if (!definition?.validate) continue;

    // As regras do próprio bloco continuam valendo mesmo quando ele não é
    // executável: quando o `execute` chegar, o usuário não deve descobrir um
    // problema novo que estava escondido atrás do primeiro.
    const message = definition.validate(node.data, context);
    if (message) issues.push({ nodeId: node.id, message });
  }

  return issues;
}

export type FlowView = {
  version: number;
  updatedAt: string;
  document: FlowDocument;
  automation: AutomationView;
};

export type SavedFlowView = {
  version: number;
  updatedAt: string;
  automation: AutomationView;
};

export type PublishedFlowView = {
  versionNumber: number;
  publishedAt: string;
  automation: AutomationView;
};

export class FlowService {
  constructor(
    private readonly automations: AutomationsRepository,
    private readonly flows: FlowRepository,
  ) {}

  /**
   * Sempre por `(id, organizationId)`. Id de outra organização responde 404, e
   * não 403: um 403 confirmaria que o recurso existe.
   */
  private async requireAutomation(
    automationId: string,
    organizationId: string,
  ): Promise<AutomationRecord> {
    const automation = await this.automations.findById(automationId, organizationId);
    if (!automation) throw new NotFoundError("Automação não encontrada.");
    return automation;
  }

  async getFlow(automationId: string, organizationId: string): Promise<FlowView> {
    const automation = await this.requireAutomation(automationId, organizationId);
    const draft = await this.flows.findDraft(automationId);
    if (!draft) throw new NotFoundError("Automação não encontrada.");

    return {
      version: draft.version,
      updatedAt: draft.updatedAt.toISOString(),
      document: draft.document,
      automation: toAutomationView(automation),
    };
  }

  async saveDraft(
    automationId: string,
    organizationId: string,
    input: SaveDraftInput,
  ): Promise<SavedFlowView> {
    await this.requireAutomation(automationId, organizationId);

    const draft = await this.flows.findDraft(automationId);
    if (!draft) throw new NotFoundError("Automação não encontrada.");
    if (draft.version !== input.version) throw new VersionConflictError();

    assertStructurallyValid(input.document);

    const saved = await this.flows.saveDraft({
      automationId,
      expectedVersion: input.version,
      document: input.document,
      trigger: deriveTrigger(input.document),
      blockCount: countBlocks(input.document),
    });
    // A escrita repete a checagem de versão dentro da transação, então uma
    // corrida entre a leitura acima e ela também vira 409, nunca sobrescrita.
    if (!saved) throw new VersionConflictError();

    return {
      version: saved.version,
      updatedAt: saved.updatedAt.toISOString(),
      automation: toAutomationView(saved.automation),
    };
  }

  /**
   * Publicar congela o rascunho numa versão imutável. Revalida a estrutura de
   * propósito: o documento no banco pode ter sido gravado por uma versão
   * anterior do registry.
   *
   * Nó inalcançável a partir do início NÃO bloqueia — estacionar um ramo
   * enquanto se desenha é legítimo, e recusar por isso seria o editor decidindo
   * pelo usuário.
   */
  async publish(
    automationId: string,
    organizationId: string,
  ): Promise<PublishedFlowView> {
    await this.requireAutomation(automationId, organizationId);

    const draft = await this.flows.findDraft(automationId);
    if (!draft) throw new NotFoundError("Automação não encontrada.");

    const issues = [
      ...collectStructuralIssues(draft.document),
      ...collectSemanticIssues(draft.document),
    ];
    if (issues.length > 0) throw new FlowInvalidError(issues);

    const published = await this.flows.publish({
      automationId,
      document: draft.document,
      trigger: deriveTrigger(draft.document),
      draftVersion: draft.version,
    });

    return {
      versionNumber: published.number,
      publishedAt: published.publishedAt.toISOString(),
      automation: toAutomationView(published.automation),
    };
  }
}
