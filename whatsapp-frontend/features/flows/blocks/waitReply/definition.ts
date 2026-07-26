import { MessageCircleQuestionMark } from "lucide-react";

import { defineBlock } from "@/features/flows/blocks/types";
import { WaitReplyNode } from "@/features/flows/blocks/waitReply/WaitReplyNode";
import {
  WaitReplyModal,
  type WaitReplyData,
} from "@/features/flows/blocks/waitReply/WaitReplyModal";

export const waitReplyDefinition = defineBlock<WaitReplyData>({
  type: "waitReply",
  label: "Aguardar resposta",
  description: "Espera o contato responder",
  icon: MessageCircleQuestionMark,
  category: "input",
  handles: {
    inputs: [{ id: "in" }],
    // Two outputs are the whole point of the block: they're what lets a flow
    // re-ask or give up on an inactive contact.
    outputs: [
      { id: "reply", label: "Resposta recebida" },
      { id: "timeout", label: "Tempo esgotado" },
    ],
  },
  addable: true,
  singleton: false,
  createData: () => ({
    variableId: null,
    timeout: { value: 5, unit: "minutes" },
  }),
  node: WaitReplyNode,
  modal: WaitReplyModal,

  usedVariables: (data) => (data.variableId ? [data.variableId] : []),

  validate: (data, variables) => {
    if (data.timeout.value <= 0) return "Defina o tempo máximo";
    if (
      data.variableId &&
      !variables.some((variable) => variable.id === data.variableId)
    ) {
      return "A variável de destino foi removida";
    }
    return null;
  },
});
