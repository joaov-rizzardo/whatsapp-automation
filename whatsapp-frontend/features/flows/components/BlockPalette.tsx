"use client";

import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import { blocksByCategory } from "@/features/flows/blocks/registry";

/**
 * The block palette: draggable items grouped by category, each in its
 * category's colour. Dragging sets the block type on the dataTransfer; the
 * canvas reads it on drop. The anchor block isn't here — it's `addable: false`.
 *
 * Both the sections and their order come from the registry, so a new block type
 * lands in the right group without this file changing.
 */
export function BlockPalette() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Arraste um bloco para o canvas.
      </p>

      {blocksByCategory.map(({ category, blocks }) => (
        <div key={category.key} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("size-1.5 rounded-full", category.dotClass)} />
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {category.label}
            </h3>
          </div>

          {blocks.map((definition) => {
            const Icon = definition.icon;
            return (
              <div
                key={definition.type}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    "application/reactflow",
                    definition.type,
                  );
                  event.dataTransfer.effectAllowed = "move";
                }}
                className="flex cursor-grab items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-xs transition-all duration-base ease-standard hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm active:cursor-grabbing"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md",
                    category.surfaceClass,
                    category.accentClass,
                  )}
                >
                  <Icon className="size-4" />
                </span>

                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {definition.label}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {definition.description}
                  </span>
                </span>

                <GripVertical className="size-4 shrink-0 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
