"use client";

import { useCallback, useState } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";

import { getDefinition } from "@/features/flows/blocks/registry";
import { startDefinition } from "@/features/flows/blocks/start/definition";
import { createNode } from "@/features/flows/lib/createNode";

// Only the anchor on the canvas at first. No persistence — refresh resets here.
const initialNodes: Node[] = [createNode(startDefinition, { x: 0, y: 0 })];

/**
 * Owns all editor state and interactions: nodes/edges, connecting, drag-and-drop
 * from the palette, per-node data updates and which node's config modal is open.
 * Must run inside a <ReactFlowProvider> — it uses `useReactFlow` for
 * `screenToFlowPosition`.
 */
export function useFlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Respects `sourceHandle`/`targetHandle`, so N-output blocks connect the
  // right handle out of the box.
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => addEdge(connection, current));
    },
    [setEdges],
  );

  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const definition = getDefinition(type);
      if (!definition) return;
      setNodes((current) => current.concat(createNode(definition, position)));
    },
    [setNodes],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(type, position);
    },
    [screenToFlowPosition, addNode],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId ? { ...node, data } : node,
        ),
      );
    },
    [setNodes],
  );

  const openConfig = useCallback((nodeId: string) => {
    setActiveNodeId(nodeId);
  }, []);

  const closeConfig = useCallback(() => {
    setActiveNodeId(null);
  }, []);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDrop,
    onDragOver,
    addNode,
    updateNodeData,
    activeNodeId,
    openConfig,
    closeConfig,
  };
}
