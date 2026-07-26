/**
 * The contract for a message that arrived at a connected number.
 *
 * This is written as engine input, not as a log line: the next spec matches an
 * InboundMessage against the trigger of the organization's published flow
 * versions, which is why it carries `externalId`, `chatJid` and `timestamp`
 * even though today's handler only logs a few of those fields.
 */

/**
 * The content, by type. Adding a type is: one member here, one parser file, one
 * line in the parsers array — nothing else, anywhere.
 *
 * A discriminated union (rather than `type: string` + `payload: unknown`) is
 * what makes the compiler demand that each new type be handled, instead of
 * letting it fall through some `default` branch unnoticed.
 */
export type InboundContent =
  | { kind: "text"; text: string }
  /**
   * A first-class content type, not an error: a real message whose type this
   * backend cannot read yet. `rawType` is the Baileys key — it names exactly
   * which parser file to write next, and it is what the log shows.
   */
  | { kind: "unsupported"; rawType: string };

export interface InboundMessage {
  /** Resolved from instanceName by the service — never read from the payload. */
  organizationId: string;
  instanceName: string;
  /** data.key.id — the dedupe key for the day there is a table to dedupe in. */
  externalId: string;
  /** data.key.remoteJid — the conversation (a contact, or a group). */
  chatJid: string;
  /** Who actually wrote it: key.participant in a group, key.remoteJid otherwise. */
  senderJid: string;
  /** senderJid up to the "@" — digits with country code. */
  senderNumber: string;
  /** data.pushName — the name the sender set on their own phone. */
  senderName: string | null;
  /** True for messages the connected number itself sent — the echo to filter. */
  fromMe: boolean;
  isGroup: boolean;
  /** From messageTimestamp (seconds since epoch). */
  timestamp: Date;
  content: InboundContent;
}

/**
 * A message before its organization is known. The normalizer is pure and runs
 * BEFORE the database lookup — that ordering is what keeps the cheap filters
 * (echo, group, broadcast, history) from costing one query per message the bot
 * itself sends. The service adds `organizationId` once it has resolved it from
 * the instance name, which is the only way it is ever allowed in.
 */
export type NormalizedMessage = Omit<InboundMessage, "organizationId">;

/**
 * What the service reports back, so it can be asserted on by tests without
 * spying on the logger (backend CLAUDE.md: assert on behavior and output, not
 * on which functions were called). It is also where the execution engine will
 * plug in.
 */
export type InboundResult =
  | { status: "processed"; message: InboundMessage }
  | { status: "ignored"; reason: IgnoreReason };

/**
 * Why a message was dropped without processing. Every one of these is normal
 * traffic, not an error — they are acked and logged at debug.
 *
 * - `from-me`: the connected number's own messages come back on MESSAGES_UPSERT.
 *   A bot that answers everything answers itself, in a loop (armadilha #4).
 * - `group` / `broadcast`: out of scope until a spec decides bot-in-group.
 * - `too-old`: Baileys syncs history when a number connects; without this the
 *   first QR scan would replay months of conversation.
 */
export type IgnoreReason = "from-me" | "group" | "broadcast" | "too-old";
