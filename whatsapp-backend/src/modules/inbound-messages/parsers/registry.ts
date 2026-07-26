import type { MessageParser } from "./message-parser.js";
import { textParser } from "./text.parser.js";

/**
 * The map `Baileys key -> parser`. Registering a parser here is the second half
 * of adding a message type — the first is the file — and there is no third:
 * no migration, no column, no `if` anywhere in the service.
 */
const parsers: readonly MessageParser[] = [textParser];

const byType = new Map<string, MessageParser>();

for (const parser of parsers) {
  for (const type of parser.types) {
    // Two parsers claiming one key is ambiguous — which one reads an incoming
    // message would depend on array order. Fail at boot, not in production, on
    // the day this list has eight files in it.
    if (byType.has(type)) {
      throw new Error(`Dois parsers declaram o mesmo tipo de mensagem: ${type}`);
    }
    byType.set(type, parser);
  }
}

export function resolveParser(type: string): MessageParser | null {
  return byType.get(type) ?? null;
}

/**
 * Keys that live inside `data.message` but carry no content — encryption and
 * device bookkeeping. They must be skipped when looking for the content key.
 *
 * This is not a detail: a captured payload showed `messageContextInfo` arriving
 * BEFORE `conversation`, so "take the first key" would have read the metadata
 * and reported every such message as an unsupported type.
 */
export const METADATA_KEYS: ReadonlySet<string> = new Set([
  "messageContextInfo", // captured 2026-07-26, alongside conversation
  "senderKeyDistributionMessage", // defensive: standard companion key in groups
]);

/**
 * Wrappers that nest the real message under `.message`. Unwrapping them first is
 * what keeps a disappearing-message text from being read as an unknown type —
 * it looks perfectly normal on the phone and would vanish silently here.
 *
 * Defensive, from the Baileys message shape; none of these appeared in the
 * 2026-07-26 capture, and the code is inert until one does.
 */
export const WRAPPER_KEYS: ReadonlySet<string> = new Set([
  "ephemeralMessage",
  "viewOnceMessage",
  "viewOnceMessageV2",
  "viewOnceMessageV2Extension",
  "documentWithCaptionMessage",
  "deviceSentMessage",
]);
