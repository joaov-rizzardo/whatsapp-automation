"use client";

import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BlockActions } from "@/features/flows/blocks/BlockActions";
import {
  BlockInputHandles,
  BlockOutputHandles,
} from "@/features/flows/blocks/BlockHandles";
import { getCategory } from "@/features/flows/blocks/categories";
import type { BlockDefinition } from "@/features/flows/blocks/types";
import { useFlowVariablesContext } from "@/features/flows/components/FlowVariablesContext";
import { resolveHandles } from "@/features/flows/lib/resolveHandles";

/**
 * The chrome every configurable block shares: card, selection ring, header
 * (category-coloured icon, label, warning badge, gear/bin) and the handles
 * resolved from the definition. A block's own component is then just its
 * preview body — which is the point: five block types, five short files.
 *
 * The anchor (StartNode) stays outside this on purpose. It's the one filled
 * brand card on the canvas and must keep reading as unique.
 *
 * No padding on the root: the labelled output rows need to reach the card's
 * edge so their handles sit on the border, not floating inside it.
 */
export function BlockShell({
  nodeId,
  definition,
  data,
  selected,
  children,
}: {
  nodeId: string;
  definition: BlockDefinition;
  data: Record<string, unknown>;
  selected: boolean | undefined;
  children?: React.ReactNode;
}) {
  const { variables } = useFlowVariablesContext();
  const category = getCategory(definition.category);
  const handles = resolveHandles(definition, data);
  const Icon = definition.icon;
  const warning = definition.validate?.(data, variables) ?? null;

  return (
    <div
      className={cn(
        "w-60 rounded-xl border border-border bg-card shadow-sm transition-all duration-base ease-standard hover:-translate-y-0.5 hover:shadow-md",
        selected &&
          "border-primary/40 ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-md",
            category.surfaceClass,
            category.accentClass,
          )}
        >
          <Icon className="size-4" />
        </span>

        <span className="flex-1 truncate font-heading text-sm font-medium text-foreground">
          {definition.label}
        </span>

        {warning ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="nodrag flex size-6 items-center justify-center rounded-md text-warning"
                aria-label={warning}
              >
                <TriangleAlert className="size-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{warning}</TooltipContent>
          </Tooltip>
        ) : null}

        <div className="-mr-1">
          <BlockActions
            nodeId={nodeId}
            configurable={Boolean(definition.modal)}
            deletable={!definition.singleton}
          />
        </div>
      </div>

      {children ? <div className="px-3 pb-3">{children}</div> : null}

      <BlockInputHandles inputs={handles.inputs} />
      <BlockOutputHandles
        outputs={handles.outputs}
        accentClass={category.accentClass}
      />
    </div>
  );
}
