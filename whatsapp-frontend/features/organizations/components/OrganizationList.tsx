"use client";

import { ChevronRight, Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSelectOrganization } from "@/features/organizations/hooks/useSelectOrganization";
import type { Organization } from "@/features/organizations/schemas/organizationSchema";
import { initialsOf } from "@/lib/initials";

export function OrganizationList({
  organizations,
}: {
  organizations: Organization[];
}) {
  const { select, selectingId } = useSelectOrganization();

  return (
    <ul className="flex flex-col gap-2">
      {organizations.map((organization) => {
        const isSelecting = selectingId === organization.id;

        return (
          <li key={organization.id}>
            <button
              type="button"
              onClick={() => select(organization.id)}
              disabled={selectingId !== null}
              className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-3 text-left transition-colors duration-fast hover:bg-accent disabled:opacity-60"
            >
              <Avatar>
                {organization.logo && (
                  <AvatarImage src={organization.logo} alt={organization.name} />
                )}
                <AvatarFallback>{initialsOf(organization.name)}</AvatarFallback>
              </Avatar>
              <span className="flex-1 font-medium">{organization.name}</span>
              {isSelecting ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
