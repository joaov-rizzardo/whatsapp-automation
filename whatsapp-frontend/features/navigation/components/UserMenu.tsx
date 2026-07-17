"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";

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
import { useSignOut } from "@/features/auth/hooks/useSignOut";
import { useSession } from "@/lib/auth-client";
import { initialsOf } from "@/lib/initials";

function UserIdentity({ name, email }: { name: string; email: string }) {
  return (
    <div className="grid flex-1 text-left leading-tight">
      <span className="truncate font-medium">{name}</span>
      <span className="truncate text-xs text-muted-foreground">{email}</span>
    </div>
  );
}

export function UserMenu() {
  const { isMobile } = useSidebar();
  const { data: session } = useSession();
  const { handleSignOut, isSigningOut } = useSignOut();

  const user = session?.user;
  if (!user) return <SidebarIdentitySkeleton />;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={user.name}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8">
                {user.image && <AvatarImage src={user.image} alt={user.name} />}
                <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
              </Avatar>
              <UserIdentity name={user.name} email={user.email} />
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="end"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="flex items-center gap-2 py-2 font-normal">
              <Avatar className="size-8">
                {user.image && <AvatarImage src={user.image} alt={user.name} />}
                <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
              </Avatar>
              <UserIdentity name={user.name} email={user.email} />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={isSigningOut}
              onSelect={(event) => {
                event.preventDefault();
                handleSignOut();
              }}
            >
              <LogOut />
              {isSigningOut ? "Saindo..." : "Sair"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
