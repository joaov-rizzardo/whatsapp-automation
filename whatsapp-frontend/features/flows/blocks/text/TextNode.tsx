"use client";

import type { NodeProps } from "@xyflow/react";
import { Keyboard } from "lucide-react";

import { cn } from "@/lib/utils";
import { BlockShell } from "@/features/flows/blocks/BlockShell";
import { getDefinition } from "@/features/flows/blocks/registry";
import type { TextData } from "@/features/flows/blocks/text/TextModal";

/**
 * A text block: a preview of the message it sends, plus a badge with the
 * typing time when there is one.
 */
export function TextNode({ id, type, data, selected }: NodeProps) {
  const definition = getDefinition(type ?? "");
  if (!definition) return null;

  const { text, typingSeconds } = data as unknown as TextData;

  return (
    <BlockShell
      nodeId={id}
      definition={definition}
      data={data}
      selected={selected}
    >
      <p
        className={cn(
          "line-clamp-3 rounded-md bg-muted px-2.5 py-2 text-sm",
          text ? "text-foreground" : "text-muted-foreground italic",
        )}
      >
        {text || "Sem mensagem"}
      </p>

      {typingSeconds > 0 ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Keyboard className="size-3.5" />
          digitando por {typingSeconds}s
        </p>
      ) : null}
    </BlockShell>
  );
}
