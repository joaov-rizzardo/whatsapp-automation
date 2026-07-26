"use client";

import { useState } from "react";
import { MoreVertical, Plus } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tag } from "@/components/ui/tag";
import { VariableFormDialog } from "@/features/flows/components/VariableFormDialog";
import { systemVariables } from "@/features/flows/lib/systemVariables";
import type { NewVariableInput } from "@/features/flows/schemas/variable";
import {
  variableTypeLabels,
  type FlowVariable,
} from "@/features/flows/types/variable";

/**
 * Where the flow's custom variables are declared, seen and edited — the single
 * source of truth blocks pick from.
 *
 * Deleting one that's in use is allowed, behind a confirmation that says how
 * many blocks reference it. The alternative (blocking the delete) hides the
 * problem; this way the affected blocks light up with their warning badge and
 * the user can see exactly what to fix.
 */
export function VariablesPanel({
  customVariables,
  usage,
  onCreate,
  onUpdate,
  onDelete,
}: {
  customVariables: FlowVariable[];
  usage: Map<string, number>;
  onCreate: (input: NewVariableInput) => void;
  onUpdate: (id: string, input: NewVariableInput) => void;
  onDelete: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FlowVariable | null>(null);
  const [deleting, setDeleting] = useState<FlowVariable | null>(null);

  const deletingUsage = deleting ? (usage.get(deleting.id) ?? 0) : 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Personalizadas
        </h3>

        {customVariables.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            Nenhuma variável ainda. Crie uma para guardar respostas e decidir
            caminhos no fluxo.
          </p>
        ) : (
          customVariables.map((variable) => {
            const count = usage.get(variable.id) ?? 0;
            return (
              <div
                key={variable.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-xs"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-mono text-xs text-foreground">
                    {variable.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {count === 0
                      ? "não usada"
                      : `usada em ${count} bloco${count > 1 ? "s" : ""}`}
                  </span>
                </div>

                <Tag className="shrink-0">{variableTypeLabels[variable.type]}</Tag>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Ações da variável ${variable.name}`}
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => setEditing(variable)}
                    >
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleting(variable)}
                    >
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })
        )}

        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => setCreating(true)}
        >
          <Plus className="size-4" />
          Nova variável
        </Button>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Do sistema
        </h3>
        <p className="text-xs text-muted-foreground">
          Preenchidas automaticamente. Podem ser comparadas, mas não alteradas.
        </p>

        {systemVariables.map((variable) => (
          <div
            key={variable.id}
            className="flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2"
          >
            <span className="font-mono text-xs text-foreground">
              {variable.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {variable.description}
            </span>
          </div>
        ))}
      </section>

      <VariableFormDialog
        open={creating}
        onOpenChange={setCreating}
        variables={customVariables}
        onSubmit={onCreate}
      />

      <VariableFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        variable={editing ?? undefined}
        variables={customVariables}
        onSubmit={(values) => {
          if (editing) onUpdate(editing.id, values);
        }}
      />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir a variável {deleting?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUsage > 0
                ? `Ela é usada em ${deletingUsage} bloco${deletingUsage > 1 ? "s" : ""}. Esses blocos vão ficar com a configuração pendente até você ajustá-los.`
                : "Esta variável não é usada em nenhum bloco."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) onDelete(deleting.id);
                setDeleting(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
