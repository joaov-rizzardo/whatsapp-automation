"use client";

import { useCallback, useMemo, useState } from "react";

import { systemVariables } from "@/features/flows/lib/systemVariables";
import type { NewVariableInput } from "@/features/flows/schemas/variable";
import type { CustomFlowVariable } from "@/features/flows/types/variable";

/**
 * The flow's custom variables. The panel is the single source of truth: a block
 * can only point at something declared here, so there is no such thing as a
 * variable referenced but never filled.
 *
 * Renaming is the one operation with a side effect outside this hook. Blocks
 * store a variable's **id**, so a rename can't break a select — but a message
 * body references it by name (`{{nome}}`), and that has to be rewritten. The
 * editor passes `onRename` to do it; this hook stays unaware of nodes.
 *
 * They are persisted with the flow (spec 006): the list arrives already parsed
 * from the loaded document, and every change to it is picked up by the autosave
 * — the hook itself still knows nothing about the network.
 */
export function useFlowVariables({
  onRename,
  initialVariables,
}: {
  onRename: (from: string, to: string) => void;
  initialVariables: CustomFlowVariable[];
}) {
  const [customVariables, setCustomVariables] =
    useState<CustomFlowVariable[]>(initialVariables);

  const createVariable = useCallback((input: NewVariableInput) => {
    // Sem contador de módulo: ele reiniciaria em zero a cada carregamento e
    // daria a uma variável nova o id de uma que já veio do servidor.
    const variable: CustomFlowVariable = {
      id: `var-${crypto.randomUUID().slice(0, 8)}`,
      name: input.name,
      type: input.type,
      initialValue: input.initialValue,
      origin: "custom",
    };
    setCustomVariables((current) => current.concat(variable));
    return variable;
  }, []);

  const updateVariable = useCallback(
    (id: string, input: NewVariableInput) => {
      setCustomVariables((current) =>
        current.map((variable) => {
          if (variable.id !== id) return variable;
          if (variable.name !== input.name) {
            onRename(variable.name, input.name);
          }
          return { ...variable, ...input };
        }),
      );
    },
    [onRename],
  );

  const deleteVariable = useCallback((id: string) => {
    setCustomVariables((current) =>
      current.filter((variable) => variable.id !== id),
    );
  }, []);

  // Custom first: they're the ones the user just created and is looking for.
  const variables = useMemo(
    () => [...customVariables, ...systemVariables],
    [customVariables],
  );

  return {
    customVariables,
    variables,
    createVariable,
    updateVariable,
    deleteVariable,
  };
}
