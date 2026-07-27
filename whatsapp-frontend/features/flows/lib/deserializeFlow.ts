import type { Edge, Node } from "@xyflow/react";

import { getDefinition } from "@/features/flows/blocks/registry";
import type { FlowDocument, FlowViewport } from "@/features/flows/schemas/flowDocument";
import type { CustomFlowVariable } from "@/features/flows/types/variable";

export type DeserializedFlow = {
  nodes: Node[];
  edges: Edge[];
  variables: CustomFlowVariable[];
  /** `null` num fluxo que nunca foi enquadrado — o canvas então usa `fitView`. */
  viewport: FlowViewport | null;
  /** Quantos blocos o documento tinha e este app não sabe desenhar. */
  droppedNodes: number;
};

/**
 * O documento do servidor → o estado do editor. Três defesas moram aqui, e
 * nenhuma delas é opcional:
 *
 * 1. **`deletable` é recalculado do registry**, nunca lido do documento — um
 *    documento adulterado não pode tornar o bloco de início apagável.
 * 2. **Nó de tipo desconhecido é descartado**, junto com as arestas dele. Sem
 *    isso o React Flow tenta renderizar um `nodeType` que não existe e derruba a
 *    tela inteira; a tela avisa quantos sumiram.
 * 3. **A aresta recebe `type: "flow"`.** `defaultEdgeOptions` só vale para
 *    arestas criadas por conexão — as que chegam pela prop precisam do tipo
 *    aplicado aqui, senão o React Flow desenha a linha padrão.
 */
export function deserializeFlow(document: FlowDocument): DeserializedFlow {
  const nodes: Node[] = [];
  const knownIds = new Set<string>();
  let droppedNodes = 0;

  for (const node of document.nodes) {
    const definition = getDefinition(node.type);
    if (!definition) {
      droppedNodes += 1;
      continue;
    }

    knownIds.add(node.id);
    nodes.push({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
      deletable: !definition.singleton,
    });
  }

  const edges: Edge[] = document.edges
    .filter((edge) => knownIds.has(edge.source) && knownIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      type: "flow",
      animated: true,
    }));

  const variables: CustomFlowVariable[] = document.variables.map((variable) => ({
    ...variable,
    origin: "custom",
  }));

  return {
    nodes,
    edges,
    variables,
    viewport: document.viewport ?? null,
    droppedNodes,
  };
}
