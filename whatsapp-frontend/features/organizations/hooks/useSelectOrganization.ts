"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { getOrganizationErrorMessage } from "@/features/organizations/lib/getOrganizationErrorMessage";
import { authClient } from "@/lib/auth-client";

export function useSelectOrganization() {
  const router = useRouter();
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

    router.push("/dashboard");
    // Not optional: without it the Router Cache serves the dashboard rendered
    // for the previous organization, and the switch appears to do nothing.
    router.refresh();
  }

  return { select, selectingId };
}
