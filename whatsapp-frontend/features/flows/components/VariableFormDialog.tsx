"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useVariableForm } from "@/features/flows/hooks/useVariableForm";
import type { VariableFormInput } from "@/features/flows/schemas/variable";
import {
  variableTypeLabels,
  type FlowVariable,
  type VariableType,
} from "@/features/flows/types/variable";

/**
 * Creates or edits a custom variable. Used both from the variables panel and
 * from the "criar variável…" shortcut inside a block's modal, which is why it
 * takes its open state from the caller instead of owning a trigger.
 */
export function VariableFormDialog({
  open,
  onOpenChange,
  variable,
  variables,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variable?: FlowVariable; // present = editing
  variables: FlowVariable[]; // custom ones, for the uniqueness check
  onSubmit: (values: VariableFormInput) => void;
}) {
  const form = useVariableForm({
    open,
    variable,
    variables,
    onSubmit: (values) => {
      onSubmit(values);
      onOpenChange(false);
    },
  });

  const isEditing = Boolean(variable);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar variável" : "Nova variável"}
            </DialogTitle>
            <DialogDescription>
              Variáveis guardam informações durante a conversa e podem ser usadas
              nas mensagens e nas condições do fluxo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="variable-name">Nome</Label>
              <Input
                id="variable-name"
                placeholder="nome_cliente"
                autoFocus
                {...form.register("name")}
              />
              <p className="text-xs text-muted-foreground">
                Letras minúsculas, números e _. É assim que ela aparece nas
                mensagens: <code>{"{{nome_cliente}}"}</code>
              </p>
              {form.errors.name ? (
                <p className="text-xs text-danger">{form.errors.name.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="variable-type">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(value) => form.changeType(value as VariableType)}
              >
                <SelectTrigger id="variable-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(variableTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="variable-initial">Valor inicial</Label>

              {form.type === "boolean" ? (
                <div className="flex items-center gap-3">
                  <Switch
                    id="variable-initial"
                    checked={form.initialValue === "true"}
                    onCheckedChange={(checked) =>
                      form.setInitialValue(checked ? "true" : "false")
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.initialValue === "true" ? "Verdadeiro" : "Falso"}
                  </span>
                </div>
              ) : (
                <Input
                  id="variable-initial"
                  inputMode={form.type === "number" ? "numeric" : "text"}
                  placeholder={form.type === "number" ? "0" : "Vazio"}
                  {...form.register("initialValue")}
                />
              )}

              {form.errors.initialValue ? (
                <p className="text-xs text-danger">
                  {form.errors.initialValue.message}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">{isEditing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
