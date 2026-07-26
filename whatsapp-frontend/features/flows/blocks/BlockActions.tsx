"use client";

import { Settings, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
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
 *
 * `className` existe por causa da âncora: ela é o único card preenchido do
 * canvas, e o ghost claro sumiria em cima do roxo. É tom, não estrutura.
 */
export function BlockActions({
  nodeId,
  configurable,
  deletable,
  className,
}: {
  nodeId: string;
  configurable: boolean;
  deletable: boolean;
  className?: string;
}) {
  const { openConfig, deleteNode } = useFlowActions();

  return (
    <div className="nodrag flex items-center gap-0.5">
      {configurable ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={className}
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
          className={cn(
            "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
            className,
          )}
          onClick={() => deleteNode(nodeId)}
          aria-label="Excluir bloco"
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
