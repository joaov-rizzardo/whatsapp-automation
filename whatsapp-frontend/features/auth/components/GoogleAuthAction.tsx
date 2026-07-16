"use client";

import { GoogleAuthButton } from "@/features/auth/components/GoogleAuthButton";
import { useGoogleAuth } from "@/features/auth/hooks/useGoogleAuth";

/**
 * Container: owns the hook and hands GoogleAuthButton its props. It exists
 * because the auth pages are Server Components and cannot pass an onClick
 * across the boundary, and because GoogleAuthButton stays purely visual.
 */
export function GoogleAuthAction({ label }: { label: string }) {
  const { signInWithGoogle, isLoading } = useGoogleAuth();

  return (
    <GoogleAuthButton
      label={label}
      onClick={signInWithGoogle}
      isLoading={isLoading}
    />
  );
}
