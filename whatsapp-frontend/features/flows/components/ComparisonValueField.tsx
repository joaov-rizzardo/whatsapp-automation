"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ValueSourceToggle } from "@/features/flows/components/ValueSourceToggle";
import { VariableSelect } from "@/features/flows/components/VariableSelect";
import type { ComparisonValue } from "@/features/flows/types/comparisonValue";
import type { CustomVariableType } from "@/features/flows/types/variable";

/**
 * The right-hand side of a comparison or an assignment: a typed value, or
 * another variable. The source is a two-segment toggle (`ValueSourceToggle`)
 * rather than a second field so the row stays one line — these appear stacked
 * several at a time in the condition modal.
 *
 * The literal input follows the variable's type: a number field for números, a
 * true/false select for booleanos. Letting someone type "talvez" into a boolean
 * and only finding out at runtime is exactly what typing the variables was for.
 *
 * The special types (hora, data…) don't come through here — their fields are
 * `ConditionValueField`'s, because a range and a set aren't one value.
 */
export function ComparisonValueField({
  value,
  onChange,
  type,
}: {
  value: ComparisonValue;
  onChange: (value: ComparisonValue) => void;
  type: CustomVariableType;
}) {
  const usingVariable = value.kind === "variable";
  const literal = value.kind === "literal" ? value.value : "";

  return (
    <div className="flex flex-1 items-center gap-2">
      <div className="flex-1">
        {usingVariable ? (
          <VariableSelect
            value={value.variableId || null}
            onChange={(variableId) => onChange({ kind: "variable", variableId })}
            filterType={type}
            placeholder="Variável"
          />
        ) : type === "boolean" ? (
          <Select
            value={literal || "true"}
            onValueChange={(next) => onChange({ kind: "literal", value: next })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Verdadeiro</SelectItem>
              <SelectItem value="false">Falso</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={type === "number" ? "number" : "text"}
            value={literal}
            placeholder={type === "number" ? "0" : "Valor"}
            onChange={(event) =>
              onChange({ kind: "literal", value: event.target.value })
            }
          />
        )}
      </div>

      <ValueSourceToggle
        value={usingVariable ? "variable" : "literal"}
        onChange={(source) =>
          onChange(
            source === "variable"
              ? { kind: "variable", variableId: "" }
              : { kind: "literal", value: "" },
          )
        }
      />
    </div>
  );
}
