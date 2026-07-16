"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useController, useForm } from "react-hook-form";
import { toast } from "sonner";

import { getAuthErrorMessage } from "@/features/auth/lib/getAuthErrorMessage";
import {
  registerSchema,
  type RegisterInput,
} from "@/features/auth/schemas/registerSchema";
import { authClient } from "@/lib/auth-client";

const EMAIL_TAKEN_CODES = [
  "USER_ALREADY_EXISTS",
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
];

export function useRegisterForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const { field: acceptTermsField } = useController({
    name: "acceptTerms",
    control,
  });

  const onSubmit = handleSubmit(async (data) => {
    // confirmPassword and acceptTerms stay on the client on purpose: the first
    // is already checked by registerSchema's .refine, the second is a UI gate.
    // Neither is a Better Auth field.
    const { error } = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (error) {
      const message = getAuthErrorMessage(error);

      if (error.code && EMAIL_TAKEN_CODES.includes(error.code)) {
        setError("email", { message });
        return;
      }

      toast.error(message);
      return;
    }

    // Sign-up already opens a session (email verification is off), so there is
    // no sign-in round trip here.
    router.push("/dashboard");
    router.refresh();
  });

  return {
    register,
    onSubmit,
    errors,
    isSubmitting,
    acceptTerms: {
      checked: acceptTermsField.value,
      onCheckedChange: acceptTermsField.onChange,
    },
  };
}
