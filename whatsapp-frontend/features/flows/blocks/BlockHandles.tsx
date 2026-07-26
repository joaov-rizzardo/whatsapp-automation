"use client";

import { Handle, Position } from "@xyflow/react";

import { cn } from "@/lib/utils";
import type { HandleSpec } from "@/features/flows/blocks/types";

/**
 * Renders a node's handles from its resolved spec lists — never a hardcoded
 * `<Handle>`. The count comes from the data, which is what makes "N outputs"
 * (the randomizer) just another definition.
 *
 * Outputs have two modes. A single unlabelled output is the plain dot on the
 * right edge. Labelled outputs (condition, wait-reply, randomizer) become one
 * row each in the card's footer, with the handle anchored to that row — the
 * label gets somewhere to live and the card grows with the branch count,
 * instead of N dots piling up on one edge.
 */

export function BlockInputHandles({ inputs }: { inputs: HandleSpec[] }) {
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
    </>
  );
}

export function BlockOutputHandles({
  outputs,
  accentClass,
}: {
  outputs: HandleSpec[];
  accentClass: string;
}) {
  const labelled = outputs.some((spec) => spec.label);

  if (!labelled) {
    return (
      <>
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

  return (
    <div className="mt-1 flex flex-col border-t border-border">
      {outputs.map((spec) => (
        // `relative` anchors each handle to its own row, so label and dot align.
        <div
          key={spec.id}
          className="relative flex items-center justify-end px-3 py-1.5 text-xs"
        >
          <span className={cn("truncate font-medium", accentClass)}>
            {spec.label}
          </span>
          <Handle
            id={spec.id}
            type="source"
            position={Position.Right}
            className="!size-3 !border-2 !border-card !bg-primary"
          />
        </div>
      ))}
    </div>
  );
}
