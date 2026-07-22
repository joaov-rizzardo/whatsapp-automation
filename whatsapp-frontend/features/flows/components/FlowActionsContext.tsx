"use client";

import { createContext, useContext } from "react";

/**
 * Node components only receive `NodeProps` from React Flow, so editor actions a
 * node needs to trigger (opening its config modal) reach it through context
 * rather than through node data. The provider wraps the canvas in FlowEditor.
 */
type FlowActions = {
  openConfig: (nodeId: string) => void;
};

const FlowActionsContext = createContext<FlowActions | null>(null);

export function FlowActionsProvider({
  value,
  children,
}: {
  value: FlowActions;
  children: React.ReactNode;
}) {
  return (
    <FlowActionsContext.Provider value={value}>
      {children}
    </FlowActionsContext.Provider>
  );
}

export function useFlowActions() {
  const context = useContext(FlowActionsContext);
  if (!context) {
    throw new Error("useFlowActions must be used within a FlowActionsProvider");
  }
  return context;
}
