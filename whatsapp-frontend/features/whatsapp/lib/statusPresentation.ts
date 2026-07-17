import type { WhatsappConnectionStatus } from "@/features/whatsapp/types/connectionStatus";

type StatusPresentation = {
  label: string;
  /** Tailwind classes for the status dot fill. */
  dotClassName: string;
  /** Whether the dot should pulse (transient states). */
  pulse: boolean;
};

const PRESENTATION: Record<WhatsappConnectionStatus, StatusPresentation> = {
  connected: { label: "Conectado", dotClassName: "bg-success", pulse: false },
  connecting: { label: "Conectando…", dotClassName: "bg-warning", pulse: true },
  disconnected: { label: "Desconectado", dotClassName: "bg-danger", pulse: false },
};

export function statusPresentation(
  status: WhatsappConnectionStatus,
): StatusPresentation {
  return PRESENTATION[status];
}
