"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSignOut } from "@/features/auth/hooks/useSignOut";

export function SignOutButton() {
  const { handleSignOut, isSigningOut } = useSignOut();

  return (
    <Button variant="secondary" onClick={handleSignOut} disabled={isSigningOut}>
      <LogOut className="size-4" />
      {isSigningOut ? "Saindo..." : "Sair"}
    </Button>
  );
}
