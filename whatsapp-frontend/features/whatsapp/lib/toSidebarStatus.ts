import type { ConnectionStatus } from "@/features/whatsapp/schemas/connectionSchema";
import type { WhatsappConnectionStatus } from "@/features/whatsapp/types/connectionStatus";

/**
 * Reduces the API connection status (or its absence) to the three states the
 * sidebar dot renders. `close` and "never connected" both read as disconnected.
 */
export function toSidebarStatus(
  status: ConnectionStatus | undefined | null,
): WhatsappConnectionStatus {
  if (status === "open") return "connected";
  if (status === "connecting") return "connecting";
  return "disconnected";
}
