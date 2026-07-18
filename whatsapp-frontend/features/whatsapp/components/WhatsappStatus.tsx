"use client";

import Link from "next/link";
import { Smartphone } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useWhatsappConnection } from "@/features/whatsapp/hooks/useWhatsappConnection";
import { statusPresentation } from "@/features/whatsapp/lib/statusPresentation";
import { toSidebarStatus } from "@/features/whatsapp/lib/toSidebarStatus";
import { cn } from "@/lib/utils";

/**
 * Sidebar section reporting whether the WhatsApp number is connected. Links to
 * /whatsapp, where connecting/disconnecting the phone lives.
 */
export function WhatsappStatus() {
  const { connection } = useWhatsappConnection();
  const { label, dotClassName, pulse } = statusPresentation(
    toSidebarStatus(connection?.status),
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          tooltip={`WhatsApp: ${label}`}
          className="no-underline hover:no-underline"
        >
          <Link href="/whatsapp">
            <span className="relative flex shrink-0 items-center justify-center">
              <Smartphone className="text-muted-foreground" />
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2 ring-[var(--sidebar)]",
                  dotClassName,
                  pulse && "animate-pulse",
                )}
              />
            </span>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-xs text-muted-foreground">
                WhatsApp
              </span>
              <span className="truncate font-medium text-foreground">
                {label}
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
