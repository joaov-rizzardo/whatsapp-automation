"use client";

import { usePathname } from "next/navigation";

import { isActiveRoute } from "@/features/navigation/lib/isActiveRoute";
import { navItems } from "@/features/navigation/lib/navItems";

/** Names the section the user is in, so the top bar orients instead of decorates. */
export function HeaderTitle() {
  const pathname = usePathname();
  const current = navItems.find((item) => isActiveRoute(pathname, item.href));

  if (!current) return null;

  return (
    <span className="font-heading text-base font-semibold">{current.label}</span>
  );
}
