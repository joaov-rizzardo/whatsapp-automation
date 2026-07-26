import type { MessageParser } from "./message-parser.js";

/**
 * Plain text.
 *
 * ONE key, not two. Raw Baileys splits text into `conversation` (plain) and
 * `extendedTextMessage` (quote or link preview), but Evolution v2.3.7 flattens
 * the second: it hoists the quote out to `data.contextInfo` — a sibling of
 * `message` — and leaves the text in `message.conversation`. Captured
 * 2026-07-26 by replying with a quote and by sending links: neither produced an
 * `extendedTextMessage` key. See docs/evolution/05-webhooks.md.
 *
 * So a quoted reply lands here like any other text, and the thing a quote adds
 * (which message it answers) lives outside this node entirely. The engine spec
 * is where that becomes useful — reading it now would be data with no consumer.
 */
export const textParser: MessageParser = {
  types: ["conversation"],

  parse(node) {
    const text = typeof node === "string" ? node : null;
    // An empty string is not usable content — report it as unreadable rather
    // than emitting a text message with nothing in it.
    return text && text.length > 0 ? { kind: "text", text } : null;
  },
};
