import type { FlowDocument } from "../automations/flow.schema.js";
import type { TriggerCandidate } from "./trigger-matcher.js";

/**
 * As portas do motor: o que ele precisa do mundo, declarado como interface para
 * que o serviço continue testável com objetos de dez linhas.
 *
 * Nenhuma delas menciona BullMQ, Redis, Prisma ou Evolution — as implementações
 * moram nos adapters (`scheduler.ts`, `flow-runtime.worker.ts`, o repositório),
 * e é isso que faz o teste do serviço rodar em milissegundos.
 */

/** Os quatro nomes de job da fila `flow-runtime`. */
export type JobName = "advance" | "deliver" | "timeout" | "expire";

export interface JobPayload {
  executionId: string;
  /** O token com que o job foi criado. É ele que morre no CAS quando envelhece. */
  token: number;
}

export interface ScheduledJob {
  name: JobName;
  payload: JobPayload;
  delayMs?: number;
  /**
   * Id determinístico: o BullMQ recusa um segundo job com o mesmo id, o que
   * torna reagendar idempotente.
   */
  jobId?: string;
  /**
   * Modo debounce: cada job novo com a mesma chave empurra o relógio para a
   * frente e substitui o anterior. É o agrupamento das mensagens picadas.
   */
  debounce?: { key: string; ttlMs: number };
}

export interface Scheduler {
  schedule(job: ScheduledJob): Promise<void>;
}

/**
 * A saída. Recebe a organização, não a instância: qual número envia é detalhe
 * do adapter, e o motor não deve saber que existe uma tabela de conexão.
 */
export interface MessageGateway {
  sendText(params: {
    organizationId: string;
    number: string;
    text: string;
    delayMs?: number;
  }): Promise<{ externalId: string | null }>;
}

/**
 * "Já vi esta mensagem?" — `true` na primeira vez. Sem tabela geral de
 * mensagens não há onde guardar isso; o Redis cobre com folga a janela de
 * redelivery do Rabbit.
 */
export interface MessageDeduplicator {
  markSeen(organizationId: string, externalId: string): Promise<boolean>;
}

/**
 * As versões publicadas de uma organização. Duas consultas de propósito: os
 * candidatos vêm sem documento (é a lista inteira), e só o documento da
 * escolhida é carregado.
 */
export interface PublishedFlowLookup {
  findTriggerCandidates(organizationId: string): Promise<TriggerCandidate[]>;
  findVersionDocument(versionId: string): Promise<FlowDocument | null>;
}
