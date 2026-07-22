"use client";

import { Handle, Position } from "@xyflow/react";

import type { HandleSpec } from "@/features/flows/blocks/types";

/**
 * Renders a node's handles by mapping over the spec lists from its
 * `BlockDefinition` — never a hardcoded `<Handle>`. This is what makes "N
 * outputs" (the future "randomizar" block) just another definition: the count
 * comes from the data. Multiple handles on one side are distributed evenly down
 * the edge so they don't overlap.
 */
export function BlockHandles({
  inputs,
  outputs,
}: {
  inputs: HandleSpec[];
  outputs: HandleSpec[];
}) {
  return (
    <>
      {inputs.map((spec, index) => (
        <Handle
          key={spec.id}
          id={spec.id}
          type="target"
          position={Position.Left}
          style={{ top: `${((index + 1) / (inputs.length + 1)) * 100}%` }}
          className="!size-3 !border-2 !border-card !bg-muted-foreground"
        />
      ))}
      {outputs.map((spec, index) => (
        <Handle
          key={spec.id}
          id={spec.id}
          type="source"
          position={Position.Right}
          style={{ top: `${((index + 1) / (outputs.length + 1)) * 100}%` }}
          className="!size-3 !border-2 !border-card !bg-primary"
        />
      ))}
    </>
  );
}
