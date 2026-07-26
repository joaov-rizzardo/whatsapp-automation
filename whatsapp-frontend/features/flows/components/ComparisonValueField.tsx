"use client";

import { Variable } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VariableSelect } from "@/features/flows/components/VariableSelect";
import type { ComparisonValue } from "@/features/flows/types/comparisonValue";
import type { VariableType } from "@/features/flows/types/variable";

/**
 * The right-hand side of a comparison or an assignment: a typed value, or
 * another variable. The toggle is a button rather than a second field so the
 * row stays one line — these appear stacked several at a time in the condition
 * modal.
 *
 * The literal input follows the variable's type: a number field for números, a
 * true/false select for booleanos. Letting someone type "talvez" into a boolean
 * and only finding out at runtime is exactly what typing the variables was for.
 */
export function ComparisonValueField({
  value,
  onChange,
  type,
}: {
  value: ComparisonValue;
  onChange: (value: ComparisonValue) => void;
  type: VariableType;
}) {
  const usingVariable = value.kind === "variable";

  return (
    <div className="flex flex-1 items-center gap-1">
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
            value={value.value || "true"}
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
            value={value.value}
            placeholder={type === "number" ? "0" : "Valor"}
            onChange={(event) =>
              onChange({ kind: "literal", value: event.target.value })
            }
          />
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={usingVariable ? "Usar valor fixo" : "Usar outra variável"}
        title={usingVariable ? "Usar valor fixo" : "Usar outra variável"}
        className={cn(usingVariable && "text-primary")}
        onClick={() =>
          onChange(
            usingVariable
              ? { kind: "literal", value: "" }
              : { kind: "variable", variableId: "" },
          )
        }
      >
        <Variable className="size-4" />
      </Button>
    </div>
  );
}
