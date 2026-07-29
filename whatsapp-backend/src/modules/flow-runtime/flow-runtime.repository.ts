import type { PrismaClient } from "../../generated/prisma/client.js";

/**
 * O único lugar com Prisma das três tabelas do motor.
 *
 * Duas operações aqui não são consultas: são **compare-and-set**. A do contato
 * garante um chatbot por vez; a do `waitToken` garante que um job repetido pelo
 * BullMQ não caminhe o fluxo duas vezes. As duas estão escritas como um `UPDATE`
 * com a condição no `WHERE` — é o banco que decide o vencedor, numa escrita só,
 * sem lock distribuído e sem o Redis virar fonte da verdade.
 */

/** running | waiting | sleeping | completed | failed | expired */
export type ExecutionStatus =
  | "running"
  | "waiting"
  | "sleeping"
  | "completed"
  | "failed"
  | "expired";

/** Os estados de quem ainda pode receber um passo. */
const LIVE_STATUSES: ExecutionStatus[] = ["running", "waiting", "sleeping"];

export interface ContactRecord {
  id: string;
  organizationId: string;
  jid: string;
  number: string;
  pushName: string | null;
  activeExecutionId: string | null;
}

export interface ExecutionRecord {
  id: string;
  organizationId: string;
  contactId: string;
  automationId: string;
  flowVersionId: string;
  status: ExecutionStatus;
  currentNodeId: string | null;
  waitToken: number;
  stepCount: number;
  variables: Record<string, string>;
  expiresAt: Date;
}

/** O que `claimStep` devolve: a execução mais quem está do outro lado. */
export interface ClaimedExecution extends ExecutionRecord {
  contact: { jid: string; number: string; pushName: string | null };
}

export interface TouchContactInput {
  organizationId: string;
  jid: string;
  number: string;
  pushName: string | null;
}

export interface StartExecutionInput {
  organizationId: string;
  contactId: string;
  automationId: string;
  flowVersionId: string;
  currentNodeId: string;
  variables: Record<string, string>;
  expiresAt: Date;
}

export interface InboundBufferMessage {
  id: string;
  text: string;
  externalId: string | null;
}

export interface FlowRuntimeRepository {
  /**
   * Registra quem escreveu e diz se a linha **nasceu agora** — que é a única
   * definição honesta de "primeiro contato". Sem esta tabela, quem escreveu dez
   * vezes antes de existir automação contaria como primeiro contato no dia da
   * ativação.
   */
  touchContact(
    input: TouchContactInput,
  ): Promise<{ contact: ContactRecord; isFirstContact: boolean }>;
  findContactById(contactId: string): Promise<ContactRecord | null>;
  findExecutionById(executionId: string): Promise<ExecutionRecord | null>;

  /** `null` = o contato já está numa conversa; ninguém criou nada. */
  startExecution(input: StartExecutionInput): Promise<ExecutionRecord | null>;

  /** `null` = job obsoleto. A trava e a invalidação numa escrita só. */
  claimStep(executionId: string, expectedToken: number): Promise<ClaimedExecution | null>;

  /**
   * Devolve o token: o passo não aconteceu.
   *
   * Existe por causa do at-least-once ao contrário. O BullMQ repete um job
   * **com o payload original**, então um passo que morreu no meio (envio falhou)
   * seria repetido carregando o token que o `claimStep` já queimou — e morreria
   * no CAS, em silêncio, deixando a conversa parada para sempre. Rolando o token
   * de volta, a repetição encontra exatamente o estado que encontrou da
   * primeira vez.
   */
  releaseStep(executionId: string, originalToken: number): Promise<void>;

  saveProgress(input: {
    executionId: string;
    currentNodeId: string | null;
    variables: Record<string, string>;
    stepCount: number;
  }): Promise<void>;

  suspend(input: {
    executionId: string;
    status: Extract<ExecutionStatus, "waiting" | "sleeping">;
    currentNodeId: string;
    variables: Record<string, string>;
    stepCount: number;
    expiresAt: Date;
  }): Promise<void>;

  /** Encerra e **libera o contato**. Inócuo numa execução já encerrada. */
  finish(input: {
    executionId: string;
    status: Extract<ExecutionStatus, "completed" | "failed" | "expired">;
    error?: string;
  }): Promise<void>;

  /** `false` = já tínhamos esta mensagem. */
  recordInbound(input: {
    executionId: string;
    kind: "text" | "unsupported";
    text: string | null;
    externalId: string;
    /**
     * A mensagem que **disparou** o fluxo entra já consumida: se ficasse no
     * buffer, o primeiro `aguardar resposta` a leria como resposta a uma
     * pergunta que ainda não tinha sido feita.
     */
    consumed?: boolean;
  }): Promise<boolean>;

