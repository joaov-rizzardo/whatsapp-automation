"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlockPalette } from "@/features/flows/components/BlockPalette";
import { VariablesPanel } from "@/features/flows/components/VariablesPanel";
import type { NewVariableInput } from "@/features/flows/schemas/variable";
import type { FlowVariable } from "@/features/flows/types/variable";

/**
 * The editor's left rail: the block palette and the variables panel, as tabs.
 * Tabs rather than a separate sheet or modal so the variables stay a glance
 * away while the flow is being assembled, without costing the canvas any width.
 */
export function EditorSidebar({
  customVariables,
  variableUsage,
  onCreateVariable,
  onUpdateVariable,
  onDeleteVariable,
}: {
  customVariables: FlowVariable[];
  variableUsage: Map<string, number>;
  onCreateVariable: (input: NewVariableInput) => void;
  onUpdateVariable: (id: string, input: NewVariableInput) => void;
  onDeleteVariable: (id: string) => void;
}) {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-background">
      <Tabs defaultValue="blocks" className="flex min-h-0 flex-1 flex-col">
        <div className="p-4 pb-0">
          <TabsList className="w-full">
            <TabsTrigger value="blocks" className="flex-1">
              Blocos
            </TabsTrigger>
            <TabsTrigger value="variables" className="flex-1">
              Variáveis
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <TabsContent value="blocks">
            <BlockPalette />
          </TabsContent>

          <TabsContent value="variables">
            <VariablesPanel
              customVariables={customVariables}
              usage={variableUsage}
              onCreate={onCreateVariable}
              onUpdate={onUpdateVariable}
              onDelete={onDeleteVariable}
            />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
