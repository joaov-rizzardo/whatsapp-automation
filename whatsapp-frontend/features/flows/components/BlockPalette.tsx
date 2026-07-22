"use client";

import { GripVertical } from "lucide-react";

import { addableBlocks } from "@/features/flows/blocks/registry";

/**
 * The block palette: a sidebar listing the addable blocks as draggable items.
 * Dragging sets the block type on the dataTransfer; the canvas reads it on drop.
 * The anchor block isn't here — it's `addable: false`.
 */
export function BlockPalette() {
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-3 border-r border-border bg-background p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Blocos
        </h2>
        <p className="text-xs text-muted-foreground">
          Arraste um bloco para o canvas.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {addableBlocks.map((definition) => {
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
              className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-card px-3 py-2 shadow-xs transition-colors hover:border-primary/40 active:cursor-grabbing"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-brand-subtle text-primary">
                <Icon className="size-4" />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">
                {definition.label}
              </span>
              <GripVertical className="size-4 text-muted-foreground" />
            </div>
          );
        })}
      </div>
    </aside>
  );
}
