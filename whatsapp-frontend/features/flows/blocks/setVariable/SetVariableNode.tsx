"use client";

import type { NodeProps } from "@xyflow/react";

import { BlockShell } from "@/features/flows/blocks/BlockShell";
import { getDefinition } from "@/features/flows/blocks/registry";
import {
  findVariable,
  useFlowVariablesContext,
} from "@/features/flows/components/FlowVariablesContext";
import { describeValue } from "@/features/flows/lib/describeValue";
import type {
  SetVariableData,
  SetVariableOperation,
} from "@/features/flows/blocks/setVariable/SetVariableModal";

const operationSymbols: Record<SetVariableOperation, string> = {
  set: "=",
  increment: "+=",
  decrement: "-=",
};

export function SetVariableNode({ id, type, data, selected }: NodeProps) {
  const definition = getDefinition(type ?? "");
  const { variables } = useFlowVariablesContext();
  if (!definition) return null;

  const config = data as unknown as SetVariableData;
  const target = findVariable(variables, config.variableId);

  return (
    <BlockShell
      nodeId={id}
      definition={definition}
      data={data}
      selected={selected}
    >
      <p className="truncate rounded-md bg-muted px-2.5 py-2 font-mono text-xs text-foreground">
        {target ? (
          <>
            {target.name} {operationSymbols[config.operation]}{" "}
            {describeValue(config.value, variables)}
          </>
        ) : (
          <span className="font-sans text-sm text-muted-foreground italic">
            Sem variável
          </span>
        )}
      </p>
    </BlockShell>
  );
}
