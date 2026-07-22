import type { NodeTypes } from "@xyflow/react";

import { startDefinition } from "@/features/flows/blocks/start/definition";
import { contentDefinition } from "@/features/flows/blocks/content/definition";
import type { BlockDefinition } from "@/features/flows/blocks/types";

/**
 * The single source of truth for block types. Everything the editor needs —
 * React Flow's `nodeTypes`, the palette items, node/modal lookup — is *derived*
 * from this map. Adding a block = create `blocks/<new>/definition.ts` + its
 * components and register it here; the canvas, palette and modal host don't
 * change.
 */
export const blockRegistry: Record<string, BlockDefinition> = {
  [startDefinition.type]: startDefinition,
  [contentDefinition.type]: contentDefinition,
};

/** React Flow node types, derived — never a second hand-kept list. */
export const nodeTypes: NodeTypes = Object.fromEntries(
  Object.values(blockRegistry).map((definition) => [
    definition.type,
    definition.node,
  ]),
);

/** The blocks a user can drag from the palette (the anchor is excluded). */
export const addableBlocks = Object.values(blockRegistry).filter(
  (definition) => definition.addable,
);

export function getDefinition(type: string): BlockDefinition | undefined {
  return blockRegistry[type];
}
