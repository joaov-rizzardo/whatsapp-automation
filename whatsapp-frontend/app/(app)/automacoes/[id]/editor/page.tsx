import { FlowEditorPage } from "@/features/flows/components/FlowEditorPage";

/**
 * Editor de fluxos de uma automação. O id da URL é o id real da automação (um
 * cuid), e agora é ele que carrega e salva o fluxo — em Next 16 `params` é
 * assíncrono, daí o await.
 */
export default async function AutomationEditorPage({
  params,
}: PageProps<"/automacoes/[id]/editor">) {
  const { id } = await params;

  return (
    <div className="h-full w-full">
      <FlowEditorPage automationId={id} />
    </div>
  );
}
