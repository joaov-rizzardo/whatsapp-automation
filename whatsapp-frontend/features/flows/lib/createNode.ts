import type { Node } from "@xyflow/react";

import type { BlockDefinition } from "@/features/flows/blocks/types";

/**
 * Factory: a `BlockDefinition` + a position → a React Flow node. `deletable` is
 * set from `singleton` so React Flow itself blocks removing the anchor (its
 * native mechanism — no custom `onNodesChange` filtering needed).
 *
 * The id carries no module counter: with persistence, a counter restarting at
 * zero on every page load would hand a freshly dropped block the id of one
 * already in the loaded flow — a silent collision, with an edge pointing at the
 * wrong node. Eight hex digits are four billion values per flow of a few dozen
 * nodes, and the prefix keeps the id readable in the console. Ids are only ever
 * born from a user interaction, never during a render, so `crypto.randomUUID`
 * can't cause a hydration mismatch.
 */
export function createNode(
  definition: BlockDefinition,
  position: { x: number; y: number },
): Node {
  return {
    id: `${definition.type}-${crypto.randomUUID().slice(0, 8)}`,
    type: definition.type,
    position,
    data: definition.createData(),
    deletable: !definition.singleton,
  };
}
