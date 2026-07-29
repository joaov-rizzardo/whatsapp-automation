import type { FlowDocument } from "../automations/flow.schema.js";
import type { InboundMessage } from "../inbound-messages/inbound-messages.types.js";
import type {
  ClaimedExecution,
  ContactRecord,
  ExecutionRecord,
  ExecutionStatus,
  FlowRuntimeRepository,
  InboundBufferMessage,
} from "./flow-runtime.repository.js";
import type {
  MessageDeduplicator,
  MessageGateway,
  PublishedFlowLookup,
  ScheduledJob,
  Scheduler,
} from "./flow-runtime.types.js";
import type { TriggerCandidate } from "./trigger-matcher.js";

/**
 * Os dublês do motor. Ficam num arquivo próprio (e não dentro do `.test.ts`)
 * porque o teste do serviço e o do worker precisam dos mesmos — e um dublê
 * duplicado é a forma mais silenciosa de dois testes passarem a testar coisas
 * diferentes.
 *
 * O repositório falso é in-memory de propósito: o que ele NÃO consegue provar
 * (as duas corridas) é exatamente o que `flow-runtime.repository.test.ts` prova
 * contra o PostgreSQL real.
 */

type StoredMessage = {
  id: string;
  executionId: string;
  direction: "in" | "out";
  kind: "text" | "unsupported";
  text: string | null;
  externalId: string | null;
  nodeId: string | null;
  consumedAt: Date | null;
  sequence: number;
};

export interface FakeRepository extends FlowRuntimeRepository {
  contacts: Map<string, ContactRecord>;
  executions: Map<string, ExecutionRecord>;
  messages: StoredMessage[];
  finished: Array<{ executionId: string; status: string; error?: string }>;
  seedContact(contact: Partial<ContactRecord>): ContactRecord;
}

export function createFakeRepository(): FakeRepository {
  const contacts = new Map<string, ContactRecord>();
  const executions = new Map<string, ExecutionRecord>();
  const messages: StoredMessage[] = [];
  const finished: Array<{ executionId: string; status: string; error?: string }> = [];
  let sequence = 0;

  function nextId(prefix: string): string {
    sequence += 1;
    return `${prefix}-${sequence}`;
  }

  const repository: FakeRepository = {
    contacts,
    executions,
    messages,
    finished,

    seedContact(overrides) {
      const contact: ContactRecord = {
        id: overrides.id ?? nextId("contact"),
        organizationId: overrides.organizationId ?? "org-1",
        jid: overrides.jid ?? "5511999999999@s.whatsapp.net",
        number: overrides.number ?? "5511999999999",
        pushName: overrides.pushName ?? "João",
        activeExecutionId: overrides.activeExecutionId ?? null,
      };
      contacts.set(contact.id, contact);
      return contact;
    },

    async touchContact({ organizationId, jid, number, pushName }) {
      const existing = [...contacts.values()].find(
        (contact) => contact.organizationId === organizationId && contact.jid === jid,
      );
      if (existing) {
        if (pushName) existing.pushName = pushName;
        return { contact: existing, isFirstContact: false };
      }
      const contact: ContactRecord = {
        id: nextId("contact"),
        organizationId,
        jid,
        number,
        pushName,
        activeExecutionId: null,
      };
      contacts.set(contact.id, contact);
      return { contact, isFirstContact: true };
    },

    async findContactById(contactId) {
      return contacts.get(contactId) ?? null;
    },

    async findExecutionById(executionId) {
      return executions.get(executionId) ?? null;
    },

    async startExecution(input) {
      const contact = contacts.get(input.contactId);
      if (!contact || contact.activeExecutionId !== null) return null;

      const execution: ExecutionRecord = {
        id: nextId("exec"),
        organizationId: input.organizationId,
        contactId: input.contactId,
        automationId: input.automationId,
        flowVersionId: input.flowVersionId,
        status: "running",
        currentNodeId: input.currentNodeId,
        waitToken: 0,
        stepCount: 0,
        variables: input.variables,
        expiresAt: input.expiresAt,
      };
      executions.set(execution.id, execution);
      contact.activeExecutionId = execution.id;
      return execution;
    },

    async claimStep(executionId, expectedToken) {
      const execution = executions.get(executionId);
      if (!execution) return null;
      if (execution.waitToken !== expectedToken) return null;
      if (!["running", "waiting", "sleeping"].includes(execution.status)) return null;

      execution.waitToken += 1;
      execution.status = "running";

      const contact = contacts.get(execution.contactId);
      const claimed: ClaimedExecution = {
        ...execution,
        contact: {
          jid: contact?.jid ?? "",
          number: contact?.number ?? "",
          pushName: contact?.pushName ?? null,
        },
      };
      return claimed;
    },

    async releaseStep(executionId, originalToken) {
      const execution = executions.get(executionId);
      if (!execution) return;
      if (execution.waitToken !== originalToken + 1) return;
      execution.waitToken = originalToken;
    },

    async saveProgress({ executionId, currentNodeId, variables, stepCount }) {
      const execution = executions.get(executionId);
      if (!execution) return;
      execution.currentNodeId = currentNodeId;
      execution.variables = variables;
      execution.stepCount = stepCount;
    },

    async suspend({ executionId, status, currentNodeId, variables, stepCount, expiresAt }) {
      const execution = executions.get(executionId);
      if (!execution) return;
      execution.status = status;
      execution.currentNodeId = currentNodeId;
      execution.variables = variables;
      execution.stepCount = stepCount;
      execution.expiresAt = expiresAt;
    },

    async finish({ executionId, status, error }) {
      const execution = executions.get(executionId);
      if (!execution) return;
      // O falso espelha o WHERE do repositório real: quem já terminou não
      // termina de novo, e o contato só é solto se ainda for desta execução.
      if (["completed", "failed", "expired"].includes(execution.status)) return;

      execution.status = status as ExecutionStatus;
      finished.push({ executionId, status, error });

      for (const contact of contacts.values()) {
        if (contact.activeExecutionId === executionId) contact.activeExecutionId = null;
      }
    },

    async recordInbound({ executionId, kind, text, externalId, consumed }) {
      const duplicate = messages.some(
        (message) =>
          message.executionId === executionId && message.externalId === externalId,
      );
      if (duplicate) return false;

      sequence += 1;
      messages.push({
        id: nextId("msg"),
        executionId,
        direction: "in",
        kind,
        text,
        externalId,
        nodeId: null,
        consumedAt: consumed ? new Date() : null,
        sequence,
      });
      return true;
    },

    async recordOutbound({ executionId, text, externalId, nodeId }) {
      sequence += 1;
      messages.push({
        id: nextId("msg"),
        executionId,
        direction: "out",
        kind: "text",
        text,
        externalId,
        nodeId,
        consumedAt: new Date(),
        sequence,
      });
    },

    async drainInbox(executionId) {
      const pending = messages
        .filter(
          (message) =>
            message.executionId === executionId &&
            message.direction === "in" &&
            message.kind === "text" &&
            message.consumedAt === null,
        )
        .sort((a, b) => a.sequence - b.sequence);

      const drained: InboundBufferMessage[] = pending.map((message) => {
        message.consumedAt = new Date();
        return {
          id: message.id,
          text: message.text ?? "",
          externalId: message.externalId,
        };
      });
      return drained;
    },

    async findExpired(now) {
      return [...executions.values()]
        .filter(
          (execution) =>
            ["running", "waiting", "sleeping"].includes(execution.status) &&
            execution.expiresAt.getTime() <= now.getTime(),
        )
        .map((execution) => ({
          id: execution.id,
          waitToken: execution.waitToken,
          expiresAt: execution.expiresAt,
        }));
    },
  };

  return repository;
}

