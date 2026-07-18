import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerSession } from "@/features/auth/api/getServerSession";

export default async function DashboardPage() {
  const session = await getServerSession();

  // The (app) layout already gates this; the guard is only for the type.
  if (!session) redirect("/login");

  const { user } = session;
  const firstName = user.name.split(" ")[0];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">
          Olá, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Este é o painel da sua conta ZapBot.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-lg bg-brand-subtle text-[var(--purple-700)]">
            <Smartphone className="size-5" />
          </div>
          <CardTitle>Conecte seu WhatsApp</CardTitle>
          <CardDescription>
            Para começar a automatizar conversas, conecte um número de WhatsApp à
            sua organização.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/whatsapp">
              Conectar WhatsApp
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