  recordOutbound(input: {
    executionId: string;
    text: string;
    externalId: string | null;
    nodeId: string;
  }): Promise<void>;

  /** As entradas ainda não entregues a um bloco, na ordem, marcando-as. */
  drainInbox(executionId: string): Promise<InboundBufferMessage[]>;

  findExpired(now: Date, limit: number): Promise<Array<{ id: string; waitToken: number; expiresAt: Date }>>;
}

const contactSelect = {
  id: true,
  organizationId: true,
  jid: true,
  number: true,
  pushName: true,
  activeExecutionId: true,
} as const;

const executionSelect = {
  id: true,
  organizationId: true,
  contactId: true,
  automationId: true,
  flowVersionId: true,
  status: true,
  currentNodeId: true,
  waitToken: true,
  stepCount: true,
  variables: true,
  expiresAt: true,
} as const;

/** O `Json` do Prisma é largo demais; a coluna guarda `{ id: valor }` e nada mais. */
function toVariables(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  return Object.fromEntries(entries);
}

type ExecutionRow = {
  status: string;
  variables: unknown;
} & Omit<ExecutionRecord, "status" | "variables">;

function toExecution(row: ExecutionRow): ExecutionRecord {
  return {
    ...row,
    status: row.status as ExecutionStatus,
    variables: toVariables(row.variables),
  };
}

/** Sinaliza a corrida perdida para desfazer a transação sem virar erro do chamador. */
class ContactBusyError extends Error {}

