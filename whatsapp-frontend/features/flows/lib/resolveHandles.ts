import type {
  BlockDefinition,
  BlockHandleSpecs,
} from "@/features/flows/blocks/types";

/**
 * Normalises the static-or-derived `handles` union. Every consumer — the nodes,
 * the editor's edge cleanup — goes through here; nobody reads
 * `definition.handles` directly, so a block whose outputs depend on its data
 * (the randomizer) needs no special case anywhere.
 */
export function resolveHandles(
  definition: BlockDefinition,
  data: Record<string, unknown>,
): BlockHandleSpecs {
  return typeof definition.handles === "function"
    ? definition.handles(data)
    : definition.handles;
}
