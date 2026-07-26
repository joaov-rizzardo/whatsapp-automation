"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DurationField } from "@/features/flows/components/DurationField";
import { VariableSelect } from "@/features/flows/components/VariableSelect";
import type { BlockModalProps } from "@/features/flows/blocks/types";
import type { Duration } from "@/features/flows/types/duration";

/** The data a wait-reply block configures. */
export type WaitReplyData = {
  /** null = the reply is awaited but not stored. */
  variableId: string | null;
  timeout: Duration;
};

export function WaitReplyModal({
  data,
  onChange,
  onClose,
}: BlockModalProps<WaitReplyData>) {
  const [timeout, setTimeout] = useState<Duration>(data.timeout);
  const [variableId, setVariableId] = useState(data.variableId);

  function save() {
    onChange({ variableId, timeout });
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Aguardar resposta</DialogTitle>
        <DialogDescription>
          O fluxo para aqui até o contato responder. Se o tempo acabar antes, ele
          segue pela saída &ldquo;Tempo esgotado&rdquo;.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="wait-reply-timeout">Tempo máximo de espera</Label>
          <DurationField
            id="wait-reply-timeout"
            value={timeout}
            onChange={setTimeout}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="wait-reply-variable">
            Salvar resposta em (opcional)
          </Label>
          <VariableSelect
            id="wait-reply-variable"
            value={variableId}
            writableOnly
            onChange={setVariableId}
            placeholder="Não salvar"
          />
          {variableId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => setVariableId(null)}
            >
              Não salvar a resposta
            </Button>
          ) : null}
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={timeout.value <= 0}>
          Salvar
        </Button>
      </DialogFooter>
    </>
  );
}
