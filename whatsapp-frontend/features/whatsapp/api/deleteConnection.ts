/**
 * Disconnects the number: the backend logs out and deletes the Evolution
 * instance and our row, freeing the organization to connect again.
 */
export async function deleteConnection(): Promise<void> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp/connection`,
    { method: "DELETE", credentials: "include" },
  );

  if (!response.ok) {
    throw new Error("Não foi possível desconectar o WhatsApp.");
  }
}
