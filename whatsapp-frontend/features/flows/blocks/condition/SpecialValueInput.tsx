"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { months, weekdays } from "@/features/flows/lib/specialValues";
import type { SpecialVariableType } from "@/features/flows/types/variable";

/**
 * One value of a special type — the building block of both the single-value
 * comparison and the two ends of a range.
 *
 * The native `time` and `date` inputs are deliberate: they bring the OS picker,
 * the keyboard behaviour and the locale mask for free, and there is no shadcn
 * equivalent installed. A hand-rolled masked field would be worse at all three.
 */
export function SpecialValueInput({
  type,
  value,
  onChange,
  id,
}: {
  type: SpecialVariableType;
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  if (type === "time" || type === "date") {
    return (
      <Input
        id={id}
        type={type}
        value={value}
        className="flex-1"
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  const options = type === "month" ? months : weekdays;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="flex-1">
        <SelectValue placeholder={type === "month" ? "Mês" : "Dia"} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
