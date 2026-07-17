import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/navigation/components/AppSidebar";
import { HeaderTitle } from "@/features/navigation/components/HeaderTitle";

/**
 * The frame for every page in the (app) group: a collapsible, responsive
 * sidebar plus a top bar, with the main content floating as an inset panel over
 * the tinted chrome. Server component — `children` are the route's Server
 * Components, rendered on the server and passed through the client sidebar.
 *
 * The shell is pinned to the viewport (`h-svh`) and the content scrolls inside
 * the inset panel, so the top bar stays anchored to the panel's rounded top
 * instead of detaching above it.
 *
 * `defaultOpen` restores the persisted collapse state so the sidebar doesn't
 * flash open on navigation; the layout reads it from the cookie.
 */
export function AppShell({
  children,
  defaultOpen,
}: {
  children: React.ReactNode;
  defaultOpen: boolean;
}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen} className="h-svh">
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-1 data-[orientation=vertical]:h-5"
          />
          <HeaderTitle />
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
