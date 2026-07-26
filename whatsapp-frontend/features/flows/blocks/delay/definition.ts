import { Hourglass } from "lucide-react";

import { defineBlock } from "@/features/flows/blocks/types";
import { DelayNode } from "@/features/flows/blocks/delay/DelayNode";
import {
  DelayModal,
  type DelayData,
} from "@/features/flows/blocks/delay/DelayModal";

export const delayDefinition = defineBlock<DelayData>({
  type: "delay",
  label: "Aguardar",
  description: "Pausa o fluxo por um tempo",
  icon: Hourglass,
  category: "time",
  handles: {
    inputs: [{ id: "in" }],
    outputs: [{ id: "out" }],
  },
  addable: true,
  singleton: false,
  createData: () => ({ duration: { value: 3, unit: "seconds" } }),
  node: DelayNode,
  modal: DelayModal,
  validate: (data) =>
    data.duration.value <= 0 ? "Defina o tempo de espera" : null,
});
