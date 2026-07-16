"use client";

import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.94H1.28v3.1C3.25 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.23 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4 3.1C6.23 6.87 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  label,
  onClick,
  isLoading,
}: {
  label: string;
  onClick?: () => void;
  isLoading?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth
      disabled={isLoading}
      onClick={onClick}
    >
      <GoogleIcon />
      {label}
    </Button>
  );
}
