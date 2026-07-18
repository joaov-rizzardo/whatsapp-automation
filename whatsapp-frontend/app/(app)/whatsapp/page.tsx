import { WhatsappConnectionPanel } from "@/features/whatsapp/components/WhatsappConnectionPanel";

/**
 * Thin server component, gated by the (app) layout (session + active org). The
 * connection panel is a client island because it holds React Query state.
 */
export default function WhatsappPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">WhatsApp</h1>
        <p className="text-muted-foreground">
          Conecte um número para começar a automatizar conversas na sua
          organização.
        </p>
      </div>

      <WhatsappConnectionPanel />
    </main>
  );
}
