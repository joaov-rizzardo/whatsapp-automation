import { Ajv, type ValidateFunction } from "ajv";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

import { ValidationError } from "../../shared/errors.js";

/**
 * Layer 2 of the payload validation (spec 007 §4.6): the core of `data`, which
 * is the one shape every message shares regardless of its type.
 *
 * Shaped from payloads captured against the live broker on 2026-07-26 — see
 * docs/evolution/05-webhooks.md. Two rules the schema follows deliberately:
 *
 * 1. `additionalProperties: true` everywhere. The captured payload already
 *    carries fields we do not read (`remoteJidAlt`, `addressingMode`, `status`,
 *    `instanceId`, `source`), and a newer Evolution will add more. Rejecting a
 *    message over a field we ignore would turn an upgrade into an outage.
 * 2. `required` only on what we actually read. If a field decides nothing, its
 *    absence is not an error.
 *
 * A failure here is permanent (ValidationError -> dead letter), because no
 * amount of retrying fixes a payload we cannot read.
 */
export const inboundDataSchema = {
  type: "object",
  additionalProperties: true,
  required: ["key", "message"],
  properties: {
    key: {
      type: "object",
      additionalProperties: true,
      required: ["id", "remoteJid"],
      properties: {
        id: { type: "string", minLength: 1 },
        remoteJid: { type: "string", minLength: 1 },
        /** Absent in some payloads; absent means "not from us". */
        fromMe: { type: "boolean" },
        /**
         * The real author in a group. Captured as an EMPTY STRING in a 1:1 —
         * not absent — so the normalizer treats "" as "no participant".
         */
        participant: { type: "string" },
      },
    },
    /** The one-key-per-type object. Its contents are layer 3, owned by parsers. */
    message: { type: "object", additionalProperties: true },
    pushName: { type: "string" },
    /**
     * Captured as a plain integer (seconds since epoch). String is accepted too
     * because this very payload proves Evolution serializes 64-bit values
     * inconsistently — `messageContextInfo` carries `{low, high, unsigned}`
     * objects for its own timestamps.
     */
    messageTimestamp: { type: ["integer", "string"] },
  },
} as const satisfies JSONSchema;

export type InboundData = FromSchema<typeof inboundDataSchema>;

// One instance, compiled once at boot — the same reason the block registry
// compiles its validators there: this runs per message, not per deploy.
const ajv = new Ajv({ allErrors: false, strict: false });
const validate: ValidateFunction = ajv.compile(inboundDataSchema);

/**
 * Validates the `data` of a MESSAGES_UPSERT and narrows it. Throws
 * ValidationError — which the queue runner maps to a dead letter — so callers
 * downstream can read the fields without re-checking each one.
 */
export function parseInboundData(data: unknown): InboundData {
  if (validate(data)) return data as InboundData;

  const [error] = validate.errors ?? [];
  const path = error?.instancePath ? `${error.instancePath} ` : "";
  throw new ValidationError(
    `Payload de mensagem inválido: ${path}${error?.message ?? "formato inesperado"}`,
  );
}
