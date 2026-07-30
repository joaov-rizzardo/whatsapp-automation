import type { Logger } from "../../lib/logger/logger.js";
import type {
  ResumeInput,
  RuntimeContext,
  StepOutcome,
} from "../automations/blocks/block-runtime.js";
import {
  getExecutable,
  type ExecutableBlockDefinition,
} from "../automations/blocks/registry.js";
import {
  SUPPORTED_SCHEMA_VERSION,
  type FlowDocument,
  type FlowNodeDocument,
} from "../automations/flow.schema.js";
import type { InboundMessage } from "../inbound-messages/inbound-messages.types.js";
import { createFlowGraph, type FlowGraph } from "./flow-graph.js";
import type {
  ClaimedExecution,
  ExecutionRecord,
  FlowRuntimeRepository,
} from "./flow-runtime.repository.js";
import type {
  JobName,
  MessageDeduplicator,
  MessageGateway,
  PublishedFlowLookup,
  Scheduler,
} from "./flow-runtime.types.js";
import { rankTriggeredVersions } from "./trigger-matcher.js";
import {
  LAST_REPLY_VARIABLE_ID,
  createVariableStore,
  type FlowVariableStore,
} from "./variables.js";

/**
 * O motor. Duas entradas, e a separação entre elas é a propriedade que sustenta
 * o resto (spec 008 §4.1):
 *
 * - **`onInboundMessage`** roda no consumer AMQP. Decide, grava e enfileira —
 *   e **nunca caminha o fluxo**. Um `aguardar` de duas horas não pode segurar
 *   uma mensagem não confirmada.
 * - **`runStep`** roda no worker de fila, e é o **único escritor** do progresso.
 *   Um escritor só elimina a classe inteira de corridas entre os dois caminhos.
 */

/** Não falha o fluxo: cede o worker e reagenda (spec 008 §4.6). */
const MAX_STEPS_PER_TICK = 50;
/** O teto de verdade: é ele que distingue ciclo de fluxo grande. */
const MAX_STEPS_PER_EXECUTION = 500;
/** Nenhuma conversa segura um contato por mais de um dia. */
const EXECUTION_TTL_MS = 24 * 60 * 60 * 1000;
/** Folga sobre o fim de uma espera, para o TTL nunca cortar antes da hora. */
const DEADLINE_MARGIN_MS = 60 * 1000;
/** Quantas execuções zumbis o job `expire` varre por vez. */
const EXPIRE_BATCH = 100;

/** As mensagens picadas viram uma só, separadas por quebra de linha. */
const GROUPING_SEPARATOR = "\n";

export interface FlowRuntimeServiceOptions {
  repository: FlowRuntimeRepository;
  flows: PublishedFlowLookup;
  scheduler: Scheduler;
  gateway: MessageGateway;
  dedupe: MessageDeduplicator;
  logger: Logger;
  now?: () => Date;
  /** Injetado pelo mesmo motivo que o relógio: o randomizador precisa ser testável. */
  random?: () => number;
}

export interface StepJob {
  name: Extract<JobName, "advance" | "deliver" | "timeout">;
  executionId: string;
  token: number;
}

export class FlowRuntimeService {
  private readonly repository: FlowRuntimeRepository;
  private readonly flows: PublishedFlowLookup;
  private readonly scheduler: Scheduler;
  private readonly gateway: MessageGateway;
  private readonly dedupe: MessageDeduplicator;
  private readonly logger: Logger;
  private readonly now: () => Date;
  private readonly random: () => number;

  constructor(options: FlowRuntimeServiceOptions) {
    this.repository = options.repository;
    this.flows = options.flows;
    this.scheduler = options.scheduler;
    this.gateway = options.gateway;
    this.dedupe = options.dedupe;
    this.logger = options.logger;
    this.now = options.now ?? (() => new Date());
    this.random = options.random ?? Math.random;
  }

  // --- Entrada: uma mensagem chegou ------------------------------------------

  /**
   * Chamado pelo consumer da 007 quando uma mensagem foi normalizada e a
   * organização resolvida. Três escritas curtas e um `ack`.
   */
  async onInboundMessage(message: InboundMessage): Promise<void> {
    const isNew = await this.dedupe.markSeen(
      message.organizationId,
      message.externalId,
    );
    if (!isNew) {
      this.logger.debug(
        { organizationId: message.organizationId, externalId: message.externalId },
        "inbound message already seen, skipping",
      );
      return;
    }

    // O contato é registrado ANTES de qualquer decisão: é o `upsert` que diz se
    // é primeiro contato, e ele precisa valer mesmo quando nada dispara.
    const { contact, isFirstContact } = await this.repository.touchContact({
      organizationId: message.organizationId,
      jid: message.senderJid,
      number: message.senderNumber,
      pushName: message.senderName,
    });

    if (contact.activeExecutionId) {
      const execution = await this.repository.findExecutionById(
        contact.activeExecutionId,
      );
      if (execution) {
        // Regra única: enquanto uma execução roda, tudo que a pessoa escrever
        // pertence a ela. Nenhum gatilho é avaliado.
        await this.deliverToExecution(execution, message);
        return;
      }
    }

    await this.startMatchingFlow(message, contact.id, isFirstContact);
  }

