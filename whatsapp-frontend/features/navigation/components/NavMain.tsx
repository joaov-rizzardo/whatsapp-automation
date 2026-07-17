"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { isActiveRoute } from "@/features/navigation/lib/isActiveRoute";
import { navItems } from "@/features/navigation/lib/navItems";
import { cn } from "@/lib/utils";

export function NavMain() {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navegação</SidebarGroupLabel>
      <SidebarMenu>
        {navItems.map((item) => {
          const active = isActiveRoute(pathname, item.href);

          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={item.label}
                className={cn(
                  "font-medium text-foreground no-underline hover:no-underline [&_svg]:text-muted-foreground hover:[&_svg]:text-[var(--purple-700)]",
                  // Active item: a filled purple pill, same gradient language as
                  // the primary button. `!` beats the base `data-active` text
                  // rule, whose attribute selector otherwise wins over white.
                  active &&
                    "border-[var(--purple-700)] bg-[linear-gradient(180deg,var(--purple-500),var(--purple-600))] text-primary-foreground! shadow-[var(--shadow-zap-sm),var(--shadow-inset-top)] [&_svg]:text-primary-foreground!",
                )}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
