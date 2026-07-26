/**
 * A configured amount of time. Shared by the delay block and the wait-reply
 * timeout — one shape, one formatter, so the two blocks can never phrase the
 * same thing differently on the canvas.
 */

export type DurationUnit = "seconds" | "minutes" | "hours";

export type Duration = {
  value: number;
  unit: DurationUnit;
};

export const durationUnitLabels: Record<DurationUnit, string> = {
  seconds: "segundos",
  minutes: "minutos",
  hours: "horas",
};

const singularLabels: Record<DurationUnit, string> = {
  seconds: "segundo",
  minutes: "minuto",
  hours: "hora",
};

export function formatDuration(duration: Duration): string {
  const label =
    duration.value === 1
      ? singularLabels[duration.unit]
      : durationUnitLabels[duration.unit];
  return `${duration.value} ${label}`;
}
