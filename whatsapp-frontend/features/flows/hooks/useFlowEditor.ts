"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import { toast } from "sonner";

import { getDefinition } from "@/features/flows/blocks/registry";
import { startDefinition } from "@/features/flows/blocks/start/definition";
import { createNode } from "@/features/flows/lib/createNode";
import { resolveHandles } from "@/features/flows/lib/resolveHandles";
import { useFlowVariables } from "@/features/flows/hooks/useFlowVariables";

// Only the anchor on the canvas at first. No persistence — refresh resets here.
const initialNodes: Node[] = [createNode(startDefinition, { x: 0, y: 0 })];

/**
 * Owns all editor state and interactions: nodes/edges, connecting, drag-and-drop
 * from the palette, per-node data updates, the flow's variables and which node's
 * config modal is open. Must run inside a <ReactFlowProvider> — it uses
 * `useReactFlow` for `screenToFlowPosition`.
 */
export function useFlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition, deleteElements } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // React Flow caches each node's handle positions. When a block's outputs
  // change shape (the randomizer gaining or losing a branch) it has to
  // re-measure, or edges draw against stale handles. It must run *after* the
  // new handles are in the DOM, hence an effect rather than a direct call —
  // and a ref rather than state, so clearing the flag doesn't cost a render.
  const nodeToRemeasure = useRef<string | null>(null);
  useEffect(() => {
    if (!nodeToRemeasure.current) return;
    updateNodeInternals(nodeToRemeasure.current);
    nodeToRemeasure.current = null;
  }, [nodes, updateNodeInternals]);

  // Renaming a variable can't break a select (blocks store ids), but a message
  // body references it by name. Only blocks that declare `renameVariable` are
  // touched — everything else is already correct.
  const renameVariableInNodes = useCallback(
    (from: string, to: string) => {
      setNodes((current) =>
        current.map((node) => {
          const definition = getDefinition(node.type ?? "");
          if (!definition?.renameVariable) return node;
          return {
            ...node,
            data: definition.renameVariable(node.data, from, to),
          };
        }),
      );
    },
    [setNodes],
  );

  const variableState = useFlowVariables({ onRename: renameVariableInNodes });
  const { variables } = variableState;

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

  // The bin button in a block's header. Goes through React Flow's own removal
  // path (`deleteElements`) rather than filtering `nodes` by hand, so it also
  // drops the node's edges and honours `deletable: false` — the anchor can't be
  // removed here either, exactly as with the Delete/Backspace keys.
  const deleteNode = useCallback(
    (nodeId: string) => {
      void deleteElements({ nodes: [{ id: nodeId }] });
    },
    [deleteElements],
  );

  /**
   * Writes a block's config back into its node — and cleans up after handles
   * that the new data removed. Both consequences of derived handles live here,
   * once and generically: a block never has to know that its own branch was
   * connected to something.
   */
  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      const node = nodes.find((candidate) => candidate.id === nodeId);
      const definition = node ? getDefinition(node.type ?? "") : undefined;
      if (!node || !definition) return;

      setNodes((current) =>
        current.map((candidate) =>
          candidate.id === nodeId ? { ...candidate, data } : candidate,
        ),
      );

      const handles = resolveHandles(definition, data);
      const outputs = new Set(handles.outputs.map((handle) => handle.id));
      const inputs = new Set(handles.inputs.map((handle) => handle.id));

      const orphans = edges.filter(
        (edge) =>
          (edge.source === nodeId &&
            edge.sourceHandle &&
            !outputs.has(edge.sourceHandle)) ||
          (edge.target === nodeId &&
            edge.targetHandle &&
            !inputs.has(edge.targetHandle)),
      );

      if (orphans.length > 0) {
        void deleteElements({ edges: orphans.map((edge) => ({ id: edge.id })) });
      }

      nodeToRemeasure.current = nodeId;
    },
    [nodes, edges, setNodes, deleteElements],
  );

  /** How many blocks reference each variable, by id. Drives the panel's usage
   *  label and the "this is used somewhere" delete confirmation. */
  const variableUsage = useMemo(() => {
    const usage = new Map<string, number>();
    for (const node of nodes) {
      const definition = getDefinition(node.type ?? "");
      if (!definition?.usedVariables) continue;
      // A block referencing the same variable twice still counts as one block.
      for (const id of new Set(definition.usedVariables(node.data, variables))) {
        usage.set(id, (usage.get(id) ?? 0) + 1);
      }
    }
    return usage;
  }, [nodes, variables]);

  // Prototype "save": there's no backend yet, so we log the current flow as the
  // JSON shape a future persistence endpoint would receive, and confirm to the
  // user. Only the fields that describe the flow — not React Flow's transient UI
  // state (measured size, selection, dragging).
  const saveFlow = useCallback(() => {
    const snapshot = {
      variables: variableState.customVariables,
      nodes: nodes.map(({ id, type, position, data }) => ({
        id,
        type,
        position,
        data,
      })),
      edges: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
        id,
        source,
        target,
        sourceHandle,
        targetHandle,
      })),
    };
    console.log("[flow] snapshot", snapshot);
    toast.success("Fluxo salvo", {
      description: `${snapshot.nodes.length} bloco(s), ${snapshot.edges.length} conexão(ões) e ${snapshot.variables.length} variável(is) — veja o console.`,
    });
  }, [nodes, edges, variableState.customVariables]);

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
    deleteNode,
    updateNodeData,
    saveFlow,
    activeNodeId,
    openConfig,
    closeConfig,
    variableUsage,
    ...variableState,
  };
}
