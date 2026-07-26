"use client";

import "@xyflow/react/dist/style.css";

import { useMemo } from "react";
import { ReactFlowProvider } from "@xyflow/react";

import { useFlowEditor } from "@/features/flows/hooks/useFlowEditor";
import { EditorSidebar } from "@/features/flows/components/EditorSidebar";
import { FlowCanvas } from "@/features/flows/components/FlowCanvas";
import { FlowToolbar } from "@/features/flows/components/FlowToolbar";
import { FlowActionsProvider } from "@/features/flows/components/FlowActionsContext";
import { FlowVariablesProvider } from "@/features/flows/components/FlowVariablesContext";
import { NodeConfigModal } from "@/features/flows/components/NodeConfigModal";

/**
 * Editor root: provides the React Flow context (so the hook can use
 * `screenToFlowPosition`), imports the required React Flow CSS once, and mounts
 * sidebar + canvas + modal host. All editor state lives in memory — nothing is
 * persisted yet.
 */
export function FlowEditor() {
  return (
    <ReactFlowProvider>
      <FlowEditorInner />
    </ReactFlowProvider>
  );
}

function FlowEditorInner() {
  const editor = useFlowEditor();

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
              onNodesChange={editor.onNodesChange}
              onEdgesChange={editor.onEdgesChange}
              onConnect={editor.onConnect}
              onDrop={editor.onDrop}
              onDragOver={editor.onDragOver}
            />
            <FlowToolbar onSave={editor.saveFlow} />
          </div>
        </div>

        <NodeConfigModal
          activeNodeId={editor.activeNodeId}
          nodes={editor.nodes}
          updateNodeData={editor.updateNodeData}
          onClose={editor.closeConfig}
        />
      </FlowActionsProvider>
    </FlowVariablesProvider>
  );
}