  /** A mensagem pertence à conversa em andamento: grava e, se cabe, acorda. */
  private async deliverToExecution(
    execution: ExecutionRecord,
    message: InboundMessage,
  ): Promise<void> {
    const text = message.content.kind === "text" ? message.content.text : null;
    const stored = await this.repository.recordInbound({
      executionId: execution.id,
      kind: message.content.kind,
      text,
      externalId: message.externalId,
    });
    if (!stored) return;

    // Conteúdo não-texto entra no histórico e não retoma nada: responder a uma
    // foto exigiria decidir o que dizer, que é produto (spec 008 §3).
    if (text === null) return;

    // Fora de um `aguardar resposta` a mensagem fica no buffer, e o próximo
    // bloco de espera a consome na hora. Nada que a pessoa escreveu se perde.
    if (execution.status !== "waiting") return;

    const groupingMs = await this.groupingMsFor(execution);
    await this.scheduler.schedule({
      name: "deliver",
      payload: { executionId: execution.id, token: execution.waitToken },
      ...(groupingMs > 0
        ? {
            delayMs: groupingMs,
            // O modo debounce: cada mensagem nova empurra o relógio e substitui
            // o job anterior, então três mensagens picadas viram uma retomada.
            debounce: { key: `deliver:${execution.id}`, ttlMs: groupingMs },
          }
        : {}),
    });
  }

  /**
   * O agrupamento configurado no bloco em que a execução está parada. Sai do
   * documento (e não de uma coluna) porque é dado da versão publicada — copiá-lo
   * para a execução criaria uma segunda verdade para divergir.
   */
  private async groupingMsFor(execution: ExecutionRecord): Promise<number> {
    const document = await this.flows.findVersionDocument(execution.flowVersionId);
    if (!document || !execution.currentNodeId) return 0;

    const node = createFlowGraph(document).nodeById(execution.currentNodeId);
    const definition = node ? getExecutable(node.type) : null;
    if (!node || !definition) return 0;

    // O próprio bloco responde, executando: o agrupamento é dado dele, e ler o
    // campo aqui duplicaria a regra do `?? DEFAULT` que ele já tem.
    const outcome = await definition.execute(node.data, this.inertContext());
    return outcome.kind === "awaitReply" ? outcome.groupingMs : 0;
  }

  /**
   * Um `ctx` sem efeitos, para perguntar a um bloco de espera qual é o seu
   * agrupamento. Só blocos que não enviam nada passam por aqui — `awaitReply` é
   * puro —, e um envio a partir daqui seria um erro alto e visível.
   */
  private inertContext(): RuntimeContext {
    const fail = (): never => {
      throw new Error("bloco tentou produzir efeito fora de um passo");
    };
    return {
      variables: {
        get: () => "",
        set: fail,
        render: (text) => text,
        typeOf: () => "text",
      },
      send: { text: fail },
      contact: { number: "", name: null },
      logger: this.logger,
      now: this.now,
      // Um sorteio a partir daqui não decidiria nada: só `awaitReply` passa por
      // este contexto, e ele é puro.
      random: () => 0,
    };
  }

