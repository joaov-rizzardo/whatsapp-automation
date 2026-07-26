"use client";

import type { NodeProps } from "@xyflow/react";

import { BlockShell } from "@/features/flows/blocks/BlockShell";
import { getDefinition } from "@/features/flows/blocks/registry";
import {
  findVariable,
  useFlowVariablesContext,
} from "@/features/flows/components/FlowVariablesContext";
import { describeValue } from "@/features/flows/lib/describeValue";
import { getOperator } from "@/features/flows/lib/operators";
import {
  conditionLogicLabels,
  type Comparison,
  type ConditionData,
} from "@/features/flows/blocks/condition/ConditionModal";
import type { FlowVariable } from "@/features/flows/types/variable";

/** How many comparisons fit on a card before it stops being a summary. */
const PREVIEW_LIMIT = 2;

function describeComparison(
  comparison: Comparison,
  variables: FlowVariable[],
): string {
  const variable = findVariable(variables, comparison.variableId);
  if (!variable) return "—";

  const operator = getOperator(variable.type, comparison.operator);
  if (!operator) return variable.name;

  if (operator.arity === 1) return `${variable.name} ${operator.symbol}`;
  return `${variable.name} ${operator.symbol} ${describeValue(comparison.right, variables)}`;
}

export function ConditionNode({ id, type, data, selected }: NodeProps) {
  const definition = getDefinition(type ?? "");
  const { variables } = useFlowVariablesContext();
  if (!definition) return null;

  const { logic, comparisons } = data as unknown as ConditionData;
  const preview = comparisons.slice(0, PREVIEW_LIMIT);
  const remaining = comparisons.length - preview.length;

  return (
    <BlockShell
      nodeId={id}
      definition={definition}
      data={data}
      selected={selected}
    >
      {comparisons.length === 0 ? (
        <p className="rounded-md bg-muted px-2.5 py-2 text-sm text-muted-foreground italic">
          Sem condições
        </p>
      ) : (
        <div className="flex flex-col gap-0.5 rounded-md bg-muted px-2.5 py-2">
          {preview.map((comparison, index) => (
            <p key={comparison.id} className="truncate text-xs text-foreground">
              {index > 0 ? (
                <span className="mr-1 font-semibold text-muted-foreground">
                  {conditionLogicLabels[logic]}
                </span>
              ) : null}
              {describeComparison(comparison, variables)}
            </p>
          ))}

          {remaining > 0 ? (
            <p className="text-xs text-muted-foreground">
              + {remaining} condição(ões)
            </p>
          ) : null}
        </div>
      )}
    </BlockShell>
  );
}
