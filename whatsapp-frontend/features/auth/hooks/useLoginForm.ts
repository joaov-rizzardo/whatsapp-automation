"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { loginSchema, type LoginInput } from "@/features/auth/schemas/loginSchema";

export function useLoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (data) => {
    // Placeholder until better-auth's email/password sign-in replaces this call.
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log("login", data);
  });

  return { register, onSubmit, errors, isSubmitting };
}
