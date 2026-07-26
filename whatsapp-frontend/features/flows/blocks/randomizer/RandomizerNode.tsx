"use client";

import type { NodeProps } from "@xyflow/react";

import { BlockShell } from "@/features/flows/blocks/BlockShell";
import { getDefinition } from "@/features/flows/blocks/registry";
import type { RandomizerData } from "@/features/flows/blocks/randomizer/RandomizerModal";

/**
 * The randomizer has no body of its own: its branches *are* the labelled output
 * rows the shell already renders from the resolved handles. Nothing here knows
 * how many there are.
 */
export function RandomizerNode({ id, type, data, selected }: NodeProps) {
  const definition = getDefinition(type ?? "");
  if (!definition) return null;

  const { branches } = data as unknown as RandomizerData;

  return (
    <BlockShell
      nodeId={id}
      definition={definition}
      data={data}
      selected={selected}
    >
      <p className="text-xs text-muted-foreground">
        Sorteia entre {branches.length} saídas
      </p>
    </BlockShell>
  );
}
