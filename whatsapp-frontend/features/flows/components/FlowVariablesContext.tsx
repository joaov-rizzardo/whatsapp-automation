"use client";

import { createContext, useContext } from "react";

import type { FlowVariable } from "@/features/flows/types/variable";
import type { NewVariableInput } from "@/features/flows/schemas/variable";

/**
 * Block modals need the variable list and the inline "create one" shortcut, and
 * nodes need the list to validate their config. Neither can receive it as a
 * prop: the modal host and the canvas are generic and must not know that
 * variables exist. Same reasoning as FlowActionsContext.
 *
 * `variables` holds custom *and* system variables — consumers filter by
 * `origin` when they need only writable ones.
 */
type FlowVariablesValue = {
  variables: FlowVariable[];
  createVariable: (input: NewVariableInput) => FlowVariable;
};

const FlowVariablesContext = createContext<FlowVariablesValue | null>(null);

export function FlowVariablesProvider({
  value,
  children,
}: {
  value: FlowVariablesValue;
  children: React.ReactNode;
}) {
  return (
    <FlowVariablesContext.Provider value={value}>
      {children}
    </FlowVariablesContext.Provider>
  );
}

export function useFlowVariablesContext() {
  const context = useContext(FlowVariablesContext);
  if (!context) {
    throw new Error(
      "useFlowVariablesContext must be used within a FlowVariablesProvider",
    );
  }
  return context;
}

/** Looks a variable up by id, tolerating a reference to a deleted one. */
export function findVariable(
  variables: FlowVariable[],
  id: string | null,
): FlowVariable | undefined {
  if (!id) return undefined;
  return variables.find((variable) => variable.id === id);
}
