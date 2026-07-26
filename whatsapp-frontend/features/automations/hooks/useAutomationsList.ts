"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createAutomation } from "../api/createAutomation";
import { deleteAutomation } from "../api/deleteAutomation";
import { duplicateAutomation } from "../api/duplicateAutomation";
import { listAutomations } from "../api/listAutomations";
import { updateAutomation } from "../api/updateAutomation";
import { filterAutomations } from "../lib/filterAutomations";
import { summarizeAutomations } from "../lib/summarizeAutomations";
import type {
  Automation,
  AutomationSort,
  AutomationStatusFilter,
} from "../types/automation";

export const automationsKey = ["automations"] as const;

/**
 * Dono da coleção de automações: filtro, busca, ordenação e as ações da linha.
 *
 * A coleção vem da API (spec 006) e as ações são mutações; filtro, busca e
 * ordenação continuam no cliente sobre `query.data`. A superfície de retorno é
 * a mesma de quando isto era `useState` sobre um mock — nenhum componente
 * abaixo mudou por causa da persistência, que era exatamente a promessa da
 * spec 004.
 */
export function useAutomationsList() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AutomationStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<AutomationSort>("recent");

  const query = useQuery({
    queryKey: automationsKey,
    queryFn: listAutomations,
  });

  const automations = useMemo(() => query.data ?? [], [query.data]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: automationsKey });
  const showError = (error: Error) => toast.error(error.message);

  const visible = useMemo(
    () => filterAutomations(automations, { status, search, sort }),
    [automations, status, search, sort],
  );

  const summary = useMemo(() => summarizeAutomations(automations), [automations]);

  const counts = useMemo<Record<AutomationStatusFilter, number>>(
    () => ({
      all: automations.length,
      active: summary.active,
      paused: summary.paused,
      draft: summary.draft,
    }),
    [automations.length, summary],
  );

  const createMutation = useMutation({
    mutationFn: createAutomation,
    onSuccess: invalidate,
    onError: showError,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateAutomation(id, { name }),
    onSuccess: () => {
      void invalidate();
      toast.success("Automação renomeada");
    },
    onError: showError,
  });

  /**
   * Ativar/pausar é o único com atualização otimista: o switch tem que
   * responder na hora. O rollback é barato porque a mudança é de um campo só —
   * e é necessário, porque ativar sem publicação volta 409 do servidor.
   */
  const setActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateAutomation(id, { isActive: active }),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: automationsKey });
      const previous = queryClient.getQueryData<Automation[]>(automationsKey);

      queryClient.setQueryData<Automation[]>(automationsKey, (current) =>
        current?.map((automation) =>
          automation.id === id
            ? { ...automation, status: active ? "active" : "paused" }
            : automation,
        ),
      );

      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(automationsKey, context.previous);
      showError(error);
    },
    onSuccess: (_data, { active }) => {
      toast.success(active ? "Automação ativada" : "Automação pausada");
    },
    onSettled: invalidate,
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateAutomation,
    onSuccess: () => {
      void invalidate();
      toast.success("Automação duplicada");
    },
    onError: showError,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAutomation,
    onSuccess: () => {
      void invalidate();
      toast.success("Automação excluída");
    },
    onError: showError,
  });

  function clearFilters() {
    setStatus("all");
    setSearch("");
  }

  return {
    visible,
    summary,
    counts,
    status,
    setStatus,
    search,
    setSearch,
    sort,
    setSort,
    isLoading: query.isPending,
    error: query.error,
    refetch: () => void query.refetch(),
    isEmpty: automations.length === 0,
    hasFilters: status !== "all" || search.trim() !== "",
    clearFilters,
    /** Assíncrona agora: quem cria precisa do id que o servidor gerou. */
    createAutomation: (name: string) => createMutation.mutateAsync(name),
    isCreating: createMutation.isPending,
    renameAutomation: (id: string, name: string) => renameMutation.mutate({ id, name }),
    setAutomationActive: (id: string, active: boolean) =>
      setActiveMutation.mutate({ id, active }),
    duplicateAutomation: (id: string) => duplicateMutation.mutate(id),
    deleteAutomation: (id: string) => deleteMutation.mutate(id),
  };
}
