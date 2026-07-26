"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * O fluxo foi salvo em outro lugar (outra aba, outra pessoa) desde que este
 * editor o carregou. Bloqueante e sem "Cancelar" de propósito: a partir daqui
 * tudo o que este editor salvar vai bater na trava de versão, então continuar
 * editando só acumula trabalho que não tem como ir para lugar nenhum.
 *
 * Não existe merge, e não se deve fingir que existe — recarregar traz a versão
 * do servidor.
 */
export function FlowConflictDialog({ open }: { open: boolean }) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Este fluxo foi alterado em outro lugar</AlertDialogTitle>
          <AlertDialogDescription>
            Alguém salvou uma versão mais nova deste fluxo — talvez você mesmo,
            em outra aba. Para não sobrescrever esse trabalho, o salvamento
            automático foi interrompido. Recarregue para continuar a partir da
            versão mais recente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => window.location.reload()}>
            Recarregar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
