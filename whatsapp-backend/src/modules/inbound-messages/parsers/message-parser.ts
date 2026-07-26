import type { InboundContent } from "../inbound-messages.types.js";

/**
 * The contract of the inbound-message registry — the same idea as the block
 * registry (`modules/automations/blocks/`), applied to the other axis: there a
 * type is something the user can place in a flow, here it is something a
 * contact can send.
 *
 * A message type is ONE file. Adding image support is this file's shape, a new
 * member in InboundContent, and a line in the parsers array — no change to the
 * consumer, the service or the normalizer. If a type ever forces a change in
 * one of those three, the design failed.
 */
export interface MessageParser {
  /**
   * The keys of `data.message` this parser owns. Plural because one type can
   * arrive under more than one key — text is both `conversation` (plain) and
   * `extendedTextMessage` (with a quote or a link preview).
   */
  readonly types: readonly string[];

  /**
   * Layer 3 of the validation (spec 007 §4.6): the node under the key this
   * parser owns. Deliberately NOT a JSON Schema — the shape varies per type and
   * we do not control it, so a strict schema would reject legitimate messages.
   * Read what you need, defensively, and return `null` when the node is
   * unusable; the caller reports that as an unsupported type rather than an
   * error, because a message we cannot read is not a message that failed.
   */
  parse(node: unknown): InboundContent | null;
}
