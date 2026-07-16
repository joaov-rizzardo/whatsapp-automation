import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  // Required: the API is a different origin, and without this the browser
  // never sends the session cookie.
  fetchOptions: { credentials: "include" },
  // No inferOrgAdditionalFields() here: it would import the backend's auth type
  // across the folder boundary, and HTTP is the only contract between the two.
  // We add no additional fields, so the bare client is enough.
  plugins: [organizationClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
