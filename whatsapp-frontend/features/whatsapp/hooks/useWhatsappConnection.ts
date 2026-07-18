"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createConnection } from "@/features/whatsapp/api/createConnection";
import { deleteConnection } from "@/features/whatsapp/api/deleteConnection";
import { getConnection } from "@/features/whatsapp/api/getConnection";
import type {
  Connection,
  ConnectInput,
} from "@/features/whatsapp/schemas/connectionSchema";

const connectionKey = ["whatsapp", "connection"] as const;

/**
 * Server state for the organization's WhatsApp connection — the first
 * client-side data feature in the app (spec 003). The source of truth is our own
 * table, updated by the worker from Evolution's RabbitMQ events, so the UI just
 * polls it while connecting: no WebSocket, no polling against Evolution.
 */
export function useWhatsappConnection() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: connectionKey,
    queryFn: getConnection,
    // Poll only while connecting; once open/close there is nothing to wait for.
    // The same event (CONNECTION_UPDATE) resolves both QR and pairing.
    refetchInterval: (q) =>
      q.state.data?.status === "connecting" ? 3000 : false,
  });

  const write = (connection: Connection) =>
    queryClient.setQueryData(connectionKey, connection);

  const connectMutation = useMutation({
    mutationFn: (input: ConnectInput) => createConnection(input),
    onSuccess: write,
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: deleteConnection,
    onSuccess: () => write(null),
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    connection: query.data ?? null,
    isLoading: query.isLoading,
    connect: connectMutation.mutate,
    disconnect: disconnectMutation.mutate,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };
}
