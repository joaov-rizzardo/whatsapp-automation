"use client";

import type { NodeProps } from "@xyflow/react";

import { cn } from "@/lib/utils";
import {
  BlockInputHandles,
  BlockOutputHandles,
} from "@/features/flows/blocks/BlockHandles";
import { getCategory } from "@/features/flows/blocks/categories";
import { getDefinition } from "@/features/flows/blocks/registry";
import { resolveHandles } from "@/features/flows/lib/resolveHandles";

/**
 * The anchor where the flow begins. Unlike the white content blocks, it's a
 * filled brand card — the single purple accent on the canvas reads instantly as
 * "the flow starts here". No gear (no config), a single output handle mapped
 * from the definition, no input. It's a singleton and not deletable (see
 * createNode). Handles come from `definition.handles`, never hardcoded.
 */
export function StartNode({ type, data, selected }: NodeProps) {
  const definition = getDefinition(type ?? "");
  if (!definition) return null;

  const Icon = definition.icon;
  const handles = resolveHandles(definition, data);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-xl bg-gradient-to-br from-brand to-brand-active px-4 py-3 text-primary-foreground shadow-md transition-transform duration-base ease-standard hover:-translate-y-0.5",
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      {/* Soft brand halo so the anchor lifts off the canvas. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl bg-brand/25 blur-md"
      />

      <span className="flex size-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-inset ring-white/25">
        <Icon className="size-4 fill-current" />
      </span>

      <div className="flex flex-col leading-tight">
        <span className="font-heading text-sm font-semibold">
          {definition.label}
        </span>
        <span className="text-xs text-primary-foreground/70">
          Ponto de partida do fluxo
        </span>
      </div>

      <BlockInputHandles inputs={handles.inputs} />
      <BlockOutputHandles
        outputs={handles.outputs}
        accentClass={getCategory(definition.category).accentClass}
      />
    </div>
  );
}
