import { Shuffle } from "lucide-react";

import { defineBlock } from "@/features/flows/blocks/types";
import { RandomizerNode } from "@/features/flows/blocks/randomizer/RandomizerNode";
import {
  RandomizerModal,
  totalPercentage,
  type RandomizerData,
} from "@/features/flows/blocks/randomizer/RandomizerModal";

/**
 * The block that proves the registry: its outputs come from its *data*, not
 * from this file. Adding a branch grows the card by one handle, and the editor
 * cleans up any edge left hanging by a removed one — none of which is coded
 * here.
 */
export const randomizerDefinition = defineBlock<RandomizerData>({
  type: "randomizer",
  label: "Randomizar",
  description: "Sorteia entre várias saídas",
  icon: Shuffle,
  category: "logic",
  handles: (data) => ({
    inputs: [{ id: "in" }],
    outputs: data.branches.map((branch) => ({
      id: branch.id,
      label: `${branch.label} · ${branch.percentage}%`,
    })),
  }),
  addable: true,
  singleton: false,
  createData: () => ({
    branches: [
      { id: "branch-a", label: "Saída A", percentage: 50 },
      { id: "branch-b", label: "Saída B", percentage: 50 },
    ],
  }),
  node: RandomizerNode,
  modal: RandomizerModal,

  validate: (data) => {
    const total = totalPercentage(data.branches);
    return total === 100 ? null : `As saídas somam ${total}%`;
  },
});
