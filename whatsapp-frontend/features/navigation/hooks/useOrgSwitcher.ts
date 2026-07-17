"use client";

import { useSelectOrganization } from "@/features/organizations/hooks/useSelectOrganization";
import { authClient } from "@/lib/auth-client";

/**
 * The sidebar org switcher's data and behaviour in one place: the active
 * organization, the list to switch between, and the setActive action.
 *
 * Reads from Better Auth's own reactive hooks (not React Query) — the same
 * single-source-of-truth rule the organizations feature follows.
 */
export function useOrgSwitcher() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: organizations } = authClient.useListOrganizations();
  const { select, selectingId } = useSelectOrganization();

  return {
    activeOrganization,
    organizations: organizations ?? [],
    select,
    selectingId,
  };
}
