import {
  LayoutDashboard,
  Users,
  Workflow,
  Megaphone,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * The primary navigation of the logged-in area. Order is intentional: the day
 * flows from looking (Dashboard, Leads) to building (Automações, Campanhas),
 * with Configurações last.
 */
export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Automações", href: "/automacoes", icon: Workflow },
  { label: "Campanhas", href: "/campanhas", icon: Megaphone },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];
