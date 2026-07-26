"use client";

import type { NodeProps } from "@xyflow/react";
import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { describeTrigger } from "@/lib/describeTrigger";
import { BlockActions } from "@/features/flows/blocks/BlockActions";
import {
  BlockInputHandles,
  BlockOutputHandles,
} from "@/features/flows/blocks/BlockHandles";
import { getCategory } from "@/features/flows/blocks/categories";
import { getDefinition } from "@/features/flows/blocks/registry";
import type { StartData } from "@/features/flows/blocks/start/StartModal";
import { useFlowVariablesContext } from "@/features/flows/components/FlowVariablesContext";
import { resolveHandles } from "@/features/flows/lib/resolveHandles";

/**
 * The anchor where the flow begins. Unlike the white content blocks, it's a
 * filled brand card — the single purple accent on the canvas reads instantly as
 * "the flow starts here". A single output handle mapped from the definition, no
 * input. It's a singleton and not deletable (see createNode), so BlockActions
 * gives it the gear and no bin. Handles come from `definition.handles`, never
 * hardcoded.
 *
 * The subtitle is the flow's trigger — or, while it's missing, the definition's
 * own `validate` message, the same source that paints the warning on every other
 * block. On the brand card the warning reads through contrast, not amber.
 */
export function StartNode({ id, type, data, selected }: NodeProps) {
  const { variables } = useFlowVariablesContext();
  const definition = getDefinition(type ?? "");
  if (!definition) return null;

  const Icon = definition.icon;
  const handles = resolveHandles(definition, data);
  const { trigger } = data as unknown as StartData;
  const warning = definition.validate?.(data, variables) ?? null;

  return (
    <div
      className={cn(
        "group relative flex max-w-80 items-center gap-3 rounded-xl bg-gradient-to-br from-brand to-brand-active py-3 pr-2 pl-4 text-primary-foreground shadow-md transition-transform duration-base ease-standard hover:-translate-y-0.5",
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      {/* Soft brand halo so the anchor lifts off the canvas. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl bg-brand/25 blur-md"
      />

      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-inset ring-white/25">
        <Icon className="size-4 fill-current" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="font-heading text-sm font-semibold">
          {definition.label}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 truncate text-xs",
            warning ? "text-primary-foreground/90" : "text-primary-foreground/70",
          )}
        >
          {warning ? (
            <>
              <TriangleAlert className="size-3 shrink-0" aria-hidden />
              {warning}
            </>
          ) : (
            describeTrigger(trigger)
          )}
        </span>
      </div>

      <BlockActions
        nodeId={id}
        configurable={Boolean(definition.modal)}
        deletable={!definition.singleton}
        className="text-primary-foreground/80 hover:bg-white/15 hover:text-primary-foreground"
      />

      <BlockInputHandles inputs={handles.inputs} />
      <BlockOutputHandles
        outputs={handles.outputs}
        accentClass={getCategory(definition.category).accentClass}
      />
    </div>
  );
}
