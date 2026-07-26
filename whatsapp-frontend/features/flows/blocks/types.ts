import type { ComponentType } from "react";
import type { NodeProps } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";

import type { BlockCategoryKey } from "@/features/flows/blocks/categories";
import type { FlowVariable } from "@/features/flows/types/variable";

/**
 * The block registry contract — the heart of the editor's extensibility. A block
 * is *described by data*: its handles, category, icon, default data and
 * (optional) config modal all live in one `BlockDefinition`. Adding a block type
 * is a new definition, never a change to the canvas, palette or modal host.
 */

/** One connection point on a node. N outputs = N specs. */
export type HandleSpec = {
  id: string; // stable id, used as edge.sourceHandle / targetHandle
  label?: string; // shown as a labelled row on the card ("Verdadeiro", "40%")
};

export type BlockHandleSpecs = {
  inputs: HandleSpec[];
  outputs: HandleSpec[];
};

/** Props every block modal receives. Variables arrive via context, not props,
 *  so the generic modal host never has to know about them. */
export type BlockModalProps<Data> = {
  data: Data;
  onChange: (data: Data) => void; // writes back into the node's data
  onClose: () => void;
};

export type BlockDefinition<
  Data extends Record<string, unknown> = Record<string, unknown>,
> = {
  type: string; // matches node.type
  label: string; // pt-BR label, shown in the palette and card header
  description: string; // one line under the label in the palette
  icon: LucideIcon;
  category: BlockCategoryKey; // the colour comes from here, never a loose token

  /**
   * Static for most blocks, a function of the data for the ones whose outputs
   * the user configures (randomizer). Always read through `resolveHandles` —
   * never `definition.handles` directly.
   */
  handles: BlockHandleSpecs | ((data: Data) => BlockHandleSpecs);

  addable: boolean; // shows up in the palette?  start: false
  singleton: boolean; // single, non-deletable?    start: true
  createData: () => Data; // default data when the node is created
  node: ComponentType<NodeProps>; // custom node component
  modal?: ComponentType<BlockModalProps<Data>>; // undefined = no config (start)

  /**
   * Ids of the variables these data reference. Feeds the panel's "used in N
   * blocks" count and the delete confirmation. Takes the variable list because
   * a block that references by name (a message body) has to resolve it to an
   * id first.
   */
  usedVariables?: (data: Data, variables: FlowVariable[]) => string[];

  /**
   * Rewrites references by *name* when a variable is renamed. Only blocks that
   * store a name implement it — in practice the `{{name}}` inside a message.
   * Everything else stores ids, which renaming can't break.
   */
  renameVariable?: (data: Data, from: string, to: string) => Data;

  /**
   * Incomplete config → a short pt-BR message; `null` when fine. Surfaces as a
   * warning badge in the node header.
   */
  validate?: (data: Data, variables: FlowVariable[]) => string | null;
};

/**
 * Ties a definition's `Data` together at authoring time (so `createData`, the
 * modal and the hooks are checked against the same shape), then erases it for
 * storage in the heterogeneous registry. The erasure is the standard
 * existential-type move: the registry holds definitions of many different
 * `Data` shapes under one type, and the only place a node's untyped `data`
 * meets a typed modal is the modal host, where the cast is intentional and
 * contained.
 */
export function defineBlock<Data extends Record<string, unknown>>(
  definition: BlockDefinition<Data>,
): BlockDefinition {
  return definition as unknown as BlockDefinition;
}
