import { redirect } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerSession } from "@/features/auth/api/getServerSession";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function DashboardPage() {
  const session = await getServerSession();

  // The real gate. proxy.ts only guesses from the cookie's presence.
  if (!session) redirect("/login");

  const { user } = session;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Olá, {user.name}</CardTitle>
          <CardDescription>Você está conectado à sua conta ZapBot.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              {user.image && <AvatarImage src={user.image} alt={user.name} />}
              <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{user.name}</span>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </div>

          <div className="flex justify-start">
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
