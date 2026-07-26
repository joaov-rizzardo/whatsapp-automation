import { Play } from "lucide-react";

import { defineBlock } from "@/features/flows/blocks/types";
import { StartNode } from "@/features/flows/blocks/start/StartNode";
import {
  StartModal,
  type StartData,
} from "@/features/flows/blocks/start/StartModal";

/**
 * A âncora do fluxo. Deixou de ser puro enfeite: é ela que guarda o **gatilho**,
 * o que faz a conversa começar. Continua singleton e fora da paleta; o que
 * ganhou foi um modal — e com ele o gear vem de graça, porque `BlockActions`
 * deriva o botão de `definition.modal`.
 */
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
  createData: () => ({ trigger: { kind: "none" } }),
  node: StartNode,
  modal: StartModal,
  validate: (data) => {
    if (data.trigger.kind === "none") return "Defina o gatilho do fluxo";
    if (data.trigger.kind === "keyword" && data.trigger.keywords.length === 0) {
      return "Adicione ao menos uma palavra-chave";
    }
    return null;
  },
});
