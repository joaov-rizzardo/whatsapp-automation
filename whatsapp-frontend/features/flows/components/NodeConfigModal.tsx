"use client";

import type { Node } from "@xyflow/react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getDefinition } from "@/features/flows/blocks/registry";

type Props = {
  activeNodeId: string | null;
  nodes: Node[];
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
};

/**
 * Generic modal host. It finds the active node, looks up its definition and
 * renders `definition.modal` (if any) inside a shadcn Dialog, wiring `data`,
 * `onChange` and `onClose`. A definition without a modal (the anchor) opens
 * nothing. The node's untyped `data` meets the typed modal here — the single,
 * intentional boundary of the registry's type erasure.
 */
export function NodeConfigModal({
  activeNodeId,
  nodes,
  updateNodeData,
  onClose,
}: Props) {
  const activeNode = activeNodeId
    ? nodes.find((node) => node.id === activeNodeId)
    : undefined;
  const definition = activeNode
    ? getDefinition(activeNode.type ?? "")
    : undefined;
  const Modal = definition?.modal;

  const open = Boolean(activeNode && Modal);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent>
        {activeNode && Modal ? (
          <Modal
            data={activeNode.data}
            onChange={(data) => updateNodeData(activeNode.id, data)}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
