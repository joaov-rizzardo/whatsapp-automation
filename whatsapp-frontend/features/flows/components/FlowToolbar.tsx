"use client";

import { Save, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * A floating bar over the canvas: a title chip on the left and the save action
 * on the right. The wrapper is `pointer-events-none` so panning still works in
 * the empty gaps between the two islands, which each re-enable pointer events.
 * Saving is a prototype stub — see `useFlowEditor.saveFlow`.
 */
export function FlowToolbar({ onSave }: { onSave: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-border bg-card/90 px-3 py-2 shadow-sm backdrop-blur">
        <span className="flex size-7 items-center justify-center rounded-md bg-brand-subtle text-primary">
          <Workflow className="size-4" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="font-heading text-sm font-semibold text-foreground">
            Editor de fluxos
          </span>
          <span className="text-xs text-muted-foreground">
            Monte a conversa automática do seu bot
          </span>
        </div>
      </div>

      <Button
        type="button"
        onClick={onSave}
        className="pointer-events-auto shadow-sm"
      >
        <Save className="size-4" />
        Salvar
      </Button>
    </div>
  );
}
