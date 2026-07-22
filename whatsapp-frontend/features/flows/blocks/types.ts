import type { ComponentType } from "react";
import type { NodeProps } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";

/**
 * The block registry contract — the heart of the editor's extensibility. A block
 * is *described by data*: its handles, colour, icon, default data, node component
 * and (optional) config modal all live in one `BlockDefinition`. Adding a new
 * block type (e.g. "randomizar" with N outputs) is a new definition, never a
 * change to the canvas, palette or modal host.
 */

/** One connection point on a node. N outputs = N specs. */
export type HandleSpec = {
  id: string; // stable id, used as edge.sourceHandle / targetHandle
  label?: string; // optional label shown next to the handle
};

/** Props every block modal receives. */
export type BlockModalProps<Data> = {
  data: Data;
  onChange: (data: Data) => void; // writes back into the node's data
  onClose: () => void;
};

export type BlockDefinition<
  Data extends Record<string, unknown> = Record<string, unknown>,
> = {
  type: string; // matches node.type ("start" | "content")
  label: string; // pt-BR label, shown in the palette and card header
  icon: LucideIcon;
  accentToken: string; // design-system colour token (e.g. "text-primary")
  handles: {
    inputs: HandleSpec[]; // start: []            | content: [{ id: "in" }]
    outputs: HandleSpec[]; // start: [{ id: "out" }] | content: [{ id: "out" }]
  };
  addable: boolean; // shows up in the palette?  start: false, content: true
  singleton: boolean; // single, non-deletable?    start: true,  content: false
  createData: () => Data; // default data when the node is created
  node: ComponentType<NodeProps>; // custom node component
  modal?: ComponentType<BlockModalProps<Data>>; // undefined = no config (start)
};

/**
 * Ties a definition's `Data` together at authoring time (so `createData` and the
 * modal are checked against the same shape), then erases it for storage in the
 * heterogeneous registry. The erasure is the standard existential-type move: the
 * registry holds definitions of many different `Data` shapes under one type, and
 * the only place a node's untyped `data` meets a typed modal is the modal host,
 * where the cast is intentional and contained.
 */
export function defineBlock<Data extends Record<string, unknown>>(
  definition: BlockDefinition<Data>,
): BlockDefinition {
  return definition as unknown as BlockDefinition;
}
