"use client";

import { Settings } from "lucide-react";
import type { NodeProps } from "@xyflow/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BlockHandles } from "@/features/flows/blocks/BlockHandles";
import { getDefinition } from "@/features/flows/blocks/registry";
import { useFlowActions } from "@/features/flows/components/FlowActionsContext";

/**
 * A content block: header (icon + "Conteúdo" + gear that opens the config
 * modal), a preview of the message text, and input/output handles mapped from
 * the definition. A plain click only selects; the gear opens config.
 */
export function ContentNode({ id, type, data, selected }: NodeProps) {
  const { openConfig } = useFlowActions();
  const definition = getDefinition(type ?? "");
  if (!definition) return null;

  const Icon = definition.icon;
  const text = typeof data.text === "string" ? data.text : "";

  return (
    <div
      className={cn(
        "flex w-56 flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-all duration-base ease-standard hover:-translate-y-0.5 hover:shadow-md",
        selected && "border-primary/40 ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-brand-subtle text-primary">
          <Icon className="size-4" />
        </span>
        <span className="flex-1 font-heading text-sm font-medium text-foreground">
          {definition.label}
        </span>
        {/* nodrag: the gear must not start a node drag */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="nodrag -mr-1"
          onClick={() => openConfig(id)}
          aria-label="Configurar bloco"
        >
          <Settings className="size-4" />
        </Button>
      </div>

      <p
        className={cn(
          "line-clamp-3 rounded-md bg-muted px-2.5 py-2 text-sm",
          text ? "text-foreground" : "text-muted-foreground italic",
        )}
      >
        {text || "Sem mensagem"}
      </p>

      <BlockHandles
        inputs={definition.handles.inputs}
        outputs={definition.handles.outputs}
      />
    </div>
  );
}
