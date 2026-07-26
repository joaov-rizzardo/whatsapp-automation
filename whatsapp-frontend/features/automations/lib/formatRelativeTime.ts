const relativeFormatter = new Intl.RelativeTimeFormat("pt-BR", {
  numeric: "auto",
  style: "long",
});

/** Cada degrau é quantas unidades cabem antes de subir para a próxima. */
const divisions: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

/**
 * "há 2 dias", "há 20 minutos". Sobe de unidade até a data caber, para nunca
 * mostrar "há 4.320 minutos".
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  let distance = (new Date(iso).getTime() - now) / 1000;

  for (const division of divisions) {
    if (Math.abs(distance) < division.amount) {
      return relativeFormatter.format(Math.round(distance), division.unit);
    }
    distance /= division.amount;
  }

  return relativeFormatter.format(Math.round(distance), "year");
}
