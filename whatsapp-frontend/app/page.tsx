import { redirect } from "next/navigation";

import { getServerSession } from "@/features/auth/api/getServerSession";
import { getServerOrganizations } from "@/features/organizations/api/getServerOrganizations";

export default async function RootPage() {
  const session = await getServerSession();

  if (!session) redirect("/login");

  if (!session.session.activeOrganizationId) {
    const organizations = await getServerOrganizations();
    redirect(organizations.length === 0 ? "/onboarding" : "/select-organization");
  }

  redirect("/dashboard");
}
