"use client";

import { useQuery } from "@tanstack/react-query";

import { getFlow } from "@/features/flows/api/getFlow";

export const flowKey = (automationId: string) => ["flow", automationId] as const;

/**
 * A carga do fluxo. Fica separada do editor de propósito: o editor só monta
 * depois que o documento chegou, e é isso que impede o pior bug possível desta
 * spec — um autosave disparar com o canvas vazio enquanto o GET ainda está no
 * ar e apagar o fluxo do usuário.
 *
 * `staleTime: Infinity` porque, a partir daí, o dono da verdade é o editor: um
 * refetch em foco de janela sobrescreveria o que está sendo editado.
 */
export function useFlowDocument(automationId: string) {
  const query = useQuery({
    queryKey: flowKey(automationId),
    queryFn: () => getFlow(automationId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    flow: query.data,
    isLoading: query.isPending,
    error: query.error,
  };
}
