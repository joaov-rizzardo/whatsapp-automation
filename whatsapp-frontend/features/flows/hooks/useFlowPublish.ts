"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { automationsKey } from "@/features/automations/hooks/useAutomationsList";
import { publishFlow } from "@/features/flows/api/publishFlow";
import { flowKey } from "@/features/flows/hooks/useFlowDocument";
import type { FlowResponse } from "@/features/flows/schemas/flowDocument";
import { ApiError } from "@/lib/http";

/** Quantos problemas cabem num toast antes de virar parede de texto. */
const ISSUES_IN_TOAST = 3;

/**
 * Publicar: congela o rascunho na versão que o motor vai ler.
 *
 * **Faz flush do autosave antes.** Publicar o rascunho de dois segundos atrás
 * seria o pior tipo de bug — silencioso, e correto na tela.
 *
 * O 422 vira um toast com até três problemas e o total; os selos de alerta que
 * os próprios nós já mostram (o `validate` do frontend) são o mapa de onde
 * consertar.
 */
export function useFlowPublish({
  automationId,
  flush,
}: {
  automationId: string;
  /** `saveNow` do autosave: devolve false se não conseguiu salvar. */
  flush: () => Promise<boolean>;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const saved = await flush();
      if (!saved) {
        throw new Error("Não foi possível salvar as alterações antes de publicar.");
      }
      return publishFlow(automationId);
    },
    onSuccess: (published) => {
      // Publicar não muda o rascunho: só o selo de "não publicado" e o status.
      queryClient.setQueryData<FlowResponse>(flowKey(automationId), (current) =>
        current ? { ...current, automation: published.automation } : current,
      );
      void queryClient.invalidateQueries({ queryKey: automationsKey });

      toast.success("Fluxo publicado", {
        description:
          published.automation.status === "active"
            ? "A nova versão já está atendendo."
            : "Ative a automação na lista para começar a atender.",
      });
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.issues?.length) {
        const { issues } = error;
        toast.error(
          `Corrija ${issues.length} ${issues.length === 1 ? "bloco" : "blocos"} antes de publicar`,
          {
            description: issues
              .slice(0, ISSUES_IN_TOAST)
              .map((issue) => issue.message)
              .join(" · "),
          },
        );
        return;
      }

      toast.error(error.message);
    },
  });

  return {
    publish: () => mutation.mutate(),
    isPublishing: mutation.isPending,
  };
}
