"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  automationFormSchema,
  type AutomationFormInput,
} from "../schemas/automationForm";

/**
 * Formulário de nome, compartilhado por criar e renomear. O `defaultName` muda
 * quando o diálogo abre para outra automação, então o form é resetado por
 * efeito — sem isso o campo guardaria o nome da automação anterior.
 */
export function useAutomationForm({
  defaultName,
  onSubmit,
}: {
  defaultName: string;
  onSubmit: (input: AutomationFormInput) => void;
}) {
  const form = useForm<AutomationFormInput>({
    resolver: zodResolver(automationFormSchema),
    defaultValues: { name: defaultName },
  });

  const { reset } = form;

  useEffect(() => {
    reset({ name: defaultName });
  }, [defaultName, reset]);

  return {
    register: form.register,
    errors: form.formState.errors,
    isSubmitting: form.formState.isSubmitting,
    handleSubmit: form.handleSubmit(onSubmit),
  };
}
