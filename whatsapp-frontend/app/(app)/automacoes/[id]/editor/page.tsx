import { FlowEditor } from "@/features/flows/components/FlowEditor";

/**
 * Editor de fluxos de uma automação. A rota já carrega o id na URL, mas o editor
 * ainda é client-side puro e sem persistência: nada é carregado nem salvo por id
 * até a spec de persistência entrar.
 */
export default function AutomationEditorPage() {
  return (
    <div className="h-full w-full">
      <FlowEditor />
    </div>
  );
}
