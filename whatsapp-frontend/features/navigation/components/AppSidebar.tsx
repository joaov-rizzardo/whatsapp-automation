import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { NavMain } from "@/features/navigation/components/NavMain";
import { OrgSwitcher } from "@/features/navigation/components/OrgSwitcher";
import { UserMenu } from "@/features/navigation/components/UserMenu";
import { WhatsappStatus } from "@/features/whatsapp/components/WhatsappStatus";

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <NavMain />
      </SidebarContent>

      <SidebarFooter className="gap-2">
        <WhatsappStatus />
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
