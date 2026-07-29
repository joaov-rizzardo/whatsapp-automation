import type { Logger } from "../../lib/logger/logger.js";
import { NotFoundError } from "../../shared/errors.js";
import { normalizeInboundMessage } from "./inbound-messages.normalizer.js";
import type {
  IgnoreReason,
  InboundMessage,
  InboundResult,
  NormalizedMessage,
} from "./inbound-messages.types.js";

/**
 * When a number connects, Baileys replays history. Without this cut, the first
 * QR scan would dump months of conversation — and, once the engine exists,
 * would fire flows for messages answered long ago.
 */
const MAX_MESSAGE_AGE_SECONDS = 300;

const BROADCAST_JIDS = new Set(["status@broadcast"]);
const BROADCAST_SUFFIX = "@broadcast";

/**
 * The one thing this module needs from the WhatsApp connection: which
 * organization owns an instance. Declared as the minimal port it uses rather
 * than importing another module's repository — `WhatsappConnectionRepository`
 * satisfies it structurally, and a test satisfies it with a one-line object.
 */
export interface ConnectionLookup {
  findByInstanceName(
    instanceName: string,
  ): Promise<{ organizationId: string } | null>;
}

/**
 * Where a processed message goes next. Declared as a port so this module never
 * learns that a flow engine exists — the composition root wires the two, and
 * the consumer keeps calling exactly one service ("one consumer, one service").
 *
 * Optional on purpose: the module is still complete without it, and its tests
 * do not need a fake engine to assert normalization and filtering.
 */
export interface InboundMessageSink {
  handle(message: InboundMessage): Promise<void>;
}

/**
 * The business rules for a message arriving at a connected number. Framework
 * agnostic (it takes its dependencies in the constructor and never imports
 * fastify), because it is driven from the worker process by a queue consumer.
 *
 * It normalizes, filters, and hands what is left to the sink — the flow engine
 * (spec 008), which decides whether any automation answers it.
 */
export class InboundMessageService {
  constructor(
    private readonly connections: ConnectionLookup,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
    private readonly sink?: InboundMessageSink,
  ) {}

  /**
   * Traffic that is normal but not for us. Every one of these is acked and
   * logged at debug — none of them is an error.
   */
  private classifyIgnorable(message: NormalizedMessage): IgnoreReason | null {
    // MESSAGES_UPSERT includes what the connected number itself sent. A bot
    // that answers everything answers itself, in a loop (armadilha #4).
    if (message.fromMe) return "from-me";
    if (message.isGroup) return "group";
    if (
      BROADCAST_JIDS.has(message.chatJid) ||
      message.chatJid.endsWith(BROADCAST_SUFFIX)
    ) {
      return "broadcast";
    }

    const ageSeconds =
      (this.now().getTime() - message.timestamp.getTime()) / 1000;
    if (ageSeconds > MAX_MESSAGE_AGE_SECONDS) return "too-old";

    return null;
  }

  /**
   * Called by the inbound-messages consumer, not by HTTP. `data` is hostile
   * broker input: it is validated by the schema (permanent failure -> dead
   * letter) before anything reads a field off it.
   *
   * The order of the steps is chosen by cost: the pure filters run before the
   * database lookup, so an echo never costs a query.
   */
  async handleInboundMessage(
    instanceName: string,
    data: unknown,
  ): Promise<InboundResult> {
    const normalized = normalizeInboundMessage(instanceName, data);

    const ignoreReason = this.classifyIgnorable(normalized);
    if (ignoreReason) {
      this.logger.debug(
        { instanceName, reason: ignoreReason, kind: normalized.content.kind },
        "inbound message ignored",
      );
      return { status: "ignored", reason: ignoreReason };
    }

    // The instance is resolved to OUR row by name only — the payload never
    // chooses the organization. An unknown one is permanent (-> dead letter).
    const connection = await this.connections.findByInstanceName(instanceName);
    if (!connection) {
      throw new NotFoundError(`Instância desconhecida: ${instanceName}`);
    }

    const message = { ...normalized, organizationId: connection.organizationId };

    // No PII: the conversation is inspectable in `execution_message` since spec
    // 008, which is exactly the condition spec 007 §4.7 set for dropping the
    // temporary exception that used to log the number, name and text here.
    this.logger.info(
      {
        instanceName,
        kind: message.content.kind,
        externalId: message.externalId,
        rawType:
          message.content.kind === "unsupported"
            ? message.content.rawType
            : undefined,
      },
      message.content.kind === "text"
        ? "inbound message received"
        : "inbound message received (tipo ainda não suportado)",
    );

    // Last, and outside any try/catch: a failure here must reach the consumer,
    // which nacks so the broker redelivers. Swallowing it would drop a real
    // message silently, which is the one outcome worse than a dead letter.
    await this.sink?.handle(message);

    return { status: "processed", message };
  }
}
