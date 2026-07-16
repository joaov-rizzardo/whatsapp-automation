"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function useSignOut() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    await authClient.signOut();

    router.push("/login");
    // Without this the router cache would still hold the signed-in render.
    router.refresh();
  };

  return { handleSignOut, isSigningOut };
}
