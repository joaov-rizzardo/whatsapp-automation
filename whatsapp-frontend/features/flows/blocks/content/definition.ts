import { MessageSquareText } from "lucide-react";

import { defineBlock } from "@/features/flows/blocks/types";
import { ContentNode } from "@/features/flows/blocks/content/ContentNode";
import {
  ContentModal,
  type ContentData,
} from "@/features/flows/blocks/content/ContentModal";

export const contentDefinition = defineBlock<ContentData>({
  type: "content",
  label: "Conteúdo",
  icon: MessageSquareText,
  accentToken: "text-primary",
  handles: {
    inputs: [{ id: "in" }],
    outputs: [{ id: "out" }],
  },
  addable: true,
  singleton: false,
  createData: () => ({ text: "" }),
  node: ContentNode,
  modal: ContentModal,
});
