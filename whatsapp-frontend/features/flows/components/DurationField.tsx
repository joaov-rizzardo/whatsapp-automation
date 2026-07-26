"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Duration, DurationUnit } from "@/features/flows/types/duration";
import { durationUnitLabels } from "@/features/flows/types/duration";

/**
 * A duration: amount + unit. Shared by the delay block and the wait-reply
 * block's timeout, so "5 minutos" reads and behaves the same in both.
 */
export function DurationField({
  value,
  onChange,
  id,
}: {
  value: Duration;
  onChange: (duration: Duration) => void;
  id?: string;
}) {
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type="number"
        min={1}
        className="w-28"
        value={value.value}
        onChange={(event) =>
          // An empty input yields NaN; store 0 so `validate` catches it rather
          // than letting NaN leak into the node's data.
          onChange({ ...value, value: Number(event.target.value) || 0 })
        }
      />

      <Select
        value={value.unit}
        onValueChange={(unit) =>
          onChange({ ...value, unit: unit as DurationUnit })
        }
      >
        <SelectTrigger className="flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(durationUnitLabels).map(([unit, label]) => (
            <SelectItem key={unit} value={unit}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
