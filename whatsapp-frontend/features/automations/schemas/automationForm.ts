import { z } from "zod";

/**
 * O formulário de criar/renomear. Só o nome: o resto da automação é montado no
 * editor de fluxos, e um "Fluxo sem título 3" na lista é dívida garantida.
 */
export const automationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome para a automação")
    .max(60, "Use no máximo 60 caracteres"),
});

export type AutomationFormInput = z.infer<typeof automationFormSchema>;
