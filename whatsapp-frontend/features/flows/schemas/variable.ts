import { z } from "zod";

import { systemVariableNames } from "@/features/flows/lib/systemVariables";
import type { FlowVariable } from "@/features/flows/types/variable";

/**
 * The variable form. The name is a slug because it also has to survive being
 * typed inside a message as `{{name}}` — spaces and accents there would make
 * the placeholder ambiguous.
 *
 * Uniqueness needs the existing variables, so the schema is a factory: the
 * dialog builds it with the current list (and, when editing, the id being
 * edited, which must not collide with itself).
 */
const NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

export function buildVariableSchema(
  existing: FlowVariable[],
  editingId?: string,
) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, "Informe um nome")
      .max(40, "No máximo 40 caracteres")
      .regex(
        NAME_PATTERN,
        "Use apenas letras minúsculas, números e _, começando por uma letra",
      )
      .refine((name) => !systemVariableNames.has(name), {
        message: "Este nome é de uma variável do sistema",
      })
      .refine(
        (name) =>
          !existing.some(
            (variable) => variable.name === name && variable.id !== editingId,
          ),
        { message: "Já existe uma variável com este nome" },
      ),
    type: z.enum(["text", "number", "boolean"]),
    initialValue: z.string(),
  })
  .superRefine((values, ctx) => {
    // The initial value is stored as a string whatever the type, so this is the
    // only thing keeping `tentativas` (número) from starting as "abc".
    if (values.type === "number" && values.initialValue.trim() !== "") {
      if (Number.isNaN(Number(values.initialValue))) {
        ctx.addIssue({
          code: "custom",
          path: ["initialValue"],
          message: "Informe um número",
        });
      }
    }
  });
}

export type VariableFormInput = z.infer<ReturnType<typeof buildVariableSchema>>;

/** What `createVariable` receives — the form output, minus the generated id. */
export type NewVariableInput = VariableFormInput;
