"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { filterAutomations } from "../lib/filterAutomations";
import { mockAutomations } from "../lib/mockAutomations";
import { summarizeAutomations } from "../lib/summarizeAutomations";
import type {
  Automation,
  AutomationSort,
  AutomationStatusFilter,
} from "../types/automation";

/**
 * Dono da coleção de automações: filtro, busca, ordenação e as ações da linha.
 *
 * Enquanto não há API, a lista vive em `useState` sobre os dados mockados e as
 * ações apenas mexem nesse estado. Quando a persistência entrar, só este arquivo
 * muda — vira `useQuery` + `useMutation` e nenhum componente é tocado.
 */
export function useAutomationsList() {
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations);
  const [status, setStatus] = useState<AutomationStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<AutomationSort>("recent");

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

  function updateOne(id: string, patch: (automation: Automation) => Automation) {
    setAutomations((current) =>
      current.map((automation) => (automation.id === id ? patch(automation) : automation)),
    );
  }

  function createAutomation(name: string): Automation {
    const automation: Automation = {
      id: crypto.randomUUID(),
      name,
      status: "draft",
      trigger: { kind: "none" },
      // O editor já nasce com o bloco de início.
      blockCount: 1,
      conversations: 0,
      completionRate: null,
      updatedAt: new Date().toISOString(),
    };

    setAutomations((current) => [automation, ...current]);
    return automation;
  }

  function renameAutomation(id: string, name: string) {
    updateOne(id, (automation) => ({
      ...automation,
      name,
      updatedAt: new Date().toISOString(),
    }));
    toast.success("Automação renomeada");
  }

  function setAutomationActive(id: string, active: boolean) {
    updateOne(id, (automation) => ({
      ...automation,
      status: active ? "active" : "paused",
    }));
    toast.success(active ? "Automação ativada" : "Automação pausada");
  }

  function duplicateAutomation(id: string) {
    const source = automations.find((automation) => automation.id === id);
    if (!source) return;

    // A cópia nasce rascunho e zerada: só o desenho do fluxo é duplicado, o
    // histórico de conversas é da automação original.
    setAutomations((current) => [
      {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} (cópia)`,
        status: "draft",
        conversations: 0,
        completionRate: null,
        updatedAt: new Date().toISOString(),
      },
      ...current,
    ]);
    toast.success("Automação duplicada");
  }

  function deleteAutomation(id: string) {
    setAutomations((current) => current.filter((automation) => automation.id !== id));
    toast.success("Automação excluída");
  }

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
    isEmpty: automations.length === 0,
    hasFilters: status !== "all" || search.trim() !== "",
    clearFilters,
    createAutomation,
    renameAutomation,
    setAutomationActive,
    duplicateAutomation,
    deleteAutomation,
  };
}
