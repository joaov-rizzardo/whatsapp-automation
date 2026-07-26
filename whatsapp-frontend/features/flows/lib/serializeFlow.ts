import type { Edge, Node } from "@xyflow/react";

import {
  FLOW_SCHEMA_VERSION,
  type FlowDocument,
  type FlowViewport,
} from "@/features/flows/schemas/flowDocument";
import type { FlowVariable } from "@/features/flows/types/variable";

/**
 * O estado do editor → o documento do §4.1, **normalizado**.
 *
 * Normalizar é o que faz o autosave inteligente funcionar: o React Flow pendura
 * no nó um monte de coisa que não descreve o fluxo (`selected`, `dragging`,
 * `measured`, `width`, `height`, `deletable`) e mexe nelas o tempo todo. Se o
 * documento carregasse isso, clicar num bloco viraria uma alteração para salvar.
 *
 * As chaves são montadas sempre na mesma ordem, então `JSON.stringify` de dois
 * documentos iguais dá a mesma string — é essa comparação que decide se há algo
 * a salvar.
 */
export function serializeFlow({
  nodes,
  edges,
  variables,
  viewport,
}: {
  nodes: Node[];
  edges: Edge[];
  /** Só as personalizadas: as de sistema são do backend. */
  variables: FlowVariable[];
  /** Omitido quando o documento é montado só para comparação (a impressão
   *  digital ignora o viewport). */
  viewport?: FlowViewport;
}): FlowDocument {
  return {
    schemaVersion: FLOW_SCHEMA_VERSION,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type ?? "",
      position: { x: node.position.x, y: node.position.y },
      data: node.data,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      // O backend exige os dois handles: é por eles que o motor escolhe a saída.
      // Todo bloco declara handles com id, então na prática nunca são nulos.
      sourceHandle: edge.sourceHandle ?? "out",
      target: edge.target,
      targetHandle: edge.targetHandle ?? "in",
    })),
    variables: variables.map((variable) => ({
      id: variable.id,
      name: variable.name,
      type: variable.type,
      initialValue: variable.initialValue,
    })),
    viewport: viewport
      ? { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
      : { x: 0, y: 0, zoom: 1 },
  };
}

/**
 * A forma comparável de um documento — o que decide se há algo a salvar.
 *
 * **Sem o viewport.** Ele viaja no documento (abrir a versão publicada como ela
 * foi desenhada depende disso), mas arrastar o canvas não é uma alteração do
 * fluxo: se entrasse aqui, dar um zoom viraria tráfego. Ele pega carona no
 * próximo salvamento causado por outra coisa.
 */
export function fingerprintDocument(document: FlowDocument): string {
  return JSON.stringify({
    schemaVersion: document.schemaVersion,
    nodes: document.nodes,
    edges: document.edges,
    variables: document.variables,
  });
}
