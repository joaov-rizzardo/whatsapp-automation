import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(1, "Informe seu nome"),
    email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
    acceptTerms: z
      .boolean()
      .refine((value) => value === true, "Você precisa aceitar os termos de uso"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
