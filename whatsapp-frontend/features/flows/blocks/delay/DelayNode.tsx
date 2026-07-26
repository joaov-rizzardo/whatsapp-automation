"use client";

import type { NodeProps } from "@xyflow/react";

import { BlockShell } from "@/features/flows/blocks/BlockShell";
import { getDefinition } from "@/features/flows/blocks/registry";
import { formatDuration } from "@/features/flows/types/duration";
import type { DelayData } from "@/features/flows/blocks/delay/DelayModal";

export function DelayNode({ id, type, data, selected }: NodeProps) {
  const definition = getDefinition(type ?? "");
  if (!definition) return null;

  const { duration } = data as unknown as DelayData;

  return (
    <BlockShell
      nodeId={id}
      definition={definition}
      data={data}
      selected={selected}
    >
      <p className="rounded-md bg-muted px-2.5 py-2 text-sm text-foreground">
        Aguarda {formatDuration(duration)}
      </p>
    </BlockShell>
  );
}