  /** Nenhuma execução ativa: casar o gatilho e começar uma conversa. */
  private async startMatchingFlow(
    message: InboundMessage,
    contactId: string,
    isFirstContact: boolean,
  ): Promise<void> {
    const text = message.content.kind === "text" ? message.content.text : null;
    const candidates = await this.flows.findTriggerCandidates(message.organizationId);
    const ranked = rankTriggeredVersions(candidates, { text, isFirstContact });

    for (const candidate of ranked) {
      const document = await this.flows.findVersionDocument(candidate.id);
      const startNode = document ? this.readableStartNode(document, candidate.id) : null;
      // Uma versão ilegível é pulada, e o motor tenta a próxima: um documento
      // do futuro não pode deixar a organização inteira muda.
      if (!document || !startNode) continue;

      const execution = await this.repository.startExecution({
        organizationId: message.organizationId,
        contactId,
        automationId: candidate.automationId,
        flowVersionId: candidate.id,
        currentNodeId: startNode.id,
        variables: this.seedVariables(document, text),
        expiresAt: new Date(this.now().getTime() + EXECUTION_TTL_MS),
      });
      // Perdemos a corrida: outra mensagem da mesma pessoa criou a execução
      // primeiro. A próxima mensagem cai no caminho da execução ativa.
      if (!execution) return;

      await this.repository.recordInbound({
        executionId: execution.id,
        kind: message.content.kind,
        text,
        externalId: message.externalId,
        // Já consumida: foi ela que disparou o fluxo, e no buffer ela seria
        // lida como resposta a uma pergunta que ainda não foi feita.
        consumed: true,
      });

      await this.scheduler.schedule({
        name: "advance",
        payload: { executionId: execution.id, token: execution.waitToken },
        jobId: `advance:${execution.id}:${execution.waitToken}`,
      });

      this.logger.info(
        {
          organizationId: message.organizationId,
          automationId: candidate.automationId,
          flowVersionId: candidate.id,
          executionId: execution.id,
        },
        "flow execution started",
      );
      return;
    }

    // Decisão, não conteúdo: o suficiente para investigar "por que não
    // disparou" sem despejar a conversa no stdout.
    this.logger.info(
      {
        organizationId: message.organizationId,
        matched: false,
        candidates: candidates.length,
        textLength: text?.length ?? 0,
      },
      "no trigger matched",
    );
  }

  private readableStartNode(
    document: FlowDocument,
    versionId: string,
  ): FlowNodeDocument | null {
    if (document.schemaVersion > SUPPORTED_SCHEMA_VERSION) {
      this.logger.warn(
        { versionId, schemaVersion: document.schemaVersion },
        "published version is newer than this backend can read, skipping",
      );
      return null;
    }

    const startNode = createFlowGraph(document).startNode();
    if (!startNode) {
      this.logger.warn({ versionId }, "published version has no start node, skipping");
      return null;
    }
    return startNode;
  }

  private seedVariables(
    document: FlowDocument,
    text: string | null,
  ): Record<string, string> {
    const seeded: Record<string, string> = Object.fromEntries(
      document.variables.map((variable) => [variable.id, variable.initialValue]),
    );
    // A mensagem que disparou também preenche `ultima_resposta`: para quem
    // escreveu, ela É a última coisa que disse.
    if (text !== null) seeded[LAST_REPLY_VARIABLE_ID] = text;
    return seeded;
  }

  // --- Passo: o único escritor do progresso ----------------------------------

  async runStep(job: StepJob): Promise<void> {
    const claimed = await this.repository.claimStep(job.executionId, job.token);
    if (!claimed) {
      // Job obsoleto: o timeout que disparou depois da resposta, a repetição do
      // BullMQ, o job de uma execução encerrada. Nada disso é erro.
      this.logger.debug(
        { executionId: job.executionId, token: job.token, job: job.name },
        "stale job discarded",
      );
      return;
    }

    const document = await this.flows.findVersionDocument(claimed.flowVersionId);
    if (!document) {
      await this.endWith(claimed, claimed.stepCount, null, "failed", "missing-version");
      return;
    }

    const graph = createFlowGraph(document);
    const store = createVariableStore({
      variables: document.variables,
      values: claimed.variables,
      contact: { number: claimed.contact.number, name: claimed.contact.pushName },
      now: this.now,
    });

    const node = claimed.currentNodeId
      ? graph.nodeById(claimed.currentNodeId)
      : null;
    if (!node) {
      this.logger.warn(
        { executionId: claimed.id, nodeId: claimed.currentNodeId },
        "execution points at a node that no longer exists, completing",
      );
      await this.endWith(claimed, claimed.stepCount, store, "completed");
      return;
    }

    try {
      await this.walk(job, claimed, graph, store, node);
    } catch (error) {
      // O passo não aconteceu: devolve o token para que a repetição do BullMQ
      // — que carrega o payload original — encontre o mesmo estado de antes.
      // Sem isto, o retry morre no CAS e a conversa para sem nenhum sinal.
      await this.repository.releaseStep(claimed.id, job.token);
      throw error;
    }
  }

