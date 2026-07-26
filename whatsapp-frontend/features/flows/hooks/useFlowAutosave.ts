"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Edge, Node } from "@xyflow/react";
import { toast } from "sonner";

import { automationsKey } from "@/features/automations/hooks/useAutomationsList";
import { saveFlowDraft } from "@/features/flows/api/saveFlowDraft";
import { flowKey } from "@/features/flows/hooks/useFlowDocument";
import {
  fingerprintDocument,
  serializeFlow,
} from "@/features/flows/lib/serializeFlow";
import type {
  FlowDocument,
  FlowResponse,
  FlowViewport,
  SavedFlow,
} from "@/features/flows/schemas/flowDocument";
import type { FlowVariable } from "@/features/flows/types/variable";
import { ApiError } from "@/lib/http";

/** 1,2 s parado desde a última alteração dispara o salvamento. */
const DEBOUNCE_MS = 1_200;
/** …e um teto, para que arrastar blocos por meio minuto não adie o salvamento. */
const CEILING_MS = 10_000;
/** Erro de rede: duas tentativas com espera crescente, e então para. */
const RETRY_DELAYS_MS = [1_000, 3_000];

export type SaveStatus = "clean" | "dirty" | "saving" | "error";

export type FlowSaveState = {
  status: SaveStatus;
  savedAt: Date | null;
};

/**
 * O autosave. O adjetivo "inteligente" tem cinco significados concretos, e
 * todos moram aqui — nenhum vaza para os componentes:
 *
 * 1. **Só salva o que mudou de verdade.** O React Flow dispara `onNodesChange`
 *    para seleção, hover e medição. O hook compara a *impressão digital* do
 *    documento normalizado com a do último salvamento; string igual, nada a
 *    fazer. É esta comparação, e não o debounce, que faz o "inteligente".
 * 2. **Debounce com teto** (1,2 s / 10 s).
 * 3. **Uma requisição por vez.** Alteração durante um salvamento vira UM
 *    salvamento enfileirado, coalescido — duas requisições concorrentes com
 *    trava de versão dariam 409 contra si mesmas.
 * 4. **Não perde o que está pendente na saída.** `visibilitychange → hidden`
 *    faz flush; `beforeunload` avisa se ainda houver sujeira. Nada de
 *    `sendBeacon`: ele não resolve credenciais entre origens diferentes, e a
 *    API está em `:3333`.
 * 5. **Falha sem perder trabalho.** Rede → duas tentativas e depois "Erro ao
 *    salvar", com o estado sujo intacto (o próximo salvamento leva tudo). 409 é
 *    diferente: para o autosave de vez e devolve `conflict`, que a tela usa
 *    para abrir um diálogo bloqueante. Não existe merge, e não se deve fingir
 *    que existe.
 *
 * A trava que evita o pior bug possível — salvar o canvas vazio enquanto o GET
 * está no ar — é estrutural: este hook só existe dentro do editor, que só monta
 * depois que o documento chegou, e a impressão digital inicial é a do documento
 * que veio do servidor.
 */
