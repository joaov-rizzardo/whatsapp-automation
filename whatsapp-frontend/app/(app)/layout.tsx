import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/features/navigation/components/AppShell";
import { getServerSession } from "@/features/auth/api/getServerSession";
import { getServerOrganizations } from "@/features/organizations/api/getServerOrganizations";

/**
 * The organization gate for the whole (app) group: past here, every page can
 * assume a session and an active organization, and renders inside the app shell
 * (sidebar + top bar).
 *
 * /onboarding and /select-organization deliberately live outside this group —
 * inside it they would inherit this layout and redirect to themselves forever.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await getServerSession();

  if (!session) redirect("/login");

  // Only the user without an active organization pays for the list — the common
  // path stays at a single request.
  if (!session.session.activeOrganizationId) {
    const organizations = await getServerOrganizations();
    redirect(organizations.length === 0 ? "/onboarding" : "/select-organization");
  }

  // Restore the persisted collapse state so the sidebar doesn't flash open.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return <AppShell defaultOpen={defaultOpen}>{children}</AppShell>;
}
