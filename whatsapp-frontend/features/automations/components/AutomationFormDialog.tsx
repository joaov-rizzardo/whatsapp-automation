"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAutomationForm } from "../hooks/useAutomationForm";

/**
 * Criar e renomear são o mesmo formulário — só o nome — então são o mesmo
 * diálogo. Criar pede o nome antes de abrir o editor: uma lista de "Fluxo sem
 * título 3" é dívida garantida.
 */
export function AutomationFormDialog({
  open,
  mode,
  defaultName,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "rename";
  defaultName: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
}) {
  const { register, errors, isSubmitting, handleSubmit } = useAutomationForm({
    defaultName,
    onSubmit: (input) => onSubmit(input.name),
  });

  const isCreate = mode === "create";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCreate ? "Criar automação" : "Renomear automação"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Dê um nome para reconhecer essa automação na lista. O fluxo você monta no editor."
              : "O novo nome aparece na lista e no editor."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="automation-name">Nome</Label>
            <Input
              id="automation-name"
              autoFocus
              placeholder="Boas-vindas novo lead"
              aria-invalid={errors.name !== undefined}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-danger" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isCreate ? "Criar e abrir editor" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