export function useFlowAutosave({
  automationId,
  initialVersion,
  initialDocument,
  nodes,
  edges,
  variables,
  getViewport,
}: {
  automationId: string;
  initialVersion: number;
  initialDocument: FlowDocument;
  nodes: Node[];
  edges: Edge[];
  /** Só as personalizadas — as de sistema não entram no documento. */
  variables: FlowVariable[];
  getViewport: () => FlowViewport;
}) {
  const queryClient = useQueryClient();

  const [state, setState] = useState<FlowSaveState>({ status: "clean", savedAt: null });
  const [conflict, setConflict] = useState(false);

  const versionRef = useRef(initialVersion);
  const savedFingerprintRef = useRef(fingerprintDocument(initialDocument));
  const inFlightRef = useRef(false);
  /** Uma alteração chegou durante um salvamento: um, e só um, salvamento a mais. */
  const queuedRef = useRef(false);
  const conflictRef = useRef(false);
  const attemptRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ceilingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // O estado vivo do editor, sem entrar nas dependências do salvamento: quem
  // salva quer sempre o mais recente, não o de quando o timer foi armado.
  const latestRef = useRef({ nodes, edges, variables, getViewport });
  useEffect(() => {
    latestRef.current = { nodes, edges, variables, getViewport };
  }, [nodes, edges, variables, getViewport]);

  /** Muda a cada alteração real do fluxo. Seleção e zoom não mexem nela. */
  const fingerprint = useMemo(
    () => fingerprintDocument(serializeFlow({ nodes, edges, variables })),
    [nodes, edges, variables],
  );

  const clearTimers = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (ceilingRef.current) clearTimeout(ceilingRef.current);
    if (retryRef.current) clearTimeout(retryRef.current);
    debounceRef.current = null;
    ceilingRef.current = null;
    retryRef.current = null;
  }, []);

  /**
   * Depois de salvar, o cache do fluxo passa a ser o que acabou de ser gravado.
   *
   * Não é só cosmética de barra: com `staleTime: Infinity`, sair do editor e
   * voltar remonta a partir deste cache. Se ele guardasse a versão de quando a
   * página abriu, o primeiro salvamento depois de voltar bateria na trava e
   * abriria o diálogo de conflito contra o próprio usuário.
   *
   * Invalidar a lista é o que faz o gatilho definido aqui aparecer lá.
   */
  const syncFlowCache = useCallback(
    (document: FlowDocument, saved: SavedFlow) => {
      queryClient.setQueryData<FlowResponse>(flowKey(automationId), (current) =>
        current
          ? {
              version: saved.version,
              updatedAt: saved.updatedAt,
              document,
              automation: saved.automation,
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: automationsKey });
    },
    [automationId, queryClient],
  );

  // O salvamento se reagenda (tentativa após erro de rede, salvamento
  // coalescido) — a referência é o que permite isso sem que a função dependa de
  // si mesma.
  const saveRef = useRef<() => Promise<boolean>>(async () => false);

  const save = useCallback(async (): Promise<boolean> => {
    if (conflictRef.current) return false;
    if (inFlightRef.current) {
      queuedRef.current = true;
      return false;
    }

    const { nodes: currentNodes, edges: currentEdges, variables: currentVariables } =
      latestRef.current;
    const payload = serializeFlow({
      nodes: currentNodes,
      edges: currentEdges,
      variables: currentVariables,
      viewport: latestRef.current.getViewport(),
    });
    const outgoing = fingerprintDocument(payload);

    if (outgoing === savedFingerprintRef.current) {
      setState((current) => ({ ...current, status: "clean" }));
      return true;
    }

    clearTimers();
    inFlightRef.current = true;
    setState((current) => ({ ...current, status: "saving" }));

    try {
      const saved = await saveFlowDraft(automationId, {
        version: versionRef.current,
        document: payload,
      });

      versionRef.current = saved.version;
      savedFingerprintRef.current = outgoing;
      attemptRef.current = 0;
      setState({ status: "clean", savedAt: new Date(saved.updatedAt) });
      syncFlowCache(payload, saved);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.code === "FLOW_VERSION_CONFLICT") {
        // Alguém salvou este fluxo em outro lugar. Continuar salvando por cima
        // é o único desfecho pior do que parar.
        conflictRef.current = true;
        setConflict(true);
        setState((current) => ({ ...current, status: "error" }));
        return false;
      }

      if (attemptRef.current < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attemptRef.current];
        attemptRef.current += 1;
        retryRef.current = setTimeout(() => void saveRef.current(), delay);
        setState((current) => ({ ...current, status: "dirty" }));
        return false;
      }

      attemptRef.current = 0;
      setState((current) => ({ ...current, status: "error" }));
      return false;
    } finally {
      inFlightRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        void saveRef.current();
      }
    }
  }, [automationId, clearTimers, syncFlowCache]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  /** Salvar agora: o botão, o Ctrl/Cmd+S e o flush antes de publicar. */
  const saveNow = useCallback(async (): Promise<boolean> => {
    clearTimers();
    return save();
  }, [clearTimers, save]);

  // O agendamento. Roda a cada alteração real; a comparação com o último
  // documento salvo é o que decide se há o que agendar.
  useEffect(() => {
    if (conflictRef.current) return;
    if (fingerprint === savedFingerprintRef.current) return;

    setState((current) =>
      current.status === "saving" ? current : { ...current, status: "dirty" },
    );

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void save(), DEBOUNCE_MS);

    // O teto é armado uma vez por rajada e não é reiniciado pelas alterações
    // seguintes — é justamente ele que impede o adiamento indefinido.
    if (!ceilingRef.current) {
      ceilingRef.current = setTimeout(() => void save(), CEILING_MS);
    }
  }, [fingerprint, save]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Saída da aba: `visibilitychange` é o gatilho confiável nos navegadores
  // atuais; `beforeunload` só avisa, porque nele já não dá para esperar rede.
  useEffect(() => {
    const isDirty = () =>
      !conflictRef.current && savedFingerprintRef.current !== fingerprint;

    function onVisibilityChange() {
      if (document.visibilityState === "hidden" && isDirty()) void save();
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirty()) event.preventDefault();
    }

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveNow().then((ok) => {
          if (ok) toast.success("Fluxo salvo");
        });
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fingerprint, save, saveNow]);

  return {
    saveState: state,
    /** Chamado pelo botão Salvar e pelo Publicar (que faz flush antes). */
    saveNow,
    /** true = o rascunho avançou em outro lugar; a tela bloqueia e oferece recarregar. */
    conflict,
  };
}
