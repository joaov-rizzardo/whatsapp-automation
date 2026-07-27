import {
  formatSpecialSet,
  formatSpecialValue,
} from "@/features/flows/lib/specialValues";
import type { ComparisonValue } from "@/features/flows/types/comparisonValue";
import {
  isSpecialType,
  type FlowVariable,
  type VariableType,
} from "@/features/flows/types/variable";

/**
 * Renders a comparison value the way it reads on a node's card: a literal as
 * itself, a variable reference by name, a range as "de e até", a set as its
 * short labels. Shared so the condition and set-variable summaries phrase the
 * same thing identically.
 *
 * `type` is what turns `"2026-12-01"` into `01/12/2026` and `"1"` into `seg` —
 * without it the card would show what we store, not what the user picked.
 */
export function describeValue(
  value: ComparisonValue,
  variables: FlowVariable[],
  type?: VariableType,
): string {
  const special = type && isSpecialType(type) ? type : null;
  const one = (raw: string) =>
    raw === "" ? "?" : special ? formatSpecialValue(special, raw) : raw;

  switch (value.kind) {
    case "variable": {
      const variable = variables.find((item) => item.id === value.variableId);
      return variable ? variable.name : "?";
    }
    case "range":
      return `${one(value.from)} e ${one(value.to)}`;
    case "set":
      return special
        ? formatSpecialSet(special, value.values)
        : value.values.join(", ") || "?";
    case "literal":
      return one(value.value);
  }
}