  /**
   * A caminhada. Um `while` com um `switch` sobre a intenção do bloco — e é só
   * isto: cada `kind` de `StepOutcome` tem um destino, e adicionar um bloco não
   * acrescenta um ramo aqui.
   */
  private async walk(
    job: StepJob,
    claimed: ClaimedExecution,
    graph: FlowGraph,
    store: FlowVariableStore,
    startingNode: FlowNodeDocument,
  ): Promise<void> {
    let node = startingNode;
    let stepCount = claimed.stepCount;
    let stepsThisTick = 0;

    // O `ctx` lê o nó por closure: `send` precisa saber, na hora do envio, qual
    // bloco produziu a mensagem, e o nó muda a cada volta.
    const ctx: RuntimeContext = {
      variables: store,
      send: {
        text: async (text, options) => {
          const result = await this.gateway.sendText({
            organizationId: claimed.organizationId,
            number: claimed.contact.number,
            text,
            delayMs: (options?.typingSeconds ?? 0) * 1000,
          });
          await this.repository.recordOutbound({
            executionId: claimed.id,
            text,
            externalId: result.externalId,
            nodeId: node.id,
          });
        },
      },
      contact: { number: claimed.contact.number, name: claimed.contact.pushName },
      logger: this.logger,
      now: this.now,
      random: this.random,
    };

    // `definition` anda junto com `node`: as duas variáveis mudam na mesma
    // linha, e é isso que dispensa reconsultar o registry no meio da volta.
    let definition = this.executableFor(node);
    if (!definition) {
      await this.endWith(
        claimed,
        stepCount,
        store,
        "failed",
        `unimplemented-block:${node.type}`,
      );
      return;
    }

    let outcome = await this.firstOutcome(job, claimed, definition, node, ctx, store);

    for (;;) {
      if (outcome.kind === "end") {
        await this.endWith(claimed, stepCount, store, "completed");
        return;
      }

      if (outcome.kind === "awaitReply") {
        await this.repository.suspend({
          executionId: claimed.id,
          status: "waiting",
          currentNodeId: node.id,
          variables: store.toJSON(),
          stepCount,
          expiresAt: this.deadline(outcome.timeoutMs),
        });

        // Drena antes de agendar o timeout: se a pessoa já escreveu enquanto o
        // bot falava, a espera acabou antes de começar.
        const buffered = await this.repository.drainInbox(claimed.id);
        if (buffered.length > 0) {
          outcome = await this.resumeWithReply(definition, node, ctx, store, buffered);
          continue;
        }

        await this.scheduler.schedule({
          name: "timeout",
          payload: { executionId: claimed.id, token: claimed.waitToken },
          delayMs: outcome.timeoutMs,
          jobId: `timeout:${claimed.id}:${claimed.waitToken}`,
        });
        return;
      }

      if (outcome.kind === "sleep") {
        const target = graph.next(node.id, outcome.handle);
        if (!target) {
          await this.endWith(claimed, stepCount, store, "completed");
          return;
        }

        await this.repository.suspend({
          executionId: claimed.id,
          status: "sleeping",
          // O nó atual passa a ser o ALVO: quando o job acordar, é ele que roda.
          currentNodeId: target.id,
          variables: store.toJSON(),
          stepCount,
          expiresAt: this.deadline(outcome.delayMs),
        });
        await this.scheduler.schedule({
          name: "advance",
          payload: { executionId: claimed.id, token: claimed.waitToken },
          delayMs: outcome.delayMs,
          jobId: `advance:${claimed.id}:${claimed.waitToken}`,
        });
        return;
      }

      // `next`: a saída sem aresta é o fim de um fluxo, não um erro.
      const target = graph.next(node.id, outcome.handle);
      if (!target) {
        await this.endWith(claimed, stepCount, store, "completed");
        return;
      }

      stepCount += 1;
      stepsThisTick += 1;
      if (stepCount > MAX_STEPS_PER_EXECUTION) {
        await this.endWith(claimed, stepCount, store, "failed", "step-limit");
        return;
      }

      const nextDefinition = this.executableFor(target);
      if (!nextDefinition) {
        await this.endWith(
          claimed,
          stepCount,
          store,
          "failed",
          `unimplemented-block:${target.type}`,
        );
        return;
      }

      node = target;
      definition = nextDefinition;
      // Checkpoint por bloco: a Evolution não tem idempotency key, então um job
      // repetido reenviaria. Gravando aqui, o estrago máximo é UMA mensagem
      // repetida — a do bloco que estava rodando —, não o fluxo desde o começo.
      await this.repository.saveProgress({
        executionId: claimed.id,
        currentNodeId: node.id,
        variables: store.toJSON(),
        stepCount,
      });

      if (stepsThisTick >= MAX_STEPS_PER_TICK) {
        // Cede o worker em vez de falhar: o orçamento total é que decide.
        await this.scheduler.schedule({
          name: "advance",
          payload: { executionId: claimed.id, token: claimed.waitToken },
          jobId: `advance:${claimed.id}:${claimed.waitToken}`,
        });
        return;
      }

      outcome = await definition.execute(node.data, ctx);
    }
  }

