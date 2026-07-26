"use client";

import { Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { Automation } from "../types/automation";

/**
 * Exclusão é destrutiva e não tem desfazer — por isso o diálogo diz o nome da
 * automação e o que acontece com quem está no meio do fluxo.
 */
export function DeleteAutomationDialog({
  automation,
  onOpenChange,
  onConfirm,
}: {
  automation: Automation | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={automation !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-danger-bg text-danger">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Excluir automação?</AlertDialogTitle>
          <AlertDialogDescription>
            {automation?.name} será removida e as conversas em andamento por ela
            serão interrompidas. Não dá para desfazer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Excluir automação
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
