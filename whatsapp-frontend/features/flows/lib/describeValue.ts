import type { ComparisonValue } from "@/features/flows/types/comparisonValue";
import type { FlowVariable } from "@/features/flows/types/variable";

/**
 * Renders a comparison value the way it reads on a node's card: a literal as
 * itself, a variable reference by name. Shared so the condition and
 * set-variable summaries phrase the same thing identically.
 */
export function describeValue(
  value: ComparisonValue,
  variables: FlowVariable[],
): string {
  if (value.kind === "variable") {
    const variable = variables.find((item) => item.id === value.variableId);
    return variable ? variable.name : "?";
  }
  return value.value === "" ? "?" : value.value;
}
