import type { Node } from "@xyflow/react";

import type { BlockDefinition } from "@/features/flows/blocks/types";

let sequence = 0;

/**
 * Factory: a `BlockDefinition` + a position → a React Flow node. `deletable` is
 * set from `singleton` so React Flow itself blocks removing the anchor (its
 * native mechanism — no custom `onNodesChange` filtering needed).
 */
export function createNode(
  definition: BlockDefinition,
  position: { x: number; y: number },
): Node {
  sequence += 1;
  return {
    id: `${definition.type}-${sequence}`,
    type: definition.type,
    position,
    data: definition.createData(),
    deletable: !definition.singleton,
  };
}