  /** O que fazer no primeiro nó, que depende de por que este job existe. */
  private async firstOutcome(
    job: StepJob,
    claimed: ClaimedExecution,
    definition: ExecutableBlockDefinition,
    node: FlowNodeDocument,
    ctx: RuntimeContext,
    store: FlowVariableStore,
  ): Promise<StepOutcome> {
    if (job.name === "advance") return definition.execute(node.data, ctx);

    if (job.name === "timeout") {
      return this.resume(definition, node, ctx, { kind: "timeout" });
    }

    const buffered = await this.repository.drainInbox(claimed.id);
    if (buffered.length === 0) {
      // Outro job já consumiu estas mensagens (o debounce do BullMQ e a drenagem
      // do próprio bloco podem se cruzar). Refazer a espera é literalmente
      // executar o bloco de novo — e é por isso que não existe caminho especial.
      return definition.execute(node.data, ctx);
    }
    return this.resumeWithReply(definition, node, ctx, store, buffered);
  }

  private async resumeWithReply(
    definition: ExecutableBlockDefinition,
    node: FlowNodeDocument,
    ctx: RuntimeContext,
    store: FlowVariableStore,
    buffered: Array<{ id: string; text: string; externalId: string | null }>,
  ): Promise<StepOutcome> {
    const text = buffered.map((message) => message.text).join(GROUPING_SEPARATOR);
    // Toda mensagem de texto consumida atualiza `ultima_resposta` — e, com
    // agrupamento, ela recebe o texto juntado inteiro, nunca o último pedaço.
    store.set(LAST_REPLY_VARIABLE_ID, text);

    return this.resume(definition, node, ctx, {
      kind: "reply",
      text,
      messageIds: buffered.map((message) => message.externalId ?? message.id),
    });
  }

  private async resume(
    definition: ExecutableBlockDefinition,
    node: FlowNodeDocument,
    ctx: RuntimeContext,
    input: ResumeInput,
  ): Promise<StepOutcome> {
    if (!definition.resume) {
      // Um bloco que suspende sem saber retomar deixaria a conversa presa para
      // sempre. Encerrar com erro é ruim; ficar mudo é pior.
      throw new Error(`bloco ${node.type} suspendeu sem saber retomar`);
    }
    return definition.resume(node.data, ctx, input);
  }

  private executableFor(node: FlowNodeDocument): ExecutableBlockDefinition | null {
    return getExecutable(node.type);
  }

  /** O prazo da execução: nunca menor que o fim da espera que está começando. */
  private deadline(waitMs: number): Date {
    const now = this.now().getTime();
    return new Date(Math.max(now + EXECUTION_TTL_MS, now + waitMs + DEADLINE_MARGIN_MS));
  }

  /** Encerra por qualquer caminho — e todo caminho passa por aqui. */
  private async endWith(
    claimed: ClaimedExecution,
    stepCount: number,
    store: FlowVariableStore | null,
    status: "completed" | "failed",
    error?: string,
  ): Promise<void> {
    await this.repository.saveProgress({
      executionId: claimed.id,
      currentNodeId: null,
      variables: store ? store.toJSON() : claimed.variables,
      stepCount,
    });
    await this.repository.finish({ executionId: claimed.id, status, error });

    if (status === "failed") {
      this.logger.warn(
        { executionId: claimed.id, automationId: claimed.automationId, error },
        "flow execution failed",
      );
    }
  }

  // --- Encerramentos vindos de fora -------------------------------------------

  /**
   * O job desistiu (as três tentativas se esgotaram). Chamado pelo listener
   * `failed` do BullMQ: sem isto, a execução ficaria `running` para sempre e o
   * contato preso até o `expire` — 24h de silêncio por uma queda de 10 segundos.
   */
  async abandon(executionId: string, error: string): Promise<void> {
    await this.repository.finish({ executionId, status: "failed", error });
    this.logger.warn({ executionId, error }, "flow execution abandoned");
  }

  /** O job repetível: zumbi não segura contato para sempre. */
  async expireStale(): Promise<number> {
    const stale = await this.repository.findExpired(this.now(), EXPIRE_BATCH);

    for (const execution of stale) {
      await this.repository.finish({
        executionId: execution.id,
        status: "expired",
        error: "expired",
      });
    }

    if (stale.length > 0) {
      this.logger.info({ count: stale.length }, "expired stale flow executions");
    }
    return stale.length;
  }
}
