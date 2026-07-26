import { MessageSquareText } from "lucide-react";

import { defineBlock } from "@/features/flows/blocks/types";
import { ContentNode } from "@/features/flows/blocks/content/ContentNode";
import {
  ContentModal,
  type ContentData,
} from "@/features/flows/blocks/content/ContentModal";
import {
  extractVariableNames,
  renameInterpolation,
} from "@/features/flows/lib/interpolation";

export const contentDefinition = defineBlock<ContentData>({
  type: "content",
  label: "Conteúdo",
  description: "Envia uma mensagem de texto",
  icon: MessageSquareText,
  category: "message",
  handles: {
    inputs: [{ id: "in" }],
    outputs: [{ id: "out" }],
  },
  addable: true,
  singleton: false,
  createData: () => ({ text: "", typingSeconds: 0 }),
  node: ContentNode,
  modal: ContentModal,

  // The only block that references variables by *name* (they're typed inside
  // the message), so it's the only one that has to resolve names to ids — and
  // the only one that needs rewriting when a variable is renamed.
  usedVariables: (data, variables) =>
    extractVariableNames(data.text)
      .map((name) => variables.find((variable) => variable.name === name)?.id)
      .filter((id): id is string => Boolean(id)),

  renameVariable: (data, from, to) => ({
    ...data,
    text: renameInterpolation(data.text, from, to),
  }),

  validate: (data, variables) => {
    if (!data.text.trim()) return "Sem mensagem";

    const unknownName = extractVariableNames(data.text).find(
      (name) => !variables.some((variable) => variable.name === name),
    );
    if (unknownName) return `A variável {{${unknownName}}} não existe`;

    return null;
  },
});
