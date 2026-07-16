import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateOrganizationForm } from "@/features/organizations/components/CreateOrganizationForm";

export default function OnboardingPage() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Criar sua organização</CardTitle>
          <CardDescription>
            É onde suas conexões, conversas e automações ficam. Você pode criar
            outras depois.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <CreateOrganizationForm />
        </CardContent>
      </Card>
    </div>
  );
}
