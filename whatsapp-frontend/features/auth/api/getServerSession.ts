import { cookies } from "next/headers";

import { sessionSchema, type Session } from "@/features/auth/schemas/sessionSchema";

/**
 * Resolves the session on the server. This is real authorization, not the
 * optimistic cookie check in proxy.ts — the backend validates the cookie.
 *
 * The API is a different origin, so the cookie has to be forwarded by hand.
 */
export async function getServerSession(): Promise<Session | null> {
  // Next 16: cookies() is async — synchronous access was removed.
  const cookieHeader = (await cookies()).toString();

  if (!cookieHeader) return null;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/get-session`,
    {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const parsed = sessionSchema.safeParse(await response.json());

  return parsed.success ? parsed.data : null;
}
