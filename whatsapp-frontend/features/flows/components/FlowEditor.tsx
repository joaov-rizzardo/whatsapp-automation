"use client";

import "@xyflow/react/dist/style.css";

import { ReactFlowProvider } from "@xyflow/react";

import { useFlowEditor } from "@/features/flows/hooks/useFlowEditor";
import { BlockPalette } from "@/features/flows/components/BlockPalette";
import { FlowCanvas } from "@/features/flows/components/FlowCanvas";
import { FlowToolbar } from "@/features/flows/components/FlowToolbar";
import { FlowActionsProvider } from "@/features/flows/components/FlowActionsContext";
import { NodeConfigModal } from "@/features/flows/components/NodeConfigModal";

/**
 * Editor root: provides the React Flow context (so the hook can use
 * `screenToFlowPosition`), imports the required React Flow CSS once, and mounts
 * palette + canvas + modal host. All editor state is a prototype living in
 * memory — nothing is persisted.
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

  return (
    <FlowActionsProvider value={{ openConfig: editor.openConfig }}>
      <div className="flex h-full w-full">
        <BlockPalette />
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
  );
}
