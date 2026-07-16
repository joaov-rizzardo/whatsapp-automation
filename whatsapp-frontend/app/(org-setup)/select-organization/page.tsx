import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerOrganizations } from "@/features/organizations/api/getServerOrganizations";
import { OrganizationList } from "@/features/organizations/components/OrganizationList";

export default async function SelectOrganizationPage() {
  // Fetched here rather than in the client: the data is available on the
  // server, so the list arrives rendered instead of flashing a loading state.
  const organizations = await getServerOrganizations();

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Escolher organização</CardTitle>
          <CardDescription>
            Você faz parte de mais de uma. Escolha com qual quer trabalhar
            agora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationList organizations={organizations} />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Precisa de outra?{" "}
        <Link href="/onboarding" className="font-medium">
          Criar organização
        </Link>
      </p>
    </div>
  );
}
