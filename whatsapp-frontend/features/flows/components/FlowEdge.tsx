"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

/**
 * The canvas' only edge type: a smooth brand-coloured line that flows.
 *
 * The selected state lives here rather than in CSS on purpose — React Flow's
 * own `.react-flow__edge.selected` rules come from an unlayered stylesheet that
 * Tailwind utilities can't override, so the highlight is painted inline: the
 * line thickens and shifts to the darker brand tone, over a soft halo. That
 * halo is what tells the user *which* connection Delete/Backspace will remove.
 */
export function FlowEdge({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerStart,
  markerEnd,
  selected,
}: EdgeProps) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {selected ? (
        // `.react-flow__edge.animated path` dashes every path in the group, so
        // the halo opts out inline — it must read as a solid glow, not a second
        // marching line.
        <path
          d={path}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={10}
          strokeOpacity={0.22}
          strokeLinecap="round"
          style={{
            strokeDasharray: "none",
            animation: "none",
            pointerEvents: "none",
          }}
        />
      ) : null}

      <BaseEdge
        path={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "var(--brand-active)" : "var(--brand)",
          strokeWidth: selected ? 3 : 2,
        }}
      />
    </>
  );
}
