"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type DefaultEdgeOptions,
  type Edge,
  type EdgeTypes,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type Viewport,
} from "@xyflow/react";

import { nodeTypes } from "@/features/flows/blocks/registry";
import { FlowEdge } from "@/features/flows/components/FlowEdge";

type Props = {
  nodes: Node[];
  edges: Edge[];
  /** O enquadramento salvo com o fluxo. Ausente = fluxo novo, `fitView`. */
  defaultViewport?: Viewport;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
};

/** Module-level, like `nodeTypes`, so the reference stays stable. */
const edgeTypes: EdgeTypes = { flow: FlowEdge };

/**
 * Every connection is a `FlowEdge` — a smooth brand-coloured line that flows,
 * one shared accent across the canvas, which also paints its own selected
 * highlight. Design tokens are referenced by CSS var so a rebrand needs no
 * change here.
 */
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "flow",
  animated: true,
};

/**
 * Delete and Backspace both remove whatever is selected — nodes and edges
 * alike. React Flow's default is Backspace only, which reads as broken on a
 * full-size keyboard. Non-deletable nodes (the anchor) are skipped by React
 * Flow itself, so there's nothing to filter here.
 */
const deleteKeyCode = ["Delete", "Backspace"];

/**
 * The React Flow canvas. `nodeTypes` comes from the registry (module-level, so
 * the reference is stable). Needs a container with an explicit height — the
 * editor page fills the content area. The wrapper is a sunken surface so the
 * canvas reads as a recessed workspace under the white nodes. Drop handlers live
 * on the wrapper so a block dragged from the palette lands where the cursor is
 * released.
 */
export function FlowCanvas({
  nodes,
  edges,
  defaultViewport,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDrop,
  onDragOver,
}: Props) {
  return (
    <div className="h-full w-full bg-muted" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        deleteKeyCode={deleteKeyCode}
        defaultViewport={defaultViewport}
        // Enquadrar sozinho só quando não há enquadramento salvo: um `fitView`
        // incondicional jogaria fora a posição em que o usuário deixou o canvas.
        fitView={!defaultViewport}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.5}
          color="var(--border-strong)"
        />
        <Controls
          showInteractive={false}
          className="!overflow-hidden !rounded-lg !border !border-border !shadow-md"
        />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
