"use client";

import { useEffect } from "react";
import { useController, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  buildVariableSchema,
  type VariableFormInput,
} from "@/features/flows/schemas/variable";
import type { FlowVariable, VariableType } from "@/features/flows/types/variable";

/**
 * The variable dialog's form. Uniqueness depends on the variables that already
 * exist, so the schema is rebuilt from the current list — a name is only
 * "taken" relative to the others, and relative to itself when editing.
 *
 * `type` and `initialValue` go through `useController` rather than `watch`,
 * matching the rest of the project's forms: `watch()` can't be memoised, and
 * these two feed a Select and a Switch that need controlled values anyway.
 */
export function useVariableForm({
  open,
  variable,
  variables,
  onSubmit,
}: {
  open: boolean;
  variable?: FlowVariable; // present = editing
  variables: FlowVariable[]; // the custom ones, for the uniqueness check
  onSubmit: (values: VariableFormInput) => void;
}) {
  const defaults: VariableFormInput = {
    name: variable?.name ?? "",
    type: variable?.type ?? "text",
    initialValue: variable?.initialValue ?? "",
  };

  const { register, handleSubmit, control, reset, formState } =
    useForm<VariableFormInput>({
      resolver: zodResolver(buildVariableSchema(variables, variable?.id)),
      defaultValues: defaults,
    });

  const { field: typeField } = useController({ name: "type", control });
  const { field: initialValueField } = useController({
    name: "initialValue",
    control,
  });

  // The dialog stays mounted between openings, so without this it would show
  // the previous variable's values — or the last thing typed before cancelling.
  useEffect(() => {
    if (!open) return;
    reset({
      name: variable?.name ?? "",
      type: variable?.type ?? "text",
      initialValue: variable?.initialValue ?? "",
    });
  }, [open, variable, reset]);

  /** Switching type clears the initial value: `true` is meaningless for a text
   *  variable, and `abc` would only fail number validation on submit. */
  function changeType(next: VariableType) {
    typeField.onChange(next);
    initialValueField.onChange(next === "boolean" ? "false" : "");
  }

  return {
    register,
    errors: formState.errors,
    handleSubmit: handleSubmit(onSubmit),
    type: typeField.value,
    changeType,
    initialValue: initialValueField.value,
    setInitialValue: initialValueField.onChange,
  };
}
