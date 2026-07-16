"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { getOrganizationErrorMessage } from "@/features/organizations/lib/getOrganizationErrorMessage";
import { slugify } from "@/features/organizations/lib/slugify";
import {
  createOrganizationSchema,
  type CreateOrganizationInput,
} from "@/features/organizations/schemas/createOrganizationSchema";
import { authClient } from "@/lib/auth-client";

export function useCreateOrganization() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = handleSubmit(async (data) => {
    const { error } = await authClient.organization.create({
      name: data.name,
      slug: slugify(data.name),
    });

    if (error) {
      const message = getOrganizationErrorMessage(error);

      if (error.code === "ORGANIZATION_ALREADY_EXISTS") {
        setError("name", { message });
        return;
      }

      toast.error(message);
      return;
    }

    // No setActive here: create already marks the new organization as active.
    router.push("/dashboard");
    // Not optional: without it the Router Cache replays the layout resolved
    // before this organization existed, and the redirect loops back here.
    router.refresh();
  });

  return { register, onSubmit, errors, isSubmitting };
}
