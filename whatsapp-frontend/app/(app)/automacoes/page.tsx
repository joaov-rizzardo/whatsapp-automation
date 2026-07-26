import { AutomationsView } from "@/features/automations/components/AutomationsView";

/**
 * Lista de automações. Server component fino, gated pelo layout do grupo (app);
 * a tela inteira é uma ilha client porque ainda não há API — a lista vive em
 * estado local sobre dados mockados.
 */
export default function AutomacoesPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <AutomationsView />
    </main>
  );
}
