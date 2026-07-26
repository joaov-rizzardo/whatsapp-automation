"use client";

import { useCallback, useMemo, useState } from "react";

import { systemVariables } from "@/features/flows/lib/systemVariables";
import type { NewVariableInput } from "@/features/flows/schemas/variable";
import type { FlowVariable } from "@/features/flows/types/variable";

let sequence = 0;

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
 * No persistence (spec 004, decision 4): refresh clears these along with the
 * canvas.
 */
export function useFlowVariables({
  onRename,
}: {
  onRename: (from: string, to: string) => void;
}) {
  const [customVariables, setCustomVariables] = useState<FlowVariable[]>([]);

  const createVariable = useCallback((input: NewVariableInput) => {
    sequence += 1;
    const variable: FlowVariable = {
      id: `var-${sequence}`,
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
