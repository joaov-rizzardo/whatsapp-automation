import { z } from "zod";

export const connectionStatusSchema = z.enum(["connecting", "open", "close"]);
export const connectionMethodSchema = z.enum(["qrcode", "pairing"]);

/**
 * The GET/POST response. The whole object is nullable — the API returns `null`
 * when the organization never connected. Mirrors the backend response schema.
 */
export const connectionSchema = z
  .object({
    status: connectionStatusSchema,
    method: connectionMethodSchema,
    qrCode: z.string().nullable(),
    pairingCode: z.string().nullable(),
    phoneNumber: z.string().nullable(),
  })
  .nullable();

export type Connection = z.infer<typeof connectionSchema>;
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
export type ConnectionMethod = z.infer<typeof connectionMethodSchema>;

/** Digits with DDI (e.g. 5511999998888). Strips mask characters first. */
const phoneNumberSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(
    z
      .string()
      .min(10, "Informe um número válido com DDD.")
      .max(15, "Número muito longo."),
  );

/**
 * The POST body. `phoneNumber` is required and validated only for pairing —
 * ignored for QR. Client validation is UX; the backend revalidates.
 */
export const connectInputSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("qrcode") }),
  z.object({ method: z.literal("pairing"), phoneNumber: phoneNumberSchema }),
]);

export type ConnectInput = z.infer<typeof connectInputSchema>;
