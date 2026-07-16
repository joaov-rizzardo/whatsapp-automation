import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome precisa ter no mínimo 2 caracteres.")
    .max(60, "O nome é longo demais."),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
