"use client";

import { cn } from "@/lib/utils";
import { weekdays } from "@/features/flows/lib/specialValues";

/**
 * Picks one or more weekdays. Seven chips in a row rather than a popover with
 * checkboxes: "de segunda a sexta" is the reason this type exists, and it has
 * to be five clicks with nothing to open first.
 *
 * They are toggle buttons, not a listbox — each one is independently on or off,
 * which is what `aria-pressed` says.
 */
export function WeekdayPicker({
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
    <div className="flex flex-1 flex-wrap gap-1">
      {weekdays.map((day) => {
        const active = values.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            aria-pressed={active}
            aria-label={day.label}
            title={day.label}
            onClick={() => toggle(day.value)}
            className={cn(
              // Mesma altura, mesmo raio e mesmo foco dos campos da linha —
              // são chips, mas dividem a linha com um select.
              "size-10 rounded-md border text-sm font-medium transition-[color,box-shadow,border-color,background-color] duration-fast ease-standard",
              "focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {day.initial}
          </button>
        );
      })}
    </div>
  );
}
