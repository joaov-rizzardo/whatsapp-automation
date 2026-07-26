"use client";

import type { NodeProps } from "@xyflow/react";
import { ArrowDownToLine } from "lucide-react";

import { BlockShell } from "@/features/flows/blocks/BlockShell";
import { getDefinition } from "@/features/flows/blocks/registry";
import {
  findVariable,
  useFlowVariablesContext,
} from "@/features/flows/components/FlowVariablesContext";
import { formatDuration } from "@/features/flows/types/duration";
import type { WaitReplyData } from "@/features/flows/blocks/waitReply/WaitReplyModal";

export function WaitReplyNode({ id, type, data, selected }: NodeProps) {
  const definition = getDefinition(type ?? "");
  const { variables } = useFlowVariablesContext();
  if (!definition) return null;

  const config = data as unknown as WaitReplyData;
  const target = findVariable(variables, config.variableId);

  return (
    <BlockShell
      nodeId={id}
      definition={definition}
      data={data}
      selected={selected}
    >
      <p className="rounded-md bg-muted px-2.5 py-2 text-sm text-foreground">
        Espera até {formatDuration(config.timeout)}
      </p>

      {target ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowDownToLine className="size-3.5" />
          salva em {target.name}
        </p>
      ) : null}
    </BlockShell>
  );
}
