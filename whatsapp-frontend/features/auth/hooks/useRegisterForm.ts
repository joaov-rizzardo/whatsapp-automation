"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useController, useForm } from "react-hook-form";

import {
  registerSchema,
  type RegisterInput,
} from "@/features/auth/schemas/registerSchema";

export function useRegisterForm() {
  const {
    register,
    handleSubmit,
    control,
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
    // Placeholder until better-auth's sign-up replaces this call.
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log("register", data);
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