export interface FakeScheduler extends Scheduler {
  jobs: ScheduledJob[];
  byName(name: ScheduledJob["name"]): ScheduledJob[];
  clear(): void;
}

export function createFakeScheduler(): FakeScheduler {
  const jobs: ScheduledJob[] = [];
  return {
    jobs,
    byName: (name) => jobs.filter((job) => job.name === name),
    clear: () => {
      jobs.length = 0;
    },
    async schedule(job) {
      jobs.push(job);
    },
  };
}

export interface FakeGateway extends MessageGateway {
  sent: Array<{ organizationId: string; number: string; text: string; delayMs?: number }>;
  failNext(error: Error): void;
}

export function createFakeGateway(): FakeGateway {
  const sent: FakeGateway["sent"] = [];
  let pendingError: Error | null = null;
  let counter = 0;

  return {
    sent,
    failNext(error) {
      pendingError = error;
    },
    async sendText(params) {
      if (pendingError) {
        const error = pendingError;
        pendingError = null;
        throw error;
      }
      sent.push(params);
      counter += 1;
      return { externalId: `out-${counter}` };
    },
  };
}

/** Deduplicador que só recusa o que já viu — o mesmo contrato do Redis. */
export function createFakeDeduplicator(): MessageDeduplicator {
  const seen = new Set<string>();
  return {
    async markSeen(organizationId, externalId) {
      const key = `${organizationId}:${externalId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
  };
}

export interface FakeFlowLookup extends PublishedFlowLookup {
  publish(candidate: TriggerCandidate, document: FlowDocument): void;
}

export function createFakeFlowLookup(): FakeFlowLookup {
  const candidates: TriggerCandidate[] = [];
  const documents = new Map<string, FlowDocument>();

  return {
    publish(candidate, document) {
      candidates.push(candidate);
      documents.set(candidate.id, document);
    },
    async findTriggerCandidates(organizationId) {
      return candidates.filter(() => organizationId !== "");
    },
    async findVersionDocument(versionId) {
      return documents.get(versionId) ?? null;
    },
  };
}

export function inboundMessage(
  overrides: Partial<InboundMessage> = {},
): InboundMessage {
  return {
    organizationId: "org-1",
    instanceName: "acme",
    externalId: `ext-${Math.random().toString(36).slice(2)}`,
    chatJid: "5511999999999@s.whatsapp.net",
    senderJid: "5511999999999@s.whatsapp.net",
    senderNumber: "5511999999999",
    senderName: "João",
    fromMe: false,
    isGroup: false,
    timestamp: new Date("2026-07-29T12:00:00Z"),
    content: { kind: "text", text: "oi" },
    ...overrides,
  };
}
