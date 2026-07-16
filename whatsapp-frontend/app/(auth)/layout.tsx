import { Zap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl border border-[var(--purple-700)] bg-[linear-gradient(180deg,var(--purple-500),var(--purple-600))] text-white shadow-[var(--shadow-zap-sm),var(--shadow-inset-top)]">
          <Zap className="size-5" />
        </span>
        <span className="font-heading text-xl font-bold">ZapBot</span>
      </div>
      {children}
    </div>
  );
}
