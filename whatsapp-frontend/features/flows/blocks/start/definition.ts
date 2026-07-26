import { Play } from "lucide-react";

import { defineBlock } from "@/features/flows/blocks/types";
import { StartNode } from "@/features/flows/blocks/start/StartNode";

/** The start block carries no configuration — it's a pure anchor. */
export type StartData = Record<string, never>;

export const startDefinition = defineBlock<StartData>({
  type: "start",
  label: "Início",
  description: "Onde o fluxo começa",
  icon: Play,
  // Declared for completeness: the anchor paints itself with the brand
  // gradient and never appears in the palette, so this category is inert.
  category: "message",
  handles: {
    inputs: [],
    outputs: [{ id: "out" }],
  },
  addable: false, // already placed and unique — never in the palette
  singleton: true, // one per canvas, not deletable
  createData: () => ({}),
  node: StartNode,
  // no modal — the anchor has nothing to configure
});
