import { ValidationError } from "../../shared/errors.js";
import { parseInboundData } from "./inbound-messages.schema.js";
import type {
  InboundContent,
  NormalizedMessage,
} from "./inbound-messages.types.js";
import {
  METADATA_KEYS,
  WRAPPER_KEYS,
  resolveParser,
} from "./parsers/registry.js";

const GROUP_SUFFIX = "@g.us";

/** How many wrappers deep to follow before giving up — guards a cyclic payload. */
const MAX_UNWRAP_DEPTH = 5;

/**
 * Follows the wrapper keys (`ephemeralMessage`, `viewOnceMessage`, …) down to
 * the node that actually holds the content.
 */
function unwrap(message: Record<string, unknown>): Record<string, unknown> {
  let current = message;

  for (let depth = 0; depth < MAX_UNWRAP_DEPTH; depth += 1) {
    const wrapperKey = Object.keys(current).find((key) => WRAPPER_KEYS.has(key));
    if (!wrapperKey) return current;

    const inner = (current[wrapperKey] as Record<string, unknown> | undefined)
      ?.message;
    if (typeof inner !== "object" || inner === null) return current;

    current = inner as Record<string, unknown>;
  }

  return current;
}

/**
 * Picks the content out of `data.message`, which is an object whose KEY names
 * the type. Metadata keys are skipped: the capture proved they can come first,
 * so reading `Object.keys(message)[0]` would read the wrong one.
 *
 * A key with no parser — or a parser that cannot read its node — becomes
 * `unsupported`, carrying the raw key. That is not an error: it is a real
 * message of a type this backend does not implement yet, and the raw key names
 * exactly which parser file to write next.
 */
function resolveContent(message: Record<string, unknown>): InboundContent {
  const node = unwrap(message);
  const contentKeys = Object.keys(node).filter((key) => !METADATA_KEYS.has(key));

  for (const key of contentKeys) {
    const parsed = resolveParser(key)?.parse(node[key]);
    if (parsed) return parsed;
  }

  return { kind: "unsupported", rawType: contentKeys[0] ?? "unknown" };
}

/**
 * Turns one hostile MESSAGES_UPSERT `data` into our own shape. Pure: no I/O, no
 * clock, no database — which is what makes it the piece with the most tests.
 *
 * It does NOT take an organizationId: it runs before the service resolves one,
 * so the cheap filters can drop an echo without a query. The service attaches
 * the organization afterwards, resolved from the instance name — the payload
 * never gets to say whose data this is (the golden rule).
 */
export function normalizeInboundMessage(
  instanceName: string,
  data: unknown,
): NormalizedMessage {
  const parsed = parseInboundData(data);
  const key = parsed.key;

  const chatJid = key.remoteJid;
  const isGroup = chatJid.endsWith(GROUP_SUFFIX);

  // Captured as "" in a 1:1 — an empty participant means the chat itself is the
  // sender, so it must be treated as absent, not as an empty JID.
  const participant = key.participant;
  const senderJid =
    participant && participant.length > 0 ? participant : chatJid;

  const senderNumber = senderJid.split("@")[0] ?? senderJid;

  const timestampSeconds = Number(parsed.messageTimestamp);
  if (!Number.isFinite(timestampSeconds)) {
    throw new ValidationError("Mensagem sem messageTimestamp utilizável");
  }

  return {
    instanceName,
    externalId: key.id,
    chatJid,
    senderJid,
    senderNumber,
    senderName: parsed.pushName ?? null,
    fromMe: key.fromMe ?? false,
    isGroup,
    timestamp: new Date(timestampSeconds * 1000),
    content: resolveContent(parsed.message as Record<string, unknown>),
  };
}
