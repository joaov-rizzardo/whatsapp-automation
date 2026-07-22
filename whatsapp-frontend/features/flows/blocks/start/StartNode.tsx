"use client";

import type { NodeProps } from "@xyflow/react";

import { cn } from "@/lib/utils";
import { BlockHandles } from "@/features/flows/blocks/BlockHandles";
import { getDefinition } from "@/features/flows/blocks/registry";

/**
 * The anchor where the flow begins: compact card, no gear (no config), a single
 * output handle mapped from the definition, no input. It's a singleton and not
 * deletable (see createNode). Handles come from `definition.handles`, never
 * hardcoded.
 */
export function StartNode({ type, selected }: NodeProps) {
  const definition = getDefinition(type ?? "");
  if (!definition) return null;

  const Icon = definition.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-primary/40 bg-card px-4 py-3 shadow-sm transition-shadow",
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Icon className="size-4" />
      </span>
      <span className="font-heading text-sm font-medium text-foreground">
        {definition.label}
      </span>

      <BlockHandles
        inputs={definition.handles.inputs}
        outputs={definition.handles.outputs}
      />
    </div>
  );
}
