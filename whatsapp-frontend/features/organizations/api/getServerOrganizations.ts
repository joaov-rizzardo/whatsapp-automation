import { cookies } from "next/headers";

import {
  organizationListSchema,
  type Organization,
} from "@/features/organizations/schemas/organizationSchema";

/**
 * Lists the organizations of the signed-in user on the server. Mirrors
 * getServerSession: authClient is a browser client, so the cookie is forwarded
 * by hand to the other origin.
 */
export async function getServerOrganizations(): Promise<Organization[]> {
  const cookieHeader = (await cookies()).toString();

  if (!cookieHeader) return [];

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/organization/list`,
    {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    },
  );

  if (!response.ok) return [];

  const parsed = organizationListSchema.safeParse(await response.json());

  return parsed.success ? parsed.data : [];
}
