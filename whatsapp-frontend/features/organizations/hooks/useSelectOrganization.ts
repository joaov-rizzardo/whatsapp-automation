"use client";

import { useState } from "react";
import { toast } from "sonner";

import { getOrganizationErrorMessage } from "@/features/organizations/lib/getOrganizationErrorMessage";
import { authClient } from "@/lib/auth-client";

export function useSelectOrganization() {
  const [selectingId, setSelectingId] = useState<string | null>(null);

  async function select(organizationId: string) {
    setSelectingId(organizationId);

    const { error } = await authClient.organization.setActive({
      organizationId,
    });

    if (error) {
      toast.error(getOrganizationErrorMessage(error));
      setSelectingId(null);
      return;
    }

    // Full-document navigation on purpose. The active organization lives both in
    // the server session and in Better Auth's client cache, and every page is
    // scoped to it. A soft router.push + router.refresh can replay Server
    // Components rendered for the previous org (Router Cache) and leaves the app
    // half-switched until a manual reload. A hard navigation rebuilds the whole
    // page under the new org — the same clean reset the user gets from F5. Org
    // switching is rare, so the full reload is a fair price for correctness.
    window.location.assign("/dashboard");
    // No setSelectingId(null): the spinner stays until the document unloads.
  }

  return { select, selectingId };
}
