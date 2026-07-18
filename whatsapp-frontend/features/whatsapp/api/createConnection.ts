import {
  connectionSchema,
  type Connection,
  type ConnectInput,
} from "@/features/whatsapp/schemas/connectionSchema";

/**
 * Starts (or refreshes) the connection. The body is `{ method, phoneNumber? }` —
 * never an organization id, which the backend takes from the session.
 */
export async function createConnection(
  input: ConnectInput,
): Promise<Connection> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp/connection`,
    {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error("Não foi possível iniciar a conexão do WhatsApp.");
  }

  return connectionSchema.parse(await response.json());
}
