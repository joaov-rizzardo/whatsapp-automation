"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAutomationsList } from "../hooks/useAutomationsList";
import type { Automation } from "../types/automation";
import { AutomationFormDialog } from "./AutomationFormDialog";
import { AutomationList } from "./AutomationList";
import { AutomationsEmptyState } from "./AutomationsEmptyState";
import { AutomationsHeader } from "./AutomationsHeader";
import { AutomationsLoadError } from "./AutomationsLoadError";
import { AutomationsSkeleton } from "./AutomationsSkeleton";
import { AutomationsSummary } from "./AutomationsSummary";
import { AutomationsToolbar } from "./AutomationsToolbar";
import { DeleteAutomationDialog } from "./DeleteAutomationDialog";

type FormTarget = { mode: "create" } | { mode: "rename"; automation: Automation };

/**
 * Container da tela: segura o hook da lista e o estado dos diálogos, e delega o
 * desenho para os componentes abaixo.
 */
export function AutomationsView() {
  const router = useRouter();
  const list = useAutomationsList();
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Automation | null>(null);

  async function handleFormSubmit(name: string) {
    if (!formTarget) return;

    if (formTarget.mode === "rename") {
      list.renameAutomation(formTarget.automation.id, name);
      setFormTarget(null);
      return;
    }

    // Criar virou assíncrono: o id que vai na URL é o do servidor, então a
    // navegação espera a resposta. Erro mantém o diálogo aberto (o hook já
    // mostra o toast).
    try {
      const created = await list.createAutomation(name);
      setFormTarget(null);
      toast.success("Automação criada");
      router.push(`/automacoes/${created.id}/editor`);
    } catch {
      // Tratado pelo onError da mutação.
    }
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    list.deleteAutomation(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <>
      <AutomationsHeader
        showCreateButton={!list.isEmpty && !list.isLoading && !list.error}
        onCreate={() => setFormTarget({ mode: "create" })}
      />

      {list.isLoading ? (
        <AutomationsSkeleton />
      ) : list.error ? (
        <AutomationsLoadError onRetry={list.refetch} />
      ) : list.isEmpty ? (
        <AutomationsEmptyState onCreate={() => setFormTarget({ mode: "create" })} />
      ) : (
        <>
          <AutomationsSummary summary={list.summary} />

          <AutomationsToolbar
            status={list.status}
            onStatusChange={list.setStatus}
            counts={list.counts}
            search={list.search}
            onSearchChange={list.setSearch}
            sort={list.sort}
            onSortChange={list.setSort}
          />

          <AutomationList
            automations={list.visible}
            onToggleActive={list.setAutomationActive}
            onRename={(automation) => setFormTarget({ mode: "rename", automation })}
            onDuplicate={list.duplicateAutomation}
            onDelete={setDeleteTarget}
            onClearFilters={list.clearFilters}
          />
        </>
      )}

      <AutomationFormDialog
        open={formTarget !== null}
        mode={formTarget?.mode ?? "create"}
        defaultName={formTarget?.mode === "rename" ? formTarget.automation.name : ""}
        onOpenChange={(open) => !open && setFormTarget(null)}
        onSubmit={handleFormSubmit}
      />

      <DeleteAutomationDialog
        automation={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
