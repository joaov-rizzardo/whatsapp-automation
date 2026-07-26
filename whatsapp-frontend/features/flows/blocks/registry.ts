import type { NodeTypes } from "@xyflow/react";

import {
  orderedCategories,
  type BlockCategory,
} from "@/features/flows/blocks/categories";
import { startDefinition } from "@/features/flows/blocks/start/definition";
import { contentDefinition } from "@/features/flows/blocks/content/definition";
import { waitReplyDefinition } from "@/features/flows/blocks/waitReply/definition";
import { conditionDefinition } from "@/features/flows/blocks/condition/definition";
import { randomizerDefinition } from "@/features/flows/blocks/randomizer/definition";
import { setVariableDefinition } from "@/features/flows/blocks/setVariable/definition";
import { delayDefinition } from "@/features/flows/blocks/delay/definition";
import type { BlockDefinition } from "@/features/flows/blocks/types";

/**
 * The single source of truth for block types. Everything the editor needs —
 * React Flow's `nodeTypes`, the palette items and their grouping, node/modal
 * lookup — is *derived* from this map. Adding a block = create
 * `blocks/<new>/definition.ts` + its components and register it here; the
 * canvas, palette and modal host don't change.
 */
const definitions: BlockDefinition[] = [
  startDefinition,
  contentDefinition,
  waitReplyDefinition,
  conditionDefinition,
  randomizerDefinition,
  setVariableDefinition,
  delayDefinition,
];

export const blockRegistry: Record<string, BlockDefinition> = Object.fromEntries(
  definitions.map((definition) => [definition.type, definition]),
);

/** React Flow node types, derived — never a second hand-kept list. */
export const nodeTypes: NodeTypes = Object.fromEntries(
  definitions.map((definition) => [definition.type, definition.node]),
);

/** The blocks a user can drag from the palette (the anchor is excluded). */
export const addableBlocks = definitions.filter(
  (definition) => definition.addable,
);

/** The palette's sections: categories in their declared order, each with the
 *  addable blocks that belong to it. Empty categories don't render. */
export const blocksByCategory: {
  category: BlockCategory;
  blocks: BlockDefinition[];
}[] = orderedCategories
  .map((category) => ({
    category,
    blocks: addableBlocks.filter(
      (definition) => definition.category === category.key,
    ),
  }))
  .filter((section) => section.blocks.length > 0);

export function getDefinition(type: string): BlockDefinition | undefined {
  return blockRegistry[type];
}
