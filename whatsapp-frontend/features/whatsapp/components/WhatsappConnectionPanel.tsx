"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { WhatsappConnectionCard } from "@/features/whatsapp/components/WhatsappConnectionCard";
import { useWhatsappConnection } from "@/features/whatsapp/hooks/useWhatsappConnection";

/**
 * Container: holds the hook and delegates rendering to the card. The card is
 * presentational; this is the one component allowed to call the data hook.
 */
export function WhatsappConnectionPanel() {
  const {
    connection,
    isLoading,
    connect,
    disconnect,
    isConnecting,
    isDisconnecting,
  } = useWhatsappConnection();

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <WhatsappConnectionCard
      connection={connection}
      onConnect={connect}
      onDisconnect={disconnect}
      isBusy={isConnecting || isDisconnecting}
    />
  );
}
