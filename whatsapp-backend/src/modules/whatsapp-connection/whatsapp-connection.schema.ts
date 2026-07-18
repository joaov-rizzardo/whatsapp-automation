import type { FromSchema } from "json-schema-to-ts";

/** The connection lifecycle we track, mirrored from the Baileys states. */
export type ConnectionStatus = "connecting" | "open" | "close";
/** Which method the user last asked for. */
export type ConnectionMethod = "qrcode" | "pairing";

/**
 * POST body — the only payload the module accepts. `method` is always required;
 * `phoneNumber` is required only for `pairing`, which the service enforces (a
 * conditional-required is awkward in plain JSON Schema, and the service is the
 * authority anyway). `organizationId` is NEVER here — it comes from the session.
 */
export const connectBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["method"],
  properties: {
    method: { type: "string", enum: ["qrcode", "pairing"] },
    // Digits with DDI (e.g. 5511999998888). Normalized to digits by the service.
    phoneNumber: { type: "string", minLength: 8, maxLength: 20 },
  },
} as const;

export type ConnectInput = FromSchema<typeof connectBodySchema>;

/**
 * Response shape. Exposes only the safe fields — `instanceName` never leaves the
 * server (same rationale as me.routes). GET returns this or `null` (never
 * connected).
 */
export const connectionResponseSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  required: ["status", "method", "qrCode", "pairingCode", "phoneNumber"],
  properties: {
    status: { type: "string", enum: ["connecting", "open", "close"] },
    method: { type: "string", enum: ["qrcode", "pairing"] },
    qrCode: { type: ["string", "null"] },
    pairingCode: { type: ["string", "null"] },
    phoneNumber: { type: ["string", "null"] },
  },
} as const;
