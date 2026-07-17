"use client";

import type { WhatsappConnectionStatus } from "@/features/whatsapp/types/connectionStatus";

type WhatsappConnection = {
  status: WhatsappConnectionStatus;
  isLoading: boolean;
};

/**
 * Placeholder until the Evolution API integration exists. There is no backend
 * endpoint for connection status yet, so this reports "disconnected" rather than
 * inventing a value. When the endpoint lands this becomes a React Query hook
 * (server state on the client) polling the instance's connection state, and the
 * component below does not change.
 */
export function useWhatsappConnection(): WhatsappConnection {
  return { status: "disconnected", isLoading: false };
}
