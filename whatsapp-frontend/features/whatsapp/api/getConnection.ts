import {
  connectionSchema,
  type Connection,
} from "@/features/whatsapp/schemas/connectionSchema";

/**
 * Reads the organization's WhatsApp connection. `credentials: "include"` so the
 * session cookie reaches the other origin (:3333). Returns `null` when the
 * organization never connected.
 */
export async function getConnection(): Promise<Connection> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp/connection`,
    { credentials: "include" },
  );

  if (!response.ok) {
    throw new Error("Não foi possível carregar a conexão do WhatsApp.");
  }

  return connectionSchema.parse(await response.json());
}
