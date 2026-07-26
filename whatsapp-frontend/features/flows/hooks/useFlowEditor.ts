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
} from "@xyflow/react";
import { toast } from "sonner";

import { getDefinition } from "@/features/flows/blocks/registry";
import { useFlowAutosave } from "@/features/flows/hooks/useFlowAutosave";
import { createNode } from "@/features/flows/lib/createNode";
import { deserializeFlow } from "@/features/flows/lib/deserializeFlow";
import { resolveHandles } from "@/features/flows/lib/resolveHandles";
import { useFlowVariables } from "@/features/flows/hooks/useFlowVariables";
import type { FlowDocument } from "@/features/flows/schemas/flowDocument";

/**
 * Owns all editor state and interactions: nodes/edges, connecting, drag-and-drop
 * from the palette, per-node data updates, the flow's variables and which node's
 * config modal is open. Must run inside a <ReactFlowProvider> — it uses
 * `useReactFlow` for `screenToFlowPosition`.
 *
 * There is no initial state of its own any more: the flow is **loaded** (spec
 * 006) and handed in already parsed. The editor is mounted with
 * `key={automationId}`, so switching automations remounts it rather than
 * merging two flows' state.
 */
export function useFlowEditor({
  automationId,
  initialDocument,
  initialVersion,
}: {
  automationId: string;
  initialDocument: FlowDocument;
  initialVersion: number;
}) {
  // Uma vez, na montagem: daqui para a frente quem manda no canvas é o React
  // Flow, e reprocessar o documento sobrescreveria o que o usuário editou.
  const [initial] = useState(() => deserializeFlow(initialDocument));

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const { screenToFlowPosition, deleteElements, getViewport } = useReactFlow();
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

  const variableState = useFlowVariables({
    onRename: renameVariableInNodes,
    initialVariables: initial.variables,
  });
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

  // A persistência inteira (comparação normalizada, debounce com teto,
  // coalescência, flush na saída, 409) mora no autosave; o editor só lhe entrega
  // o estado atual e reexporta o que a barra precisa mostrar.
  const autosave = useFlowAutosave({
    automationId,
    initialVersion,
    initialDocument,
    nodes,
    edges,
    variables: variableState.customVariables,
    getViewport,
  });

  /** O botão Salvar: mesmo caminho do autosave, sem esperar o debounce. */
  const saveFlow = useCallback(() => {
    void autosave.saveNow().then((saved) => {
      if (saved) toast.success("Fluxo salvo");
    });
  }, [autosave]);

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
    saveState: autosave.saveState,
    saveNow: autosave.saveNow,
    conflict: autosave.conflict,
    droppedNodes: initial.droppedNodes,
    initialViewport: initial.viewport ?? undefined,
    ...variableState,
  };
}
