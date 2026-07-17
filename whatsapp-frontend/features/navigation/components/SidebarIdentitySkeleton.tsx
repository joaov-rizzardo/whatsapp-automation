import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * Placeholder for the org switcher and user menu while Better Auth's client
 * session resolves. Matches the `size="lg"` menu button footprint so the
 * sidebar keeps its height instead of the button popping in after hydration.
 */
export function SidebarIdentitySkeleton({ square = false }: { square?: boolean }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex h-12 items-center gap-2 rounded-md p-2">
          <Skeleton className={square ? "size-8 rounded-md" : "size-8 rounded-full"} />
          <div className="grid flex-1 gap-1.5 group-data-[collapsible=icon]:hidden">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
