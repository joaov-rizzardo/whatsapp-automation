"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type DefaultEdgeOptions,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";

import { nodeTypes } from "@/features/flows/blocks/registry";

type Props = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
};

/**
 * Edges default to a smooth brand-coloured line that flows — one shared accent
 * across the canvas. Design tokens are referenced by CSS var so a rebrand needs
 * no change here.
 */
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "smoothstep",
  animated: true,
  style: { stroke: "var(--brand)", strokeWidth: 2 },
};

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
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
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
