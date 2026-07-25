"use client";

import { Settings, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFlowActions } from "@/features/flows/components/FlowActionsContext";

/**
 * The buttons in a block's header — configure and delete. Sibling of
 * BlockHandles and used the same way: a node composes it from its
 * `BlockDefinition` instead of hand-rolling buttons, so every block type gets
 * the same affordances for free. Both are derived, never assumed — a block
 * without a modal shows no gear, and a singleton (the anchor) shows no bin.
 *
 * `nodrag` keeps a click on either button from starting a node drag.
 */
export function BlockActions({
  nodeId,
  configurable,
  deletable,
}: {
  nodeId: string;
  configurable: boolean;
  deletable: boolean;
}) {
  const { openConfig, deleteNode } = useFlowActions();

  return (
    <div className="nodrag flex items-center gap-0.5">
      {configurable ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => openConfig(nodeId)}
          aria-label="Configurar bloco"
        >
          <Settings className="size-4" />
        </Button>
      ) : null}

      {deletable ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => deleteNode(nodeId)}
          aria-label="Excluir bloco"
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
