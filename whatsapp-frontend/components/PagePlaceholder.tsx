import type { LucideIcon } from "lucide-react";

/**
 * Empty state for routes whose feature isn't built yet: an icon, the section
 * name, and a one-line note. Keeps the navigation walkable end to end before the
 * real screens exist.
 */
export function PagePlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs">
        <Icon className="size-6" />
      </div>
      <h1 className="font-heading text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-muted-foreground">{description}</p>
    </div>
  );
}