export function createFlowRuntimeRepository(
  prisma: PrismaClient,
): FlowRuntimeRepository {
  return {
    async touchContact({ organizationId, jid, number, pushName }) {
      // `createMany` + `skipDuplicates` em vez de `findFirst` + `create`: duas
      // mensagens da mesma pessoa podem ser processadas em paralelo (o consumer
      // roda com prefetch 20), e o par ler-depois-escrever criaria dois
      // contatos. Aqui é o índice único que decide, e a contagem devolvida É a
      // resposta de "nasceu agora".
      const { count } = await prisma.whatsappContact.createMany({
        data: { organizationId, jid, number, pushName },
        skipDuplicates: true,
      });

      const contact = await prisma.whatsappContact.update({
        where: { organizationId_jid: { organizationId, jid } },
        // Um `pushName` ausente não apaga o que já sabíamos: nem toda mensagem
        // traz o nome, e `{{nome}}` viraria o número no meio da conversa.
        data: { lastSeenAt: new Date(), ...(pushName ? { pushName } : {}) },
        select: contactSelect,
      });

      return { contact, isFirstContact: count === 1 };
    },

    async findContactById(contactId) {
      return prisma.whatsappContact.findUnique({
        where: { id: contactId },
        select: contactSelect,
      });
    },

    async findExecutionById(executionId) {
      const row = await prisma.flowExecution.findUnique({
        where: { id: executionId },
        select: executionSelect,
      });
      return row ? toExecution(row) : null;
    },

    async startExecution(input) {
      try {
        const created = await prisma.$transaction(async (tx) => {
          // A trava do contato, tomada ANTES do INSERT — e a ordem é o ponto.
          //
          // Inserir primeiro e travar depois provoca deadlock de verdade (foi um
          // teste concorrente deste arquivo que o pegou): o INSERT da execução
          // já toma um lock FOR KEY SHARE na linha do contato, por causa da FK,
          // e três transações segurando esse lock compartilhado e pedindo o
          // exclusivo em seguida travam umas nas outras. Tomando o exclusivo
          // primeiro, a segunda transação simplesmente espera — e, em READ
          // COMMITTED, relê a linha depois do lock, então enxerga o
          // `activeExecutionId` que a primeira acabou de gravar.
          const [locked] = await tx.$queryRaw<
            Array<{ activeExecutionId: string | null }>
          >`SELECT "activeExecutionId" FROM whatsapp_contact WHERE id = ${input.contactId} FOR UPDATE`;

          if (!locked || locked.activeExecutionId !== null) {
            throw new ContactBusyError();
          }

          const execution = await tx.flowExecution.create({
            data: {
              organizationId: input.organizationId,
              contactId: input.contactId,
              automationId: input.automationId,
              flowVersionId: input.flowVersionId,
              status: "running",
              currentNodeId: input.currentNodeId,
              variables: input.variables,
              expiresAt: input.expiresAt,
            },
            select: executionSelect,
          });

          await tx.whatsappContact.update({
            where: { id: input.contactId },
            data: { activeExecutionId: execution.id },
          });

          return execution;
        });

        return toExecution(created);
      } catch (error) {
        if (error instanceof ContactBusyError) return null;
        throw error;
      }
    },

    async claimStep(executionId, expectedToken) {
      const { count } = await prisma.flowExecution.updateMany({
        where: {
          id: executionId,
          waitToken: expectedToken,
          status: { in: LIVE_STATUSES },
        },
        data: { status: "running", waitToken: { increment: 1 } },
      });
      // Zero linhas ⇒ job obsoleto: o timeout que disparou depois da resposta, a
      // repetição do BullMQ, o job de uma execução já encerrada. Não é erro.
      if (count === 0) return null;

      const row = await prisma.flowExecution.findUnique({
        where: { id: executionId },
        select: {
          ...executionSelect,
          contact: { select: { jid: true, number: true, pushName: true } },
        },
      });
      if (!row) return null;

      return { ...toExecution(row), contact: row.contact };
    },

    async releaseStep(executionId, originalToken) {
      // O `waitToken` no WHERE é o que impede desfazer o trabalho de outro: se
      // alguém já avançou a execução desde a falha, não há o que devolver.
      await prisma.flowExecution.updateMany({
        where: { id: executionId, waitToken: originalToken + 1, finishedAt: null },
        data: { waitToken: originalToken },
      });
    },

    async saveProgress({ executionId, currentNodeId, variables, stepCount }) {
      await prisma.flowExecution.update({
        where: { id: executionId },
        data: { currentNodeId, variables, stepCount },
      });
    },

    async suspend({ executionId, status, currentNodeId, variables, stepCount, expiresAt }) {
      await prisma.flowExecution.update({
        where: { id: executionId },
        data: { status, currentNodeId, variables, stepCount, expiresAt },
      });
    },

    async finish({ executionId, status, error }) {
      await prisma.$transaction([
        // `finishedAt: null` no WHERE: o listener de falha do BullMQ pode chegar
        // depois de o fluxo ter terminado sozinho, e um `failed` tardio não pode
        // reescrever um `completed` legítimo.
        prisma.flowExecution.updateMany({
          where: { id: executionId, finishedAt: null },
          data: { status, error: error ?? null, finishedAt: new Date() },
        }),
        // Libera o contato — mas só se ele ainda for desta execução. Uma
        // conversa nova já iniciada não pode ser desarmada por um encerramento
        // atrasado da anterior.
        prisma.whatsappContact.updateMany({
          where: { activeExecutionId: executionId },
          data: { activeExecutionId: null },
        }),
      ]);
    },

    async recordInbound({ executionId, kind, text, externalId, consumed }) {
      const { count } = await prisma.executionMessage.createMany({
        data: {
          executionId,
          direction: "in",
          kind,
          text,
          externalId,
          consumedAt: consumed ? new Date() : null,
        },
        // O @@unique([executionId, externalId]) fecha a deduplicação dentro da
        // execução: uma redelivery do Rabbit não vira mensagem repetida.
        skipDuplicates: true,
      });
      return count === 1;
    },

    async recordOutbound({ executionId, text, externalId, nodeId }) {
      await prisma.executionMessage.create({
        data: {
          executionId,
          direction: "out",
          kind: "text",
          text,
          externalId,
          nodeId,
          // O que o bot disse nunca está "no buffer": só entrada é consumível.
          consumedAt: new Date(),
        },
      });
    },

    async drainInbox(executionId) {
      return prisma.$transaction(async (tx) => {
        const messages = await tx.executionMessage.findMany({
          where: {
            executionId,
            direction: "in",
            // Só texto: uma foto fica no histórico e não retoma uma espera
            // (spec 008 §3), então ela nunca entra no que o bloco recebe.
            kind: "text",
            consumedAt: null,
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, text: true, externalId: true },
        });
        if (messages.length === 0) return [];

        await tx.executionMessage.updateMany({
          where: { id: { in: messages.map((message) => message.id) } },
          data: { consumedAt: new Date() },
        });

        return messages.map((message) => ({
          id: message.id,
          text: message.text ?? "",
          externalId: message.externalId,
        }));
      });
    },

    async findExpired(now, limit) {
      return prisma.flowExecution.findMany({
        where: { status: { in: LIVE_STATUSES }, expiresAt: { lte: now } },
        take: limit,
        orderBy: { expiresAt: "asc" },
        select: { id: true, waitToken: true, expiresAt: true },
      });
    },
  };
}
