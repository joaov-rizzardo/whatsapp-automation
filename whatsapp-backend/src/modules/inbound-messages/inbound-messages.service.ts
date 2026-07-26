import type { Logger } from "../../lib/logger/logger.js";
import { NotFoundError } from "../../shared/errors.js";
import { normalizeInboundMessage } from "./inbound-messages.normalizer.js";
import type {
  IgnoreReason,
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
 * The business rules for a message arriving at a connected number. Framework
 * agnostic (it takes its dependencies in the constructor and never imports
 * fastify), because it is driven from the worker process by a queue consumer.
 *
 * Today it normalizes, filters and logs. The execution engine plugs in at the
 * end of `handleInboundMessage`, where an InboundMessage is already resolved.
 */
export class InboundMessageService {
  constructor(
    private readonly connections: ConnectionLookup,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
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

    this.logger.info(
      {
        instanceName,
        kind: message.content.kind,
        // PII — temporário (spec 007 §4.7). Sem número, nome e texto não há como
        // verificar que a mensagem certa chegou, que é o objetivo desta etapa.
        // Isto sai quando a persistência entrar e o conteúdo for inspecionável
        // no banco; o log volta a ser { instanceName, kind, externalId }.
        from: message.senderNumber,
        name: message.senderName,
        text: message.content.kind === "text" ? message.content.text : undefined,
        rawType:
          message.content.kind === "unsupported"
            ? message.content.rawType
            : undefined,
      },
      message.content.kind === "text"
        ? "inbound message received"
        : "inbound message received (tipo ainda não suportado)",
    );

    return { status: "processed", message };
  }
}
