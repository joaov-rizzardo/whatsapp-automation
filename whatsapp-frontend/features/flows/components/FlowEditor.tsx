"use client";

import "@xyflow/react/dist/style.css";

import { useEffect, useMemo } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { toast } from "sonner";

import { useFlowEditor } from "@/features/flows/hooks/useFlowEditor";
import { useFlowPublish } from "@/features/flows/hooks/useFlowPublish";
import { EditorSidebar } from "@/features/flows/components/EditorSidebar";
import { FlowCanvas } from "@/features/flows/components/FlowCanvas";
import { FlowConflictDialog } from "@/features/flows/components/FlowConflictDialog";
import { FlowToolbar } from "@/features/flows/components/FlowToolbar";
import { FlowActionsProvider } from "@/features/flows/components/FlowActionsContext";
import { FlowVariablesProvider } from "@/features/flows/components/FlowVariablesContext";
import { NodeConfigModal } from "@/features/flows/components/NodeConfigModal";
import type { FlowResponse } from "@/features/flows/schemas/flowDocument";

/**
 * Editor root: provides the React Flow context (so the hook can use
 * `screenToFlowPosition`), imports the required React Flow CSS once, and mounts
 * sidebar + canvas + modal host.
 *
 * It receives the flow **already loaded** (spec 006) — mounting it is what arms
 * the autosave, which is why the container above never renders it before the
 * document has arrived.
 */
export function FlowEditor({ flow }: { flow: FlowResponse }) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner flow={flow} />
    </ReactFlowProvider>
  );
}

function FlowEditorInner({ flow }: { flow: FlowResponse }) {
  const editor = useFlowEditor({
    automationId: flow.automation.id,
    initialDocument: flow.document,
    initialVersion: flow.version,
  });

  const { publish, isPublishing } = useFlowPublish({
    automationId: flow.automation.id,
    flush: editor.saveNow,
  });

  // Um bloco que este app não sabe desenhar foi descartado no carregamento
  // (`deserializeFlow`). Avisar é obrigatório: salvar daqui grava o fluxo já
  // sem ele.
  const { droppedNodes } = editor;
  useEffect(() => {
    if (droppedNodes === 0) return;
    toast.warning(
      droppedNodes === 1
        ? "1 bloco desta automação não existe mais nesta versão do app"
        : `${droppedNodes} blocos desta automação não existem mais nesta versão do app`,
      { description: "Atualize a página depois de uma nova versão do app para vê-los." },
    );
  }, [droppedNodes]);

  // Memoised so a node re-renders because its own data changed, not because the
  // editor did.
  const actions = useMemo(
    () => ({ openConfig: editor.openConfig, deleteNode: editor.deleteNode }),
    [editor.openConfig, editor.deleteNode],
  );

  const variablesValue = useMemo(
    () => ({
      variables: editor.variables,
      createVariable: editor.createVariable,
    }),
    [editor.variables, editor.createVariable],
  );

  return (
    <FlowVariablesProvider value={variablesValue}>
      <FlowActionsProvider value={actions}>
        <div className="flex h-full w-full">
          <EditorSidebar
            customVariables={editor.customVariables}
            variableUsage={editor.variableUsage}
            onCreateVariable={editor.createVariable}
            onUpdateVariable={editor.updateVariable}
            onDeleteVariable={editor.deleteVariable}
          />
          <div className="relative flex-1">
            <FlowCanvas
              nodes={editor.nodes}
              edges={editor.edges}
              defaultViewport={editor.initialViewport}
              onNodesChange={editor.onNodesChange}
              onEdgesChange={editor.onEdgesChange}
              onConnect={editor.onConnect}
              onDrop={editor.onDrop}
              onDragOver={editor.onDragOver}
            />
            <FlowToolbar
              automationName={flow.automation.name}
              hasUnpublishedChanges={flow.automation.hasUnpublishedChanges}
              saveState={editor.saveState}
              onSave={editor.saveFlow}
              onPublish={publish}
              isPublishing={isPublishing}
            />
          </div>
        </div>

        <NodeConfigModal
          activeNodeId={editor.activeNodeId}
          nodes={editor.nodes}
          updateNodeData={editor.updateNodeData}
          onClose={editor.closeConfig}
        />

        <FlowConflictDialog open={editor.conflict} />
      </FlowActionsProvider>
    </FlowVariablesProvider>
  );
}
