"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarIdentitySkeleton } from "@/features/navigation/components/SidebarIdentitySkeleton";
import { useOrgSwitcher } from "@/features/navigation/hooks/useOrgSwitcher";
import { initialsOf } from "@/lib/initials";

export function OrgSwitcher() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { activeOrganization, organizations, select, selectingId } =
    useOrgSwitcher();

  if (!activeOrganization) return <SidebarIdentitySkeleton square />;

  const activeName = activeOrganization.name;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={activeName}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-md">
                {activeOrganization?.logo && (
                  <AvatarImage
                    src={activeOrganization.logo}
                    alt={activeName}
                    className="rounded-md"
                  />
                )}
                <AvatarFallback className="rounded-md bg-[linear-gradient(180deg,var(--purple-500),var(--purple-600))] font-semibold text-primary-foreground">
                  {initialsOf(activeName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-heading font-semibold">
                  {activeName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Organização
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Suas organizações
            </DropdownMenuLabel>
            {organizations.map((organization) => {
              const isActive = organization.id === activeOrganization?.id;
              const isSelecting = selectingId === organization.id;

              return (
                <DropdownMenuItem
                  key={organization.id}
                  className="gap-2"
                  disabled={selectingId !== null || isActive}
                  onSelect={(event) => {
                    // Keep the menu logic; setActive navigates + refreshes itself.
                    event.preventDefault();
                    if (!isActive) select(organization.id);
                  }}
                >
                  <Avatar className="size-6 rounded-sm">
                    {organization.logo && (
                      <AvatarImage
                        src={organization.logo}
                        alt={organization.name}
                        className="rounded-sm"
                      />
                    )}
                    <AvatarFallback className="rounded-sm text-xs">
                      {initialsOf(organization.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">{organization.name}</span>
                  {isSelecting ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    isActive && <Check className="size-4 text-brand" />
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2"
              onSelect={() => router.push("/onboarding")}
            >
              <div className="flex size-6 items-center justify-center rounded-sm border border-border bg-card">
                <Plus className="size-4" />
              </div>
              <span className="text-muted-foreground">Nova organização</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
