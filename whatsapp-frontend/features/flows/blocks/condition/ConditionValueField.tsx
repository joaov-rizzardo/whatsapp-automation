"use client";

import { ComparisonValueField } from "@/features/flows/components/ComparisonValueField";
import { MonthPicker } from "@/features/flows/blocks/condition/MonthPicker";
import { SpecialValueInput } from "@/features/flows/blocks/condition/SpecialValueInput";
import { WeekdayPicker } from "@/features/flows/blocks/condition/WeekdayPicker";
import type { OperatorValueKind } from "@/features/flows/lib/operators";
import type { ComparisonValue } from "@/features/flows/types/comparisonValue";
import { isSpecialType, type FlowVariable } from "@/features/flows/types/variable";

/**
 * The right-hand side of one comparison, chosen by the operator's value shape
 * and the variable's type. This is the only place that knows a range is two
 * fields and a set is a picker — the modal just hands it a value and takes one
 * back.
 *
 * A special type never offers "usar outra variável": no flow variable can be a
 * hora or a data, so the reference could only point at a different type.
 */
export function ConditionValueField({
  variable,
  valueKind,
  value,
  onChange,
}: {
  variable: FlowVariable;
  valueKind: OperatorValueKind;
  value: ComparisonValue;
  onChange: (value: ComparisonValue) => void;
}) {
  if (valueKind === "none") return null;

  const type = variable.type;

  if (!isSpecialType(type)) {
    return (
      <ComparisonValueField
        value={value}
        onChange={onChange}
        type={type}
      />
    );
  }

  if (valueKind === "set") {
    const values = value.kind === "set" ? value.values : [];
    const update = (next: string[]) => onChange({ kind: "set", values: next });

    return type === "weekday" ? (
      <WeekdayPicker values={values} onChange={update} />
    ) : (
      <MonthPicker values={values} onChange={update} />
    );
  }

  if (valueKind === "range") {
    const from = value.kind === "range" ? value.from : "";
    const to = value.kind === "range" ? value.to : "";

    return (
      <div className="flex flex-1 items-center gap-2">
        <SpecialValueInput
          type={type}
          value={from}
          onChange={(next) => onChange({ kind: "range", from: next, to })}
        />
        <span className="text-sm text-muted-foreground">e</span>
        <SpecialValueInput
          type={type}
          value={to}
          onChange={(next) => onChange({ kind: "range", from, to: next })}
        />
      </div>
    );
  }

  return (
    <SpecialValueInput
      type={type}
      value={value.kind === "literal" ? value.value : ""}
      onChange={(next) => onChange({ kind: "literal", value: next })}
    />
  );
}
