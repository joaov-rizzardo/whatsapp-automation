"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { getAuthErrorMessage } from "@/features/auth/lib/getAuthErrorMessage";
import { loginSchema, type LoginInput } from "@/features/auth/schemas/loginSchema";
import { authClient } from "@/lib/auth-client";

export function useLoginForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (data) => {
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (error) {
      toast.error(getAuthErrorMessage(error));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  });

  return { register, onSubmit, errors, isSubmitting };
}
