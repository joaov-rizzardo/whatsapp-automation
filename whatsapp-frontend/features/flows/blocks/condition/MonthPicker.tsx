"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { fieldVariants } from "@/components/ui/field-base";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatSpecialSet, months } from "@/features/flows/lib/specialValues";

/**
 * Picks one or more months. Twelve chips in a row would wrap into a wall, so
 * this one hides behind a popover and summarises the choice on the trigger —
 * "dez, jan" while it's short, a count once it isn't.
 */
export function MonthPicker({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    onChange(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : values.concat(value),
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          // Tem cara de select, então usa a medida do campo — não uma cópia
          // aproximada dela.
          fieldVariants(),
          "flex w-fit flex-1 items-center justify-between gap-2 text-left hover:bg-muted/60",
          values.length === 0 && "text-muted-foreground",
        )}
      >
        <span className="truncate">{summarise(values)}</span>
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {months.map((month) => (
            <div key={month.value} className="flex items-center gap-2">
              <Checkbox
                id={`month-${month.value}`}
                checked={values.includes(month.value)}
                onCheckedChange={() => toggle(month.value)}
              />
              <Label
                htmlFor={`month-${month.value}`}
                className="flex-1 cursor-pointer py-1 text-sm font-normal"
              >
                {month.label}
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Four months still read as a list; more than that only reads as a number. */
function summarise(values: string[]): string {
  if (values.length === 0) return "Escolha os meses";
  if (values.length > 4) return `${values.length} meses`;
  return formatSpecialSet("month", values);
}
