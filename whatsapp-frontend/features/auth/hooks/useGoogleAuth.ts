"use client";

import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);

  const signInWithGoogle = async () => {
    setIsLoading(true);

    // A full-page redirect to the backend, which redirects on to Google — not a
    // fetch. On success the browser lands back here, so isLoading is only reset
    // when something goes wrong and we stay on the page.
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/dashboard`,
    });

    if (error) {
      toast.error("Não foi possível entrar com o Google. Tente novamente.");
      setIsLoading(false);
    }
  };

  return { signInWithGoogle, isLoading };
}
